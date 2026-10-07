import "server-only";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { transaction } from "@/lib/projects/transaction";
import { ProjectError } from "@/lib/projects/service";
import { moneySchema } from "@/lib/projects/validation";
import { getAIProvider } from "@/lib/ai/gemini";
import { scopeAnalysisSchema, type AIProvider } from "@/lib/ai/contracts";
type Actor = { id: string; role: Role };
const descriptionSchema = z
  .string()
  .trim()
  .min(10, "Describe your request in at least 10 characters.")
  .max(5000);
export const changeActionSchema = z.enum([
  "included",
  "reject",
  "accept_free",
  "propose",
  "approve",
  "decline",
]);
export const additionalMilestoneSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  amount: moneySchema,
  estimatedDays: z.coerce.number().int().min(1).max(365),
});
export async function analyzeChange(
  actor: Actor,
  projectId: string,
  rawDescription: unknown,
  retryId?: string,
  suppliedProvider?: AIProvider,
) {
  if (actor.role !== "CLIENT")
    throw new ProjectError("Only the client can submit change requests.");
  const description = descriptionSchema.parse(rawDescription);
  const change = await transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: {
        id: projectId,
        clientId: actor.id,
        status: { in: ["AGREED", "ACTIVE"] },
      },
      include: { scope: { orderBy: { position: "asc" } } },
    });
    if (!project)
      throw new ProjectError(
        "Changes are available only for your agreed or active projects.",
      );
    if (project.paymentHold)
      throw new ProjectError(
        "Resolve the delivery case before changing the agreement.",
      );
    if (retryId) {
      const existing = await tx.changeRequest.findFirst({
        where: { id: retryId, projectId, status: "PENDING" },
      });
      if (!existing)
        throw new ProjectError(
          "This request is unavailable or already being analyzed.",
        );
      return tx.changeRequest.update({
        where: { id: retryId },
        data: { status: "ANALYZING" },
      });
    }
    const item = await tx.changeRequest.create({
      data: {
        projectId,
        description,
        scopeSnapshot: project.scope.map((s) => s.description),
        status: "ANALYZING",
      },
    });
    await tx.activityLog.create({
      data: {
        projectId,
        actorId: actor.id,
        action: "CHANGE_REQUESTED",
        description:
          "Client requested a scope comparison. AI recommendations require human review.",
      },
    });
    return item;
  });
  try {
    const provider = suppliedProvider ?? getAIProvider();
    const analysis = scopeAnalysisSchema.parse(
      await provider.analyzeScopeChange({
        scope: change.scopeSnapshot,
        request: change.description,
      }),
    );
    if (
      analysis.scopeChangeDetected !==
        analysis.changes.some((c) => !c.includedInOriginalScope) ||
      analysis.changes.some(
        (c) =>
          c.includedInOriginalScope &&
          !change.scopeSnapshot.includes(c.originalRequirement),
      )
    )
      throw new ProjectError(
        "The analysis did not match the original scope. Please retry.",
      );
    await transaction(async (tx) => {
      const locked = await tx.changeRequest.updateMany({
        where: { id: change.id, status: "ANALYZING" },
        data: { status: "DEVELOPER_REVIEW" },
      });
      if (locked.count !== 1)
        throw new ProjectError("This change request has changed.");
      await tx.aIAnalysis.create({
        data: {
          projectId,
          changeRequestId: change.id,
          kind: "SCOPE_CHANGE",
          provider: "Gemini",
          result: analysis,
        },
      });
      await tx.activityLog.create({
        data: {
          projectId,
          actorId: actor.id,
          action: "SCOPE_ANALYZED",
          description:
            "Gemini compared the request with the agreed scope. No scope, pricing, or payment was approved.",
        },
      });
    });
    return change.id;
  } catch (error) {
    await db().changeRequest.updateMany({
      where: { id: change.id, status: "ANALYZING" },
      data: { status: "PENDING" },
    });
    throw error;
  }
}
export async function resolveChange(
  actor: Actor,
  changeId: string,
  rawAction: unknown,
  input?: unknown,
) {
  const action = changeActionSchema.parse(rawAction);
  const role = ["approve", "decline"].includes(action) ? "CLIENT" : "DEVELOPER";
  if (actor.role !== role)
    throw new ProjectError("This change action is not available to your role.");
  const proposal =
    action === "propose" ? additionalMilestoneSchema.parse(input) : null;
  return transaction(async (tx) => {
    const change = await tx.changeRequest.findFirst({
      where: {
        id: changeId,
        project:
          actor.role === "CLIENT"
            ? { clientId: actor.id }
            : { developerId: actor.id },
      },
      include: {
        analysis: true,
        project: {
          include: {
            scope: { orderBy: { position: "asc" } },
            milestones: { orderBy: { position: "asc" } },
          },
        },
      },
    });
    if (!change || !["AGREED", "ACTIVE"].includes(change.project.status))
      throw new ProjectError("Change request unavailable.");
    if (change.project.paymentHold)
      throw new ProjectError(
        "Resolve the delivery case before changing the agreement.",
      );
    if (
      change.status !==
      (role === "CLIENT" ? "CLIENT_REVIEW" : "DEVELOPER_REVIEW")
    )
      throw new ProjectError(
        "This request has changed. Reload before trying again.",
      );
    if (!change.analysis)
      throw new ProjectError(
        "A validated scope analysis is required before review.",
      );
    const analysis = scopeAnalysisSchema.parse(change.analysis.result);
    let status: "CLIENT_REVIEW" | "APPROVED" | "REJECTED" | "INCLUDED" =
      action === "propose"
        ? "CLIENT_REVIEW"
        : action === "included"
          ? "INCLUDED"
          : ["reject", "decline"].includes(action)
            ? "REJECTED"
            : "APPROVED";
    let milestoneId: string | undefined;
    if (action === "approve") {
      const terms = additionalMilestoneSchema.parse({
        title: change.proposedTitle,
        description: change.proposedDescription,
        amount: change.proposedAmount?.toString(),
        estimatedDays: change.proposedDays,
      });
      const position = (change.project.milestones.at(-1)?.position ?? -1) + 1;
      const busy = change.project.milestones.some((m) =>
        [
          "AWAITING_PAYMENT",
          "FUNDED",
          "IN_PROGRESS",
          "SUBMITTED",
          "LOCKED",
        ].includes(m.status),
      );
      const milestone = await tx.milestone.create({
        data: {
          projectId: change.projectId,
          title: terms.title,
          description: terms.description,
          amount: new Prisma.Decimal(terms.amount),
          estimatedDays: terms.estimatedDays,
          position,
          status: busy ? "LOCKED" : "AWAITING_PAYMENT",
        },
      });
      milestoneId = milestone.id;
      const budget = change.project.budget.plus(
        new Prisma.Decimal(terms.amount),
      );
      if (budget.greaterThan(1000000))
        throw new ProjectError(
          "The revised project budget exceeds the supported limit.",
        );
      await tx.project.update({
        where: { id: change.projectId },
        data: { budget },
      });
    }
    if (action === "approve" || action === "accept_free") {
      const existing = new Set(change.project.scope.map((s) => s.description));
      const added = [
        ...new Set(
          analysis.changes
            .filter((c) => !c.includedInOriginalScope)
            .map((c) => c.feature),
        ),
      ].filter((feature) => !existing.has(feature));
      if (change.project.scope.length + added.length > 100)
        throw new ProjectError("The project scope limit has been reached.");
      await tx.projectScope.createMany({
        data: added.map((description, i) => ({
          projectId: change.projectId,
          description,
          position: (change.project.scope.at(-1)?.position ?? -1) + 1 + i,
        })),
      });
    }
    await tx.changeRequest.update({
      where: { id: change.id },
      data: {
        status,
        ...(proposal
          ? {
              proposedTitle: proposal.title,
              proposedDescription: proposal.description,
              proposedAmount: new Prisma.Decimal(proposal.amount),
              proposedDays: proposal.estimatedDays,
            }
          : {}),
        ...(milestoneId ? { milestoneId } : {}),
        resolutionNote:
          action === "accept_free"
            ? "Developer accepted this change without additional payment."
            : action === "included"
              ? "Developer confirmed that this request is included in the agreement."
              : null,
      },
    });
    await tx.activityLog.create({
      data: {
        projectId: change.projectId,
        actorId: actor.id,
        action: `CHANGE_${action.toUpperCase()}`,
        description:
          action === "propose"
            ? "Developer proposed an additional milestone. Awaiting explicit client approval."
            : action === "approve"
              ? "Client approved an additional milestone and its price. Payment remains separate."
              : action === "accept_free"
                ? "Developer accepted the change without additional payment."
                : action === "included"
                  ? "Developer confirmed the request is already included."
                  : "Change request rejected.",
      },
    });
    const remaining = await tx.milestone.count({
      where: {
        projectId: change.projectId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });
    const pending = await tx.changeRequest.count({
      where: {
        projectId: change.projectId,
        status: {
          in: ["PENDING", "ANALYZING", "DEVELOPER_REVIEW", "CLIENT_REVIEW"],
        },
      },
    });
    if (!remaining && !pending)
      await tx.project.update({
        where: { id: change.projectId },
        data: { status: "COMPLETED" },
      });
    return change.projectId;
  });
}
