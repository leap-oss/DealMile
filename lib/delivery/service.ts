import "server-only";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { transaction } from "@/lib/projects/transaction";
import { ProjectError } from "@/lib/projects/service";
import { getPayPal } from "@/lib/payments/paypal";
import { verifyRefund } from "@/lib/payments/refund-contract";

type Actor = { id: string; role: Role };
export const openCaseStatuses = ["OPEN", "PROPOSED", "REFUND_PENDING"];
const note = z
  .string()
  .trim()
  .min(10, "Please explain in at least 10 characters.")
  .max(3000);
const workStatuses = ["FUNDED", "IN_PROGRESS", "SUBMITTED"];
export function deliveryTiming(
  status: string,
  dueAt: Date | null,
  now = new Date(),
) {
  if (!dueAt || !["FUNDED", "IN_PROGRESS"].includes(status)) return null;
  if (dueAt < now) return "OVERDUE";
  return dueAt.getTime() - now.getTime() <= 48 * 3600000 ? "DUE_SOON" : null;
}
function futureDate(raw: unknown, previous?: Date | null) {
  const text = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(raw);
  const date = new Date(`${text}T23:59:59.999Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text ||
    date <= new Date() ||
    (previous && date <= previous)
  )
    throw new ProjectError(
      "Choose a valid future date after the current deadline (UTC).",
    );
  return date;
}
async function owned(
  tx: Prisma.TransactionClient,
  actor: Actor,
  milestoneId: string,
) {
  const m = await tx.milestone.findFirst({
    where: {
      id: milestoneId,
      project:
        actor.role === "CLIENT"
          ? { clientId: actor.id }
          : { developerId: actor.id },
    },
    include: { project: true, payments: true },
  });
  if (!m || !["AGREED", "ACTIVE"].includes(m.project.status))
    throw new ProjectError("This milestone is not available.");
  return m;
}
async function audit(
  tx: Prisma.TransactionClient,
  projectId: string,
  actorId: string,
  action: string,
  description: string,
) {
  await tx.activityLog.create({
    data: { projectId, actorId, action, description },
  });
}
export async function deliveryAction(
  actor: Actor,
  milestoneId: string,
  rawAction: unknown,
  input: Record<string, unknown>,
) {
  const action = z
    .enum([
      "request_extension",
      "approve_extension",
      "reject_extension",
      "open_case",
      "propose_resolution",
      "approve_resolution",
      "reject_resolution",
      "withdraw_case",
    ])
    .parse(rawAction);
  const developerOnly = ["request_extension", "propose_resolution"].includes(
    action,
  );
  if (actor.role !== (developerOnly ? "DEVELOPER" : "CLIENT"))
    throw new ProjectError("This action is not available to your role.");
  return transaction(async (tx) => {
    const m = await owned(tx, actor, milestoneId);
    if (!workStatuses.includes(m.status))
      throw new ProjectError(
        "Only a funded, unfinished milestone can use delivery follow-up.",
      );
    const cases = await tx.deliveryCase.findMany({
      where: {
        milestone: { projectId: m.projectId },
        status: { in: openCaseStatuses },
      },
    });
    if (action === "request_extension") {
      if (m.project.paymentHold || cases.length)
        throw new ProjectError(
          "Resolve the delivery case before requesting an extension.",
        );
      if (!m.dueAt || !["FUNDED", "IN_PROGRESS"].includes(m.status))
        throw new ProjectError("An active delivery deadline is required.");
      if (
        await tx.deadlineExtension.count({
          where: { milestoneId, status: "PENDING" },
        })
      )
        throw new ProjectError(
          "An extension is already awaiting client review.",
        );
      const requestedDueAt = futureDate(input.date, m.dueAt);
      await tx.deadlineExtension.create({
        data: {
          milestoneId,
          previousDueAt: m.dueAt,
          requestedDueAt,
          reason: note.parse(input.reason),
        },
      });
      await audit(
        tx,
        m.projectId,
        actor.id,
        "DEADLINE_REQUESTED",
        `Developer requested a deadline extension for “${m.title}”; the current deadline is unchanged.`,
      );
    } else if (action.endsWith("extension")) {
      if (m.project.paymentHold)
        throw new ProjectError("Resolve the delivery case first.");
      const extension = await tx.deadlineExtension.findFirst({
        where: {
          id: z.string().parse(input.recordId),
          milestoneId,
          status: "PENDING",
        },
      });
      if (
        !extension ||
        m.dueAt?.getTime() !== extension.previousDueAt.getTime()
      )
        throw new ProjectError(
          "This extension is no longer available. Reload the project.",
        );
      if (
        action === "approve_extension" &&
        extension.requestedDueAt <= new Date()
      )
        throw new ProjectError(
          "The proposed date has passed. Request a new extension.",
        );
      await tx.deadlineExtension.update({
        where: { id: extension.id },
        data: {
          status: action === "approve_extension" ? "APPROVED" : "REJECTED",
          decidedAt: new Date(),
        },
      });
      if (action === "approve_extension")
        await tx.milestone.update({
          where: { id: milestoneId },
          data: { dueAt: extension.requestedDueAt },
        });
      await audit(
        tx,
        m.projectId,
        actor.id,
        "DEADLINE_DECIDED",
        `Client ${action === "approve_extension" ? "approved" : "rejected"} the deadline extension for “${m.title}”.`,
      );
    } else if (action === "open_case") {
      if (m.project.paymentBusyUntil && m.project.paymentBusyUntil > new Date())
        throw new ProjectError(
          "A PayPal request is in progress. Wait for confirmation before opening a delivery case.",
        );
      if (cases.length || m.project.paymentHold)
        throw new ProjectError(
          "A delivery case is already open for this project.",
        );
      const payment = m.payments.find(
        (p) => p.status === "CAPTURED" && p.verifiedAt && p.paypalCaptureId,
      );
      if (!payment)
        throw new ProjectError("A verified funded milestone is required.");
      await tx.deliveryCase.create({
        data: {
          milestoneId,
          reason: note.parse(input.reason),
          evidence: note.parse(input.evidence),
        },
      });
      await tx.project.update({
        where: { id: m.projectId },
        data: { paymentHold: true },
      });
      await tx.deadlineExtension.updateMany({
        where: { milestone: { projectId: m.projectId }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt: new Date() },
      });
      await audit(
        tx,
        m.projectId,
        actor.id,
        "DELIVERY_CASE_OPENED",
        `Client reported a delivery problem for “${m.title}”. New payments and milestone approvals are paused pending agreement.`,
      );
    } else {
      const item = cases.find(
        (c) => c.id === input.recordId && c.milestoneId === milestoneId,
      );
      if (!item || item.status === "REFUND_PENDING")
        throw new ProjectError(
          "This case is unavailable or its refund is being verified.",
        );
      if (action === "propose_resolution") {
        if (item.status !== "OPEN")
          throw new ProjectError(
            "The client must review or reject the existing proposal first.",
          );
        const resolution = z
          .enum(["RESUME", "CANCEL_REMAINING", "REFUND"])
          .parse(input.resolution);
        const proposedDueAt =
          resolution === "RESUME" ? futureDate(input.date, m.dueAt) : null;
        if (resolution === "REFUND") {
          const otherWork = await tx.milestone.findMany({
            where: {
              projectId: m.projectId,
              id: { not: m.id },
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
            include: { payments: true },
          });
          if (
            otherWork.some(
              (x) =>
                !["LOCKED", "AWAITING_PAYMENT"].includes(x.status) ||
                x.payments.some((p) => p.paypalOrderId),
            )
          )
            throw new ProjectError(
              "Reconcile other funded work or existing checkout orders before refunding and cancelling this project.",
            );
        }
        if (resolution === "CANCEL_REMAINING") {
          const unpaid = await tx.milestone.findMany({
            where: {
              projectId: m.projectId,
              status: { in: ["LOCKED", "AWAITING_PAYMENT"] },
            },
            include: { payments: true },
          });
          if (
            !unpaid.length ||
            unpaid.some((x) => x.payments.some((p) => p.paypalOrderId))
          )
            throw new ProjectError(
              "Cancellation requires unpaid remaining milestones without an existing PayPal order.",
            );
        }
        await tx.deliveryCase.update({
          where: { id: item.id },
          data: {
            status: "PROPOSED",
            resolution,
            proposedDueAt,
            response: note.parse(input.reason),
          },
        });
        await audit(
          tx,
          m.projectId,
          actor.id,
          "DELIVERY_RESOLUTION_PROPOSED",
          `Developer proposed ${resolution.toLowerCase().replaceAll("_", " ")} for the delivery case${proposedDueAt ? `, due ${proposedDueAt.toISOString()}` : ""}. Client approval is required. Explanation: ${note.parse(input.reason)}`,
        );
      } else if (action === "reject_resolution") {
        if (item.status !== "PROPOSED")
          throw new ProjectError("There is no proposal to reject.");
        await tx.deliveryCase.update({
          where: { id: item.id },
          data: {
            status: "OPEN",
            resolution: null,
            response: null,
            proposedDueAt: null,
          },
        });
        await audit(
          tx,
          m.projectId,
          actor.id,
          "DELIVERY_RESOLUTION_REJECTED",
          "Client rejected the resolution. The payment hold remains active.",
        );
      } else if (action === "withdraw_case") {
        await tx.deliveryCase.update({
          where: { id: item.id },
          data: {
            status: "RESOLVED",
            resolution: "WITHDRAWN",
            resolvedAt: new Date(),
          },
        });
        await tx.project.update({
          where: { id: m.projectId },
          data: { paymentHold: false },
        });
        await audit(
          tx,
          m.projectId,
          actor.id,
          "DELIVERY_CASE_WITHDRAWN",
          `Client withdrew the delivery report: ${note.parse(input.reason)}`,
        );
      } else {
        if (item.status !== "PROPOSED")
          throw new ProjectError("There is no resolution awaiting approval.");
        if (item.resolution === "REFUND") {
          if (
            !m.payments.some(
              (p) =>
                p.status === "CAPTURED" && p.verifiedAt && p.paypalCaptureId,
            )
          )
            throw new ProjectError(
              "A captured payment is required for a refund.",
            );
          // Persist explicit bilateral consent before any provider call. A separate action processes it.
          await tx.deliveryCase.update({
            where: { id: item.id },
            data: { status: "REFUND_PENDING", approvedAt: new Date() },
          });
          await audit(
            tx,
            m.projectId,
            actor.id,
            "REFUND_APPROVED",
            `Client and developer agreed to refund “${m.title}”. Payment remains captured until PayPal verification succeeds.`,
          );
        } else {
          if (item.resolution === "RESUME") {
            if (!item.proposedDueAt || item.proposedDueAt <= new Date())
              throw new ProjectError(
                "The proposed deadline has passed. Reject this proposal and request a new one.",
              );
            await tx.milestone.update({
              where: { id: milestoneId },
              data: { dueAt: item.proposedDueAt },
            });
          } else if (item.resolution === "CANCEL_REMAINING") {
            const unpaid = await tx.milestone.findMany({
              where: {
                projectId: m.projectId,
                status: { in: ["LOCKED", "AWAITING_PAYMENT"] },
              },
              include: { payments: true },
            });
            if (unpaid.some((x) => x.payments.some((p) => p.paypalOrderId)))
              throw new ProjectError(
                "An existing checkout must be reconciled before cancelling remaining work.",
              );
            await tx.milestone.updateMany({
              where: { id: { in: unpaid.map((x) => x.id) } },
              data: { status: "CANCELLED" },
            });
          } else throw new ProjectError("Invalid resolution.");
          await tx.deliveryCase.update({
            where: { id: item.id },
            data: {
              status: "RESOLVED",
              approvedAt: new Date(),
              resolvedAt: new Date(),
            },
          });
          await tx.project.update({
            where: { id: m.projectId },
            data: { paymentHold: false },
          });
          await audit(
            tx,
            m.projectId,
            actor.id,
            "DELIVERY_CASE_RESOLVED",
            "Client approved the delivery resolution. The payment hold is lifted.",
          );
        }
      }
    }
    return m.projectId;
  });
}
export interface RefundProvider {
  refundCapture(
    captureId: string,
    amount: string,
    currency: string,
    requestKey: string,
  ): Promise<unknown>;
  getRefund(id: string): Promise<unknown>;
}
export async function processRefund(
  actor: Actor,
  caseId: string,
  suppliedProvider?: RefundProvider,
) {
  const item = await db().deliveryCase.findFirst({
    where: {
      id: caseId,
      milestone: {
        project:
          actor.role === "CLIENT"
            ? { clientId: actor.id }
            : { developerId: actor.id },
      },
    },
    include: { milestone: { include: { project: true, payments: true } } },
  });
  if (
    !item ||
    item.resolution !== "REFUND" ||
    !item.approvedAt ||
    !["REFUND_PENDING", "RESOLVED"].includes(item.status)
  )
    throw new ProjectError(
      "A refund needs explicit developer proposal and client approval.",
    );
  const payment = item.milestone.payments.find(
    (p) =>
      p.verifiedAt &&
      p.paypalCaptureId &&
      ["CAPTURED", "REFUNDED"].includes(p.status),
  );
  if (!payment) throw new ProjectError("A verified capture is required.");
  if (payment.status === "REFUNDED" && payment.refundVerifiedAt)
    return item.milestone.projectId;
  const provider = suppliedProvider ?? getPayPal();
  let refundId = payment.paypalRefundId;
  if (!refundId) {
    const raw = await provider.refundCapture(
      payment.paypalCaptureId!,
      payment.amount.toFixed(2),
      payment.currency,
      item.refundRequestKey,
    );
    const refund = verifyRefund(raw, payment);
    refundId = refund.id;
    await db().payment.update({
      where: { id: payment.id },
      data: { paypalRefundId: refundId },
    });
  }
  const verified = verifyRefund(await provider.getRefund(refundId), payment);
  if (verified.id !== refundId)
    throw new ProjectError("PayPal returned a different refund.");
  if (verified.status !== "COMPLETED")
    throw new ProjectError(
      `PayPal refund is ${verified.status.toLowerCase()}. The case stays open; payment is not marked refunded. Retry verification later.`,
    );
  return transaction(async (tx) => {
    const current = await tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    if (current.status === "REFUNDED" && current.refundVerifiedAt)
      return item.milestone.projectId;
    if (current.paypalRefundId !== refundId)
      throw new ProjectError("Refund association changed. Review the case.");
    await tx.payment.update({
      where: { id: current.id },
      data: { status: "REFUNDED", refundVerifiedAt: new Date() },
    });
    await tx.milestone.update({
      where: { id: item.milestoneId },
      data: { status: "CANCELLED" },
    });
    await tx.deliveryCase.update({
      where: { id: item.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await tx.cancellationRequest.updateMany({
      where: { deliveryCaseId: item.id, status: "REFUND_PENDING" },
      data: { status: "APPROVED" },
    });
    // Stop remaining unpaid work after the funded work is refunded. Retain financial history.
    await tx.milestone.updateMany({
      where: {
        projectId: item.milestone.projectId,
        status: { in: ["LOCKED", "AWAITING_PAYMENT"] },
      },
      data: { status: "CANCELLED" },
    });
    const remaining = await tx.milestone.count({
      where: {
        projectId: item.milestone.projectId,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    });
    await tx.project.update({
      where: { id: item.milestone.projectId },
      data: {
        paymentHold: false,
        ...(remaining === 0 ? { status: "CANCELLED" } : {}),
      },
    });
    if (remaining === 0)
      await tx.changeRequest.updateMany({
        where: {
          projectId: item.milestone.projectId,
          status: {
            in: ["ANALYZING", "PENDING", "DEVELOPER_REVIEW", "CLIENT_REVIEW"],
          },
        },
        data: {
          status: "REJECTED",
          resolutionNote:
            "Project cancelled after an agreed, server-verified refund.",
        },
      });
    await audit(
      tx,
      item.milestone.projectId,
      actor.id,
      "REFUND_VERIFIED",
      `PayPal verified a full refund for “${item.milestone.title}”. Remaining unpaid work was cancelled.`,
    );
    return item.milestone.projectId;
  });
}
export async function recordDeliveryReminders(
  projectIds?: string[],
  now = new Date(),
) {
  const milestones = await db().milestone.findMany({
    where: {
      status: { in: ["FUNDED", "IN_PROGRESS"] },
      dueAt: { lte: new Date(now.getTime() + 48 * 3600000) },
      project: {
        status: { in: ["AGREED", "ACTIVE"] },
        ...(projectIds ? { id: { in: projectIds } } : {}),
      },
    },
    include: { project: true },
  });
  let count = 0;
  for (const m of milestones) {
    const kind = deliveryTiming(m.status, m.dueAt, now)!;
    const added = await transaction(async (tx) => {
      const fresh = await tx.milestone.findUniqueOrThrow({
        where: { id: m.id },
      });
      if (
        fresh.dueAt?.getTime() !== m.dueAt?.getTime() ||
        deliveryTiming(fresh.status, fresh.dueAt, now) !== kind
      )
        return false;
      if (
        await tx.deliveryReminder.findUnique({
          where: {
            milestoneId_dueAt_kind: {
              milestoneId: m.id,
              dueAt: m.dueAt!,
              kind,
            },
          },
        })
      )
        return false;
      await tx.deliveryReminder.create({
        data: { milestoneId: m.id, dueAt: m.dueAt!, kind },
      });
      await audit(
        tx,
        m.projectId,
        m.project.developerId ?? m.project.clientId,
        `DELIVERY_${kind}`,
        `“${m.title}” ${kind === "OVERDUE" ? "is overdue" : "is due within 48 hours"}. Review delivery or agree on an extension.`,
      );
      return true;
    });
    if (added) count++;
  }
  return count;
}

export async function getDeliveryAlerts(actor: Actor) {
  return db().milestone.findMany({
    where: {
      project: {
        ...(actor.role === "CLIENT"
          ? { clientId: actor.id }
          : { developerId: actor.id }),
        status: { in: ["AGREED", "ACTIVE"] },
      },
      status: { in: ["FUNDED", "IN_PROGRESS"] },
      dueAt: { lte: new Date(Date.now() + 48 * 3600000) },
    },
    include: { project: { select: { name: true, paymentHold: true } } },
    orderBy: { dueAt: "asc" },
    take: 10,
  });
}
