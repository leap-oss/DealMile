import "server-only";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { transaction } from "@/lib/projects/transaction";
import { ProjectError } from "@/lib/projects/service";
import { processRefund, type RefundProvider } from "@/lib/delivery/service";
import { db } from "@/lib/db";
import { settlementSchema } from "./contract";
type Actor = { id: string; role: Role };
const explanation = z
  .string()
  .trim()
  .min(10, "Explain your decision in at least 10 characters.")
  .max(3000);
const cancellable = [
  "PENDING_DEVELOPER_REVIEW",
  "DEVELOPER_REVIEW",
  "CLIENT_REVIEW",
  "AGREED",
  "ACTIVE",
];
const include = {
  milestones: {
    orderBy: { position: "asc" as const },
    include: { payments: true },
  },
};
type Project = Prisma.ProjectGetPayload<{ include: typeof include }>;
// Use existing full-refund settlement semantics: retain completed work and refund
// the single unfinished funded milestone. Sequential funding permits only one.
export function cancellationSettlement(project: Project) {
  const unfinished = project.milestones.filter(
    (m) => !["COMPLETED", "CANCELLED"].includes(m.status),
  );
  const funded = unfinished.filter((m) =>
    m.payments.some(
      (p) => p.status === "CAPTURED" && p.verifiedAt && p.paypalCaptureId,
    ),
  );
  if (funded.length > 1)
    throw new ProjectError(
      "Resolve the existing funded milestones before cancelling this project.",
    );
  for (const m of unfinished) {
    if (
      m.payments.some(
        (p) =>
          p.paypalOrderId &&
          p.status !== "CAPTURED" &&
          !(p.status === "REFUNDED" && p.refundVerifiedAt),
      )
    )
      throw new ProjectError(
        "An existing checkout must be reconciled before requesting cancellation. Complete server verification or resolve the order first.",
      );
    if (
      ["FUNDED", "IN_PROGRESS", "SUBMITTED"].includes(m.status) &&
      !funded.includes(m)
    )
      throw new ProjectError(
        "Resolve this milestone's payment verification before cancelling.",
      );
  }
  const payment = funded[0]?.payments.find((p) => p.status === "CAPTURED");
  const retained = project.milestones
    .filter((m) => m.status === "COMPLETED")
    .flatMap((m) => m.payments)
    .filter((p) => p.status === "CAPTURED")
    .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
  return settlementSchema.parse({
    currency: project.currency,
    refundMilestoneId: funded[0]?.id ?? null,
    refundAmount: payment?.amount.toFixed(2) ?? "0.00",
    retainedAmount: retained.toFixed(2),
    cancelledMilestoneIds: unfinished.map((m) => m.id),
  });
}
export async function cancellationAction(
  actor: Actor,
  projectId: string,
  rawAction: unknown,
  input: Record<string, unknown>,
) {
  const action = z
    .enum(["request", "approve", "reject", "withdraw"])
    .parse(rawAction);
  return transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: {
        id: projectId,
        ...(actor.role === "CLIENT"
          ? { clientId: actor.id }
          : { developerId: actor.id }),
      },
      include,
    });
    if (!project)
      throw new ProjectError("This project is not available to your account.");
    if (project.paymentBusyUntil && project.paymentBusyUntil > new Date())
      throw new ProjectError(
        "A PayPal request is in progress. Wait for server verification before cancelling.",
      );
    if (action === "request") {
      if (!cancellable.includes(project.status) || !project.developerId)
        throw new ProjectError(
          "Cancellation requires an assigned developer and an unfinished project.",
        );
      if (
        project.paymentHold ||
        (await tx.cancellationRequest.count({
          where: { projectId, status: { in: ["PENDING", "REFUND_PENDING"] } },
        }))
      )
        throw new ProjectError(
          "Resolve the existing case or cancellation request first.",
        );
      const settlement = cancellationSettlement(project);
      const reason = explanation.parse(input.reason);
      await tx.cancellationRequest.create({
        data: { projectId, requestedById: actor.id, reason, settlement },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { paymentHold: true },
      });
      await tx.activityLog.create({
        data: {
          projectId,
          actorId: actor.id,
          action: "CANCELLATION_REQUESTED",
          description: `${actor.role === "CLIENT" ? "Client" : "Developer"} requested project cancellation. The other party must approve. Reason: ${reason}`,
        },
      });
      return projectId;
    }
    const request = await tx.cancellationRequest.findFirst({
      where: { id: z.string().parse(input.requestId), projectId },
    });
    if (!request)
      throw new ProjectError("This cancellation request is unavailable.");
    if (
      action === "approve" &&
      ["APPROVED", "REFUND_PENDING"].includes(request.status)
    ) {
      if (
        request.requestedById === actor.id ||
        request.decidedById !== actor.id
      )
        throw new ProjectError("The other party must approve cancellation.");
      return projectId;
    }
    if (request.status !== "PENDING")
      throw new ProjectError(
        "This request has already been decided. Reload the project.",
      );
    if (!cancellable.includes(project.status) || !project.paymentHold)
      throw new ProjectError("The project changed. Reload before deciding.");
    if ((action === "withdraw") !== (request.requestedById === actor.id))
      throw new ProjectError(
        action === "withdraw"
          ? "Only the requester can withdraw."
          : "The other party must decide this request.",
      );
    const decisionNote =
      action === "approve"
        ? "Approved the displayed cancellation settlement."
        : explanation.parse(input.reason);
    let status =
      action === "approve"
        ? "APPROVED"
        : action === "reject"
          ? "REJECTED"
          : "WITHDRAWN";
    let deliveryCaseId: string | undefined;
    if (action === "approve") {
      const current = cancellationSettlement(project),
        original = settlementSchema.parse(request.settlement);
      if (JSON.stringify(current) !== JSON.stringify(original))
        throw new ProjectError(
          "The settlement has changed. Withdraw and submit a new request.",
        );
      await tx.deadlineExtension.updateMany({
        where: { milestone: { projectId }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt: new Date() },
      });
      if (current.refundMilestoneId) {
        const item = await tx.deliveryCase.create({
          data: {
            milestoneId: current.refundMilestoneId,
            reason: request.reason,
            evidence: `Bilateral cancellation request ${request.id}; requester ${request.requestedById}; approving party ${actor.id}.`,
            response: decisionNote,
            resolution: "REFUND",
            status: "REFUND_PENDING",
            approvedAt: new Date(),
          },
        });
        deliveryCaseId = item.id;
        status = "REFUND_PENDING";
      } else {
        await tx.milestone.updateMany({
          where: { projectId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
          data: { status: "CANCELLED" },
        });
        await tx.project.update({
          where: { id: projectId },
          data: { status: "CANCELLED", paymentHold: false },
        });
      }
      await tx.changeRequest.updateMany({
        where: {
          projectId,
          status: {
            in: ["ANALYZING", "PENDING", "DEVELOPER_REVIEW", "CLIENT_REVIEW"],
          },
        },
        data: {
          status: "REJECTED",
          resolutionNote: "Both parties approved project cancellation.",
        },
      });
    } else {
      await tx.project.update({
        where: { id: projectId },
        data: { paymentHold: false },
      });
    }
    await tx.cancellationRequest.update({
      where: { id: request.id },
      data: {
        status,
        deliveryCaseId,
        decidedById: actor.id,
        decisionNote,
        decidedAt: new Date(),
      },
    });
    await tx.activityLog.create({
      data: {
        projectId,
        actorId: actor.id,
        action: `CANCELLATION_${status}`,
        description:
          action === "approve"
            ? status === "REFUND_PENDING"
              ? "Both parties approved cancellation. An unfinished milestone requires a server-verified full refund before the project is cancelled."
              : "Both parties approved project cancellation. Completed work and financial records are retained."
            : `Cancellation ${status.toLowerCase()}: ${decisionNote}`,
      },
    });
    return projectId;
  });
}
export async function refundCancellation(
  actor: Actor,
  requestId: string,
  provider?: RefundProvider,
) {
  const request = await db().cancellationRequest.findFirst({
    where: {
      id: requestId,
      project:
        actor.role === "CLIENT"
          ? { clientId: actor.id }
          : { developerId: actor.id },
    },
  });
  if (
    !request?.deliveryCaseId ||
    !request.decidedById ||
    !["REFUND_PENDING", "APPROVED"].includes(request.status)
  )
    throw new ProjectError(
      "Both parties must approve the refund settlement first.",
    );
  return processRefund(actor, request.deliveryCaseId, provider);
}
