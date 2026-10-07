import "server-only";
import { randomInt } from "node:crypto";
import { Prisma, type Role, type ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { proposalSchema, type ProposalInput } from "./validation";
import { transaction } from "./transaction";
export class ProjectError extends Error {}
type Actor = { id: string; role: Role };
export type ProjectAction =
  | "submit"
  | "review"
  | "accept"
  | "reject"
  | "approve"
  | "request_revision"
  | "revise"
  | "save";
const rules: Record<
  ProjectAction,
  { role: Role; from: ProjectStatus[]; to: ProjectStatus | null }
> = {
  submit: { role: "CLIENT", from: ["DRAFT"], to: "PENDING_DEVELOPER_REVIEW" },
  review: {
    role: "DEVELOPER",
    from: ["PENDING_DEVELOPER_REVIEW"],
    to: "DEVELOPER_REVIEW",
  },
  accept: { role: "DEVELOPER", from: ["DEVELOPER_REVIEW"], to: "AGREED" },
  reject: { role: "DEVELOPER", from: ["DEVELOPER_REVIEW"], to: "REJECTED" },
  revise: {
    role: "DEVELOPER",
    from: ["DEVELOPER_REVIEW"],
    to: "CLIENT_REVIEW",
  },
  approve: { role: "CLIENT", from: ["CLIENT_REVIEW"], to: "AGREED" },
  request_revision: {
    role: "CLIENT",
    from: ["CLIENT_REVIEW"],
    to: "DEVELOPER_REVIEW",
  },
  save: { role: "CLIENT", from: ["DRAFT"], to: null },
};
function terms(data: ProposalInput) {
  return {
    name: data.name,
    type: data.type,
    requirements: data.requirements,
    budget: new Prisma.Decimal(data.budget),
    deadline: new Date(data.deadline),
  };
}
export async function selectDeveloper(tx: Prisma.TransactionClient) {
  const developers = await tx.user.findMany({
    where: { role: "DEVELOPER" },
    select: {
      id: true,
      _count: {
        select: {
          developerProjects: {
            where: {
              status: { notIn: ["COMPLETED", "REJECTED", "CANCELLED"] },
            },
          },
        },
      },
    },
  });
  if (!developers.length)
    throw new ProjectError(
      "No developers are available yet. Please try again after a developer registers.",
    );
  const minimum = Math.min(
    ...developers.map((developer) => developer._count.developerProjects),
  );
  const candidates = developers.filter(
    (developer) => developer._count.developerProjects === minimum,
  );
  return candidates[randomInt(candidates.length)];
}
export async function createProject(actor: Actor, input: unknown) {
  if (actor.role !== "CLIENT")
    throw new ProjectError("Only clients can create projects.");
  const data = proposalSchema.parse(input);
  if (new Date(data.deadline) < new Date(new Date().toISOString().slice(0, 10)))
    throw new ProjectError("Choose a deadline today or later.");
  return transaction(async (tx) => {
    const developer = await selectDeveloper(tx);
    return tx.project.create({
      data: {
        ...terms(data),
        clientId: actor.id,
        developerId: developer.id,
        scope: {
          create: data.scope.map((description, position) => ({
            description,
            position,
          })),
        },
        milestones: {
          create: data.milestones.map((m, position) => ({
            ...m,
            amount: new Prisma.Decimal(m.amount),
            position,
          })),
        },
        activities: {
          create: {
            actorId: actor.id,
            action: "DRAFT_CREATED",
            description: "Client created the project draft.",
          },
        },
      },
      select: { id: true },
    });
  });
}
export async function mutateProject(
  actor: Actor,
  projectId: string,
  action: ProjectAction,
  input?: unknown,
) {
  const rule = rules[action];
  if (!rule || actor.role !== rule.role)
    throw new ProjectError("This action is not available to your account.");
  const data =
    action === "save" || action === "revise"
      ? proposalSchema.parse(input)
      : null;
  return db().$transaction(
    async (tx) => {
      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          ...(actor.role === "CLIENT"
            ? { clientId: actor.id }
            : { developerId: actor.id }),
        },
        include: {
          scope: { orderBy: { position: "asc" } },
          milestones: { orderBy: { position: "asc" } },
        },
      });
      if (!project) throw new ProjectError("Project unavailable.");
      if (project.paymentHold)
        throw new ProjectError(
          "Resolve the open case or cancellation request before changing the agreement.",
        );
      if (!rule.from.includes(project.status))
        throw new ProjectError(
          "This project has changed. Reload before trying again.",
        );
      if (data) {
        await tx.projectScope.deleteMany({ where: { projectId } });
        await tx.milestone.deleteMany({ where: { projectId } });
        await tx.projectScope.createMany({
          data: data.scope.map((description, position) => ({
            projectId,
            description,
            position,
          })),
        });
        await tx.milestone.createMany({
          data: data.milestones.map((m, position) => ({
            ...m,
            projectId,
            position,
          })),
        });
      }
      const status = rule.to ?? project.status;
      await tx.project.update({
        where: { id: projectId },
        data: { ...(data ? terms(data) : {}), status },
      });
      if (action === "submit" || action === "revise") {
        const version =
          (await tx.proposalRevision.count({ where: { projectId } })) + 1;
        const snapshot = data ?? {
          name: project.name,
          type: project.type,
          requirements: project.requirements,
          budget: Number(project.budget),
          deadline: project.deadline.toISOString().slice(0, 10),
          scope: project.scope.map((s) => s.description),
          milestones: project.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: Number(m.amount),
            estimatedDays: m.estimatedDays,
          })),
        };
        await tx.proposalRevision.create({
          data: {
            projectId,
            version,
            summary:
              action === "submit"
                ? "Client submitted the initial proposal."
                : "Developer proposed revised terms.",
            snapshot,
          },
        });
      }
      if (status === "AGREED") {
        const first = await tx.milestone.findFirst({
          where: { projectId },
          orderBy: { position: "asc" },
        });
        if (!first)
          throw new ProjectError("An agreement needs at least one milestone.");
        await tx.milestone.update({
          where: { id: first.id },
          data: { status: "AWAITING_PAYMENT" },
        });
        const latest = await tx.proposalRevision.findFirst({
          where: { projectId },
          orderBy: { version: "desc" },
        });
        if (latest)
          await tx.proposalRevision.update({
            where: { id: latest.id },
            data: { acceptedAt: new Date() },
          });
      }
      const descriptions: Record<ProjectAction, string> = {
        save: "Client updated the draft.",
        submit: "Client submitted the project for developer review.",
        review: "Developer started reviewing the proposal.",
        accept: "Developer accepted the proposal. The agreement is confirmed.",
        reject: "Developer rejected the proposal.",
        revise: "Developer proposed revised scope, pricing, or timeline.",
        approve:
          "Client approved the revised proposal. The agreement is confirmed.",
        request_revision: "Client requested another proposal revision.",
      };
      await tx.activityLog.create({
        data: {
          projectId,
          actorId: actor.id,
          action: action.toUpperCase(),
          description: descriptions[action],
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
