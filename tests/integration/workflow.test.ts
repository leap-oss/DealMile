import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { mutateMilestone } from "../../lib/milestones/service";
import { analyzeChange, resolveChange } from "../../lib/changes/service";
import { recordVerifiedOrder } from "../../lib/payments/service";
import type { AIProvider } from "../../lib/ai/contracts";
test("paid delivery, revisions, scoped authorization and human-approved additions preserve agreement and payments", async () => {
  const prefix = `delivery-${Date.now()}`;
  const users: string[] = [];
  let projectId: string | undefined;
  try {
    const client = await db().user.create({
      data: {
        name: "Workflow client",
        email: `${prefix}-client@example.com`,
        role: "CLIENT",
        passwordHash: "unused",
      },
    });
    const developer = await db().user.create({
      data: {
        name: "Workflow developer",
        email: `${prefix}-dev@example.com`,
        role: "DEVELOPER",
        passwordHash: "unused",
      },
    });
    const stranger = await db().user.create({
      data: {
        name: "Unrelated developer",
        email: `${prefix}-other@example.com`,
        role: "DEVELOPER",
        passwordHash: "unused",
      },
    });
    users.push(client.id, developer.id, stranger.id);
    const project = await db().project.create({
      data: {
        name: "Workflow commerce",
        type: "Website",
        requirements: "Build email authentication and product management",
        clientId: client.id,
        developerId: developer.id,
        budget: 100,
        deadline: new Date("2027-12-31"),
        status: "AGREED",
        scope: {
          create: { description: "Email/password authentication", position: 0 },
        },
        milestones: {
          create: {
            title: "Initial delivery",
            description: "Implement initial working authentication",
            amount: 100,
            estimatedDays: 5,
            position: 0,
            status: "AWAITING_PAYMENT",
          },
        },
      },
      include: { milestones: true },
    });
    projectId = project.id;
    const m = project.milestones[0];
    await assert.rejects(() => mutateMilestone(developer, m.id, "start"));
    const payment = await db().payment.create({
      data: {
        milestoneId: m.id,
        amount: 100,
        currency: "USD",
        paypalOrderId: "WORKFLOWORDER12345",
        paypalPayeeId: "workflow-merchant",
      },
    });
    const order = {
      id: payment.paypalOrderId,
      status: "COMPLETED",
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: m.id,
          custom_id: payment.id,
          amount: { currency_code: "USD", value: "100.00" },
          payee: { merchant_id: "workflow-merchant" },
          payments: {
            captures: [
              {
                id: `capture-${prefix}`,
                status: "COMPLETED",
                final_capture: true,
                amount: { currency_code: "USD", value: "100.00" },
              },
            ],
          },
        },
      ],
    };
    // Contract fixture, not real PayPal transaction evidence.
    await recordVerifiedOrder(payment.id, order);
    await assert.rejects(() => mutateMilestone(stranger, m.id, "start"));
    await assert.rejects(() => mutateMilestone(client, m.id, "start"));
    await mutateMilestone(developer, m.id, "start");
    await mutateMilestone(
      developer,
      m.id,
      "submit",
      "Authentication is delivered; see the reviewed staging build.",
    );
    await mutateMilestone(client, m.id, "revision");
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: m.id } })).status,
      "IN_PROGRESS",
    );
    const provider: AIProvider = {
      generateProjectPlan: async () => {
        throw new Error("unused");
      },
      analyzeScopeChange: async () => ({
        scopeChangeDetected: true,
        changes: [
          {
            feature: "Google OAuth",
            includedInOriginalScope: false,
            originalRequirement: "",
            reason:
              "The agreement includes only email/password authentication.",
          },
        ],
      }),
    };
    await assert.rejects(() =>
      analyzeChange(
        client,
        project.id,
        "Please improve the authentication flow.",
        undefined,
        {
          ...provider,
          analyzeScopeChange: async () => ({
            scopeChangeDetected: false,
            changes: [
              {
                feature: "Google OAuth",
                includedInOriginalScope: false,
                originalRequirement: "",
                reason: "New feature outside the agreement.",
              },
            ],
          }),
        },
      ),
    );
    const failed = await db().changeRequest.findFirstOrThrow({
      where: { projectId: project.id, status: "PENDING" },
    });
    await analyzeChange(
      client,
      project.id,
      "This replacement text must not overwrite the saved request.",
      failed.id,
      {
        ...provider,
        analyzeScopeChange: async () => ({
          scopeChangeDetected: false,
          changes: [
            {
              feature: "Email authentication",
              includedInOriginalScope: true,
              originalRequirement: "Email/password authentication",
              reason:
                "The agreement already includes email/password authentication.",
            },
          ],
        }),
      },
    );
    assert.equal(
      (await db().changeRequest.findUniqueOrThrow({ where: { id: failed.id } }))
        .description,
      "Please improve the authentication flow.",
    );
    await resolveChange(developer, failed.id, "included");
    assert.equal(
      (await db().changeRequest.findUniqueOrThrow({ where: { id: failed.id } }))
        .status,
      "INCLUDED",
    );
    const freeId = await analyzeChange(
      client,
      project.id,
      "Please add Google OAuth at no extra charge.",
      undefined,
      provider,
    );
    await resolveChange(developer, freeId, "accept_free");
    assert.equal(
      (
        await db().project.findUniqueOrThrow({ where: { id: project.id } })
      ).budget.toString(),
      "100",
    );
    assert.equal(
      await db().milestone.count({ where: { projectId: project.id } }),
      1,
    );
    const declinedId = await analyzeChange(
      client,
      project.id,
      "Please add an analytics dashboard as another paid feature.",
      undefined,
      provider,
    );
    await resolveChange(developer, declinedId, "propose", {
      title: "Analytics dashboard",
      description: "Deliver a sales analytics dashboard",
      amount: 25,
      estimatedDays: 2,
    });
    await resolveChange(client, declinedId, "decline");
    assert.equal(
      await db().milestone.count({ where: { projectId: project.id } }),
      1,
    );
    const request =
      "Please add Google OAuth sign-in to the authentication module.";
    const changeId = await analyzeChange(
      client,
      project.id,
      request,
      undefined,
      provider,
    );
    assert.equal(
      (
        await db().project.findUniqueOrThrow({ where: { id: project.id } })
      ).budget.toString(),
      "100",
    );
    await assert.rejects(() =>
      resolveChange(stranger, changeId, "propose", {
        title: "Google OAuth",
        description: "Implement Google sign-in and account linking",
        amount: 50,
        estimatedDays: 2,
      }),
    );
    await assert.rejects(() => resolveChange(client, changeId, "approve"));
    await resolveChange(developer, changeId, "propose", {
      title: "Google OAuth",
      description: "Implement Google sign-in and account linking",
      amount: 50,
      estimatedDays: 2,
    });
    assert.equal(
      await db().milestone.count({ where: { projectId: project.id } }),
      1,
    );
    await resolveChange(client, changeId, "approve");
    const extra = await db().changeRequest.findUniqueOrThrow({
      where: { id: changeId },
      include: { milestone: true },
    });
    assert.equal(extra.milestone?.status, "LOCKED");
    assert.equal(
      (
        await db().project.findUniqueOrThrow({ where: { id: project.id } })
      ).budget.toString(),
      "150",
    );
    await assert.rejects(() => resolveChange(client, changeId, "approve"));
    await assert.rejects(() =>
      mutateMilestone(developer, extra.milestoneId!, "start"),
    );
    await mutateMilestone(
      developer,
      m.id,
      "submit",
      "Requested fixes are delivered and available for client review.",
    );
    await Promise.allSettled([
      mutateMilestone(client, m.id, "complete"),
      mutateMilestone(client, m.id, "complete"),
    ]);
    assert.equal(
      (
        await db().milestone.findUniqueOrThrow({
          where: { id: extra.milestoneId! },
        })
      ).status,
      "AWAITING_PAYMENT",
    );
    assert.equal(
      await db().activityLog.count({
        where: { projectId: project.id, action: "MILESTONE_COMPLETE" },
      }),
      1,
    );
    const payment2 = await db().payment.create({
      data: {
        milestoneId: extra.milestoneId!,
        amount: 50,
        currency: "USD",
        paypalOrderId: "EXTRAORDER12345",
        paypalPayeeId: "workflow-merchant",
      },
    });
    const extraOrder = {
      ...order,
      id: payment2.paypalOrderId,
      purchase_units: [
        {
          ...order.purchase_units[0],
          reference_id: extra.milestoneId,
          custom_id: payment2.id,
          amount: { currency_code: "USD", value: "50.00" },
          payments: {
            captures: [
              {
                ...order.purchase_units[0].payments.captures[0],
                id: `extra-${prefix}`,
                amount: { currency_code: "USD", value: "50.00" },
              },
            ],
          },
        },
      ],
    };
    await recordVerifiedOrder(payment2.id, extraOrder);
    await mutateMilestone(developer, extra.milestoneId!, "start");
    await mutateMilestone(
      developer,
      extra.milestoneId!,
      "submit",
      "Google OAuth and account linking delivered for review.",
    );
    await mutateMilestone(client, extra.milestoneId!, "complete");
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .status,
      "COMPLETED",
    );
    assert.equal(
      (await db().changeRequest.findUniqueOrThrow({ where: { id: changeId } }))
        .scopeSnapshot[0],
      "Email/password authentication",
    );
    assert.equal(
      await db().payment.count({
        where: { milestone: { projectId: project.id } },
      }),
      2,
    );
  } finally {
    if (projectId) {
      await db().changeRequest.deleteMany({ where: { projectId } });
      await db().payment.deleteMany({ where: { milestone: { projectId } } });
      await db().project.delete({ where: { id: projectId } });
    }
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().$disconnect();
  }
});
