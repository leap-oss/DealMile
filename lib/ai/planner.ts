import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAIProvider, AIError } from "./gemini";
import { planInputSchema, type AIProvider } from "./contracts";
import { proposalSchema } from "@/lib/projects/validation";
import { ProjectError, selectDeveloper } from "@/lib/projects/service";
import { transaction } from "@/lib/projects/transaction";
export async function generateDraft(
  userId: string,
  input: unknown,
  existingId?: string,
  suppliedProvider?: AIProvider,
) {
  const provider = suppliedProvider ?? getAIProvider();
  // Validate the brief before assigning a developer or requesting AI output.
  const base = planInputSchema.parse(input);
  const deadline = new Date(base.deadline);
  if (
    Number.isNaN(deadline.getTime()) ||
    deadline.toISOString().slice(0, 10) !== base.deadline ||
    deadline < new Date(new Date().toISOString().slice(0, 10))
  )
    throw new ProjectError("Choose a valid future deadline.");
  let id = existingId;
  if (id) {
    const locked = await db().project.updateMany({
      where: { id, clientId: userId, status: "DRAFT" },
      data: { status: "AI_PLANNING" },
    });
    if (locked.count !== 1)
      throw new ProjectError(
        "This draft is unavailable or already being planned.",
      );
  } else {
    id = (
      await transaction(async (tx) => {
        const developer = await selectDeveloper(tx);
        return tx.project.create({
          data: {
            name: base.name,
            type: base.type,
            requirements: base.requirements,
            budget: base.budget,
            deadline,
            clientId: userId,
            developerId: developer.id,
            status: "AI_PLANNING",
            activities: {
              create: {
                actorId: userId,
                action: "DRAFT_CREATED",
                description: "Client started an AI-assisted project draft.",
              },
            },
          },
          select: { id: true },
        });
      })
    ).id;
  }
  try {
    const plan = await provider.generateProjectPlan(base);
    const proposal = proposalSchema.parse({
      ...base,
      scope: plan.scope,
      milestones: plan.milestones.map((m) => ({
        title: m.title,
        description: m.description,
        amount: m.suggestedAmount,
        estimatedDays: m.estimatedDays,
      })),
    });
    await db().$transaction(
      async (tx) => {
        const project = await tx.project.findFirst({
          where: { id, clientId: userId, status: "AI_PLANNING" },
        });
        if (!project)
          throw new ProjectError("This project has changed. Please reload.");
        await tx.projectScope.deleteMany({ where: { projectId: id } });
        await tx.milestone.deleteMany({ where: { projectId: id } });
        await tx.project.update({
          where: { id },
          data: {
            name: proposal.name,
            type: proposal.type,
            requirements: proposal.requirements,
            budget: proposal.budget,
            deadline,
            summary: plan.summary,
            status: "DRAFT",
            scope: {
              create: plan.scope.map((description, position) => ({
                description,
                position,
              })),
            },
            milestones: {
              create: proposal.milestones.map((m, position) => ({
                ...m,
                position,
              })),
            },
            analyses: {
              create: {
                kind: "PROJECT_PLAN",
                provider: "Gemini",
                result: plan,
              },
            },
            activities: {
              create: {
                actorId: userId,
                action: "AI_PLAN_GENERATED",
                description:
                  "Gemini suggested scope and milestones. Human review required.",
              },
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return id;
  } catch (error) {
    await db().project.updateMany({
      where: { id, clientId: userId, status: "AI_PLANNING" },
      data: { status: "DRAFT" },
    });
    if (error instanceof AIError) {
      error.draftId = id;
      throw error;
    }
    if (error instanceof ProjectError) throw error;
    const failure = new AIError(
      "The suggested plan didn’t meet project validation. Review your draft and try again.",
    );
    failure.draftId = id;
    throw failure;
  }
}
