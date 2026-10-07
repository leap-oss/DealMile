import "server-only";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { transaction } from "@/lib/projects/transaction";
import { ProjectError } from "@/lib/projects/service";
export const milestoneActionSchema = z.enum([
  "start",
  "submit",
  "complete",
  "revision",
]);
export async function mutateMilestone(
  actor: { id: string; role: Role },
  milestoneId: string,
  rawAction: unknown,
  note?: unknown,
) {
  const action = milestoneActionSchema.parse(rawAction);
  const expectedRole = ["start", "submit"].includes(action)
    ? "DEVELOPER"
    : "CLIENT";
  if (actor.role !== expectedRole)
    throw new ProjectError(
      "This milestone action is not available to your role.",
    );
  const submission =
    action === "submit"
      ? z
          .string()
          .trim()
          .min(10, "Describe the work delivered in at least 10 characters.")
          .max(2000)
          .parse(note)
      : undefined;
  return transaction(async (tx) => {
    const milestone = await tx.milestone.findFirst({
      where: {
        id: milestoneId,
        project:
          actor.role === "CLIENT"
            ? { clientId: actor.id }
            : { developerId: actor.id },
      },
      include: { project: true, payments: true },
    });
    if (!milestone) throw new ProjectError("Milestone unavailable.");
    if (!["AGREED", "ACTIVE"].includes(milestone.project.status))
      throw new ProjectError("This project is not active.");
    if (milestone.project.paymentHold)
      throw new ProjectError(
        "Resolve the delivery case before progressing milestones.",
      );
    const from =
      action === "start"
        ? "FUNDED"
        : action === "submit"
          ? "IN_PROGRESS"
          : "SUBMITTED";
    if (milestone.status !== from)
      throw new ProjectError(
        "This milestone has changed. Reload before trying again.",
      );
    if (
      !milestone.payments.some(
        (p) => p.status === "CAPTURED" && p.verifiedAt && p.paypalCaptureId,
      )
    )
      throw new ProjectError(
        "A server-verified payment is required before work can progress.",
      );
    const status =
      action === "start" || action === "revision"
        ? "IN_PROGRESS"
        : action === "submit"
          ? "SUBMITTED"
          : "COMPLETED";
    await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        status,
        ...(submission
          ? { submissionNote: submission, submittedAt: new Date() }
          : {}),
      },
    });
    await tx.project.update({
      where: { id: milestone.projectId },
      data: { status: "ACTIVE" },
    });
    if (action === "complete") {
      await tx.deadlineExtension.updateMany({
        where: { milestoneId, status: "PENDING" },
        data: { status: "REJECTED", decidedAt: new Date() },
      });
      const next = await tx.milestone.findFirst({
        where: { projectId: milestone.projectId, status: "LOCKED" },
        orderBy: { position: "asc" },
      });
      if (next)
        await tx.milestone.update({
          where: { id: next.id },
          data: { status: "AWAITING_PAYMENT" },
        });
      const remaining = await tx.milestone.count({
        where: {
          projectId: milestone.projectId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });
      const pendingChanges = await tx.changeRequest.count({
        where: {
          projectId: milestone.projectId,
          status: {
            in: ["ANALYZING", "PENDING", "DEVELOPER_REVIEW", "CLIENT_REVIEW"],
          },
        },
      });
      if (!remaining && !pendingChanges)
        await tx.project.update({
          where: { id: milestone.projectId },
          data: { status: "COMPLETED" },
        });
    }
    const descriptions = {
      start: "Developer started the funded milestone.",
      submit: "Developer submitted work for client review.",
      complete: "Client approved the delivered milestone.",
      revision: "Client requested revisions to the delivered milestone.",
    };
    await tx.activityLog.create({
      data: {
        projectId: milestone.projectId,
        actorId: actor.id,
        action: `MILESTONE_${action.toUpperCase()}`,
        description: descriptions[action],
      },
    });
    return milestone.projectId;
  });
}
