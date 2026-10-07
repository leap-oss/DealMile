import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { generateDraft } from "../../lib/ai/planner";
import { AIError } from "../../lib/ai/gemini";
import type { AIProvider } from "../../lib/ai/contracts";
test("AI plans persist as drafts, remain advisory, and recover safely on invalid output", async () => {
  const prefix = `planner-${Date.now()}`;
  const users: string[] = [];
  let id: string | undefined;
  try {
    const client = await db().user.create({
      data: {
        name: "Planner Client",
        email: `${prefix}-client@example.com`,
        role: "CLIENT",
        passwordHash: "unused",
      },
    });
    users.push(client.id);
    const developer = await db().user.create({
      data: {
        name: "Planner Developer",
        email: `${prefix}-developer@example.com`,
        role: "DEVELOPER",
        passwordHash: "unused",
      },
    });
    users.push(developer.id);
    const plan = {
      summary: "An e-commerce website ready for human review",
      scope: ["Email authentication"],
      milestones: [
        {
          title: "Implementation",
          description: "Deliver email authentication and commerce flow",
          suggestedAmount: 1000,
          estimatedDays: 20,
        },
      ],
      risks: ["Confirm external provider requirements"],
    };
    const provider: AIProvider = {
      generateProjectPlan: async () => plan,
      analyzeScopeChange: async () => {
        throw new Error("unused");
      },
    };
    const input = {
      name: "E-commerce website",
      type: "Website",
      requirements: "Build an e-commerce website with email authentication",
      budget: 1000,
      deadline: "2027-12-31",
    };
    id = await generateDraft(client.id, input, undefined, provider);
    const project = await db().project.findUniqueOrThrow({
      where: { id },
      include: {
        milestones: true,
        scope: true,
        analyses: true,
        revisions: true,
      },
    });
    assert.equal(project.status, "DRAFT");
    assert(project.developerId);
    assert.equal(
      (
        await db().user.findUniqueOrThrow({
          where: { id: project.developerId },
        })
      ).role,
      "DEVELOPER",
    );
    assert.equal(project.milestones[0].status, "LOCKED");
    assert.equal(project.revisions.length, 0);
    assert.equal(project.analyses.length, 1);
    assert.equal(project.scope[0].description, "Email authentication");
    await assert.rejects(
      () =>
        generateDraft(client.id, input, id, {
          ...provider,
          generateProjectPlan: async () => ({
            ...plan,
            milestones: [{ ...plan.milestones[0], suggestedAmount: 900 }],
          }),
        }),
      AIError,
    );
    const recovered = await db().project.findUniqueOrThrow({
      where: { id },
      include: { milestones: true, analyses: true },
    });
    assert.equal(recovered.status, "DRAFT");
    assert.equal(Number(recovered.milestones[0].amount), 1000);
    assert.equal(recovered.analyses.length, 1);
  } finally {
    await db().project.deleteMany({ where: { clientId: { in: users } } });
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().$disconnect();
  }
});
