import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { recordVerifiedOrder } from "../../lib/payments/service";
test("verified API capture funds without a webhook; later webhook reconciliation is idempotent", async () => {
  const prefix = `payment-test-${Date.now()}`;
  let userId: string | undefined;
  let projectId: string | undefined;
  const eventId = `event-${prefix}`;
  try {
    const user = await db().user.create({
      data: {
        name: "Payment Test Client",
        email: `${prefix}@example.com`,
        role: "CLIENT",
        passwordHash: "unused",
      },
    });
    userId = user.id;
    const project = await db().project.create({
      data: {
        name: "Payment test",
        type: "Website",
        requirements: "Test server-verified milestone payment",
        budget: 150,
        deadline: new Date("2027-12-31"),
        clientId: user.id,
        status: "AGREED",
        milestones: {
          create: {
            title: "Design",
            description: "Test responsive design",
            amount: 150,
            estimatedDays: 5,
            position: 0,
            status: "AWAITING_PAYMENT",
          },
        },
      },
      include: { milestones: true },
    });
    projectId = project.id;
    const milestone = project.milestones[0];
    const payment = await db().payment.create({
      data: {
        milestoneId: milestone.id,
        amount: 150,
        currency: "USD",
        paypalOrderId: "TESTORDER12345",
        paypalPayeeId: "merchant-test",
      },
    });
    const order = {
      id: payment.paypalOrderId,
      intent: "CAPTURE",
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: milestone.id,
          custom_id: payment.id,
          amount: { currency_code: "USD", value: "150.00" },
          payee: { merchant_id: "merchant-test" },
          payments: {
            captures: [
              {
                id: `capture-${prefix}`,
                status: "COMPLETED",
                final_capture: true,
                amount: { currency_code: "USD", value: "150.00" },
              },
            ],
          },
        },
      ],
    };
    const unapproved = structuredClone(order);
    unapproved.status = "APPROVED";
    await assert.rejects(() => recordVerifiedOrder(payment.id, unapproved));
    const wrongAmount = structuredClone(order);
    wrongAmount.purchase_units[0].payments.captures[0].amount.value = "1.00";
    await assert.rejects(() => recordVerifiedOrder(payment.id, wrongAmount));
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: milestone.id } }))
        .status,
      "AWAITING_PAYMENT",
    );
    await Promise.all([
      recordVerifiedOrder(payment.id, order),
      recordVerifiedOrder(payment.id, order),
    ]);
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: milestone.id } }))
        .status,
      "FUNDED",
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "CAPTURED",
    );
    const recorded = await db().payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    assert(recorded.verifiedAt);
    assert.equal(recorded.webhookVerifiedAt, null);
    assert.equal(recorded.paypalCaptureId, `capture-${prefix}`);
    const event = { id: eventId, captureId: `capture-${prefix}` };
    await Promise.all([
      recordVerifiedOrder(payment.id, order, event),
      recordVerifiedOrder(payment.id, order, event),
    ]);
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: milestone.id } }))
        .status,
      "FUNDED",
    );
    assert.equal(
      await db().activityLog.count({
        where: { projectId: project.id, action: "PAYMENT_VERIFIED" },
      }),
      1,
    );
    assert.equal(await db().webhookEvent.count({ where: { id: eventId } }), 1);
    const altered = structuredClone(order);
    altered.purchase_units[0].payments.captures[0].amount.value = "1.00";
    await assert.rejects(() => recordVerifiedOrder(payment.id, altered));
    assert.equal(
      await db().payment.count({ where: { milestoneId: milestone.id } }),
      1,
    );
  } finally {
    if (projectId) {
      await db().payment.deleteMany({ where: { milestone: { projectId } } });
      await db().project.delete({ where: { id: projectId } });
    }
    await db().webhookEvent.deleteMany({ where: { id: eventId } });
    if (userId) await db().user.delete({ where: { id: userId } });
    await db().$disconnect();
  }
});
