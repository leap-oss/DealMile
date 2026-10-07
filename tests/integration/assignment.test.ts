import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { createProject } from "../../lib/projects/service";
import { generateDraft } from "../../lib/ai/planner";
import type { AIProvider } from "../../lib/ai/contracts";
test("new assignments prefer the least-loaded developer and concurrent manual/AI drafts stay balanced", async () => {
  const prefix = `assignment-${Date.now()}`,
    users: string[] = [];
  let clientId: string | undefined;
  try {
    const account = async (role: "CLIENT" | "DEVELOPER", name: string) => {
      const u = await db().user.create({
        data: {
          role,
          name,
          email: `${prefix}-${name}@example.com`,
          passwordHash: "unused",
        },
      });
      users.push(u.id);
      return u;
    };
    const client = await account("CLIENT", "client"),
      light = await account("DEVELOPER", "light"),
      heavy = await account("DEVELOPER", "heavy");
    clientId = client.id;
    const seed = {
      name: "Assignment fixture",
      type: "Website",
      requirements: "Implement an accessible website",
      budget: 100,
      deadline: new Date("2028-12-31"),
      clientId: client.id,
    };
    await db().project.createMany({
      data: [
        { ...seed, developerId: light.id, status: "COMPLETED" },
        { ...seed, developerId: light.id, status: "REJECTED" },
        { ...seed, developerId: light.id, status: "CANCELLED" },
        { ...seed, developerId: heavy.id, status: "ACTIVE" },
        { ...seed, developerId: heavy.id, status: "DEVELOPER_REVIEW" },
      ],
    });
    const developers = await db().user.findMany({
      where: { role: "DEVELOPER" },
      select: { id: true },
    });
    const counts = new Map(developers.map((d) => [d.id, 0]));
    const before = await db().project.findMany({
      where: { developerId: { not: null } },
      select: { developerId: true, status: true },
    });
    for (const p of before)
      if (
        !["COMPLETED", "REJECTED", "CANCELLED"].includes(p.status) &&
        counts.has(p.developerId!)
      )
        counts.set(p.developerId!, counts.get(p.developerId!)! + 1);
    assert.equal(counts.get(light.id), 0);
    assert.equal(counts.get(heavy.id), 2);
    const brief = {
      name: "Balanced website",
      type: "Website",
      requirements: "Implement an accessible website with authentication",
      budget: 100,
      deadline: "2028-12-31",
    };
    const manual = {
      ...brief,
      scope: ["Email authentication"],
      milestones: [
        {
          title: "Implementation",
          description: "Deliver authentication implementation",
          amount: 100,
          estimatedDays: 3,
        },
      ],
    };
    const first = await createProject(client, manual);
    const assigned = await db().project.findUniqueOrThrow({
      where: { id: first.id },
    });
    assert.equal(
      counts.get(assigned.developerId!),
      Math.min(...counts.values()),
    );
    counts.set(assigned.developerId!, counts.get(assigned.developerId!)! + 1);
    const expected = [...counts.values()];
    for (let i = 0; i < 3; i++) {
      const index = expected.indexOf(Math.min(...expected));
      expected[index]++;
    }
    const provider: AIProvider = {
      generateProjectPlan: async () => ({
        summary: "A scoped implementation ready for human review",
        scope: manual.scope,
        milestones: manual.milestones.map(({ amount, ...m }) => ({
          ...m,
          suggestedAmount: amount,
        })),
        risks: [],
      }),
      analyzeScopeChange: async () => {
        throw new Error("unused");
      },
    };
    const [, aiId] = await Promise.all([
      createProject(client, manual),
      generateDraft(client.id, brief, undefined, provider),
      createProject(client, manual),
    ]);
    const created = await db().project.findMany({
      where: { clientId: client.id, status: "DRAFT" },
      select: { developerId: true },
    });
    assert.equal(created.length, 4);
    // The final load multiset must equal repeatedly giving work to the smallest
    // load. This catches racing assignments without assuming which random tie wins.
    const actual = new Map(counts);
    for (const p of created)
      if (p.developerId !== undefined)
        actual.set(p.developerId!, actual.get(p.developerId!)! + 1);
    actual.set(assigned.developerId!, actual.get(assigned.developerId!)! - 1);
    assert.deepEqual(
      [...actual.values()].sort((a, b) => a - b),
      expected.sort((a, b) => a - b),
    );
    const aiBefore = await db().project.findUniqueOrThrow({
      where: { id: aiId },
    });
    await generateDraft(client.id, brief, aiId, provider);
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: aiId } }))
        .developerId,
      aiBefore.developerId,
    );
    assert.equal(
      await db().project.count({
        where: { clientId: client.id, status: "DRAFT" },
      }),
      4,
    );
  } finally {
    if (clientId) await db().project.deleteMany({ where: { clientId } });
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().$disconnect();
  }
});
