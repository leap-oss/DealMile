import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { paymentOperation } from "../../lib/payments/operation";
import {
  deliveryAction,
  processRefund,
  recordDeliveryReminders,
} from "../../lib/delivery/service";
import { mutateMilestone } from "../../lib/milestones/service";
import { prepareOrder, recordVerifiedOrder } from "../../lib/payments/service";

test("delivery deadlines, bilateral resolution and authoritative refunds protect funded work", async () => {
  const prefix = `followup-${Date.now()}`;
  const users: string[] = [];
  let projectId: string | undefined;
  try {
    async function user(role: "CLIENT" | "DEVELOPER", suffix: string) {
      const u = await db().user.create({
        data: {
          name: suffix,
          email: `${prefix}-${suffix}@example.com`,
          role,
          passwordHash: "unused",
        },
      });
      users.push(u.id);
      return u;
    }
    const client = await user("CLIENT", "client"),
      developer = await user("DEVELOPER", "dev"),
      stranger = await user("CLIENT", "stranger");
    const overdue = new Date(Date.now() - 86400000);
    const project = await db().project.create({
      data: {
        name: "Late delivery",
        type: "Website",
        requirements: "Deliver a working website",
        budget: 150,
        deadline: new Date("2028-12-31"),
        clientId: client.id,
        developerId: developer.id,
        status: "ACTIVE",
        milestones: {
          create: [
            {
              title: "Funded delivery",
              description: "Deliver implementation",
              amount: 100,
              estimatedDays: 5,
              position: 0,
              status: "IN_PROGRESS",
              dueAt: overdue,
            },
            {
              title: "Remaining work",
              description: "Deliver enhancements",
              amount: 50,
              estimatedDays: 3,
              position: 1,
              status: "LOCKED",
            },
          ],
        },
      },
      include: { milestones: { orderBy: { position: "asc" } } },
    });
    projectId = project.id;
    const m = project.milestones[0],
      next = project.milestones[1];
    const payment = await db().payment.create({
      data: {
        milestoneId: m.id,
        amount: 100,
        currency: "USD",
        status: "CAPTURED",
        verifiedAt: new Date(),
        paypalOrderId: `FOLLOWUPORDER12345`,
        paypalCaptureId: "CAPTUREFOLLOWUP123",
        paypalPayeeId: "merchant",
      },
    });
    const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await assert.rejects(() =>
      deliveryAction(client, m.id, "request_extension", {
        date,
        reason: "Need more time for implementation",
      }),
    );
    await assert.rejects(() =>
      deliveryAction(stranger, m.id, "open_case", {
        reason: "No work was delivered",
        evidence: "Messages were unanswered for days",
      }),
    );
    await assert.rejects(() =>
      deliveryAction(developer, m.id, "request_extension", {
        date: "2028-02-30",
        reason: "Invalid date must be rejected",
      }),
    );
    const reminders = await Promise.all([
      recordDeliveryReminders([project.id]),
      recordDeliveryReminders([project.id]),
    ]);
    assert.equal(
      reminders.reduce((a, b) => a + b, 0),
      1,
    );
    assert.equal(
      await db().deliveryReminder.count({ where: { milestoneId: m.id } }),
      1,
    );
    const requests = await Promise.allSettled([
      deliveryAction(developer, m.id, "request_extension", {
        date,
        reason: "Need more time to finish integration",
      }),
      deliveryAction(developer, m.id, "request_extension", {
        date,
        reason: "Need more time to finish integration",
      }),
    ]);
    assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
    let extension = await db().deadlineExtension.findFirstOrThrow({
      where: { milestoneId: m.id, status: "PENDING" },
    });
    assert.equal(
      (
        await db().milestone.findUniqueOrThrow({ where: { id: m.id } })
      ).dueAt?.getTime(),
      overdue.getTime(),
    );
    await deliveryAction(client, m.id, "reject_extension", {
      recordId: extension.id,
    });
    await deliveryAction(developer, m.id, "request_extension", {
      date,
      reason: "Updated implementation timeline for review",
    });
    extension = await db().deadlineExtension.findFirstOrThrow({
      where: { milestoneId: m.id, status: "PENDING" },
    });
    await deliveryAction(client, m.id, "approve_extension", {
      recordId: extension.id,
    });
    await assert.rejects(() =>
      deliveryAction(client, m.id, "approve_extension", {
        recordId: extension.id,
      }),
    );
    assert.equal(
      (
        await db().milestone.findUniqueOrThrow({ where: { id: m.id } })
      ).dueAt?.getTime(),
      extension.requestedDueAt.getTime(),
    );
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const inFlight = paymentOperation(
      project.id,
      client.id,
      false,
      async () => {
        started();
        await gate;
      },
    );
    await ready;
    await assert.rejects(
      () =>
        deliveryAction(client, m.id, "open_case", {
          reason: "Developer is not responding to messages",
          evidence: "Three contact attempts with no staging delivery",
        }),
      /PayPal request/,
    );
    await assert.rejects(
      () => paymentOperation(project.id, client.id, false, async () => {}),
      /already in progress/,
    );
    release();
    await inFlight;
    await deliveryAction(client, m.id, "open_case", {
      reason: "Developer is not responding to messages",
      evidence: "Three contact attempts with no staging delivery",
    });
    let item = await db().deliveryCase.findFirstOrThrow({
      where: { milestoneId: m.id, status: "OPEN" },
    });
    assert(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .paymentHold,
    );
    await assert.rejects(() =>
      mutateMilestone(
        developer,
        m.id,
        "submit",
        "Delivered all the requested work",
      ),
    );
    // Even an awaiting milestone cannot start checkout while a delivery hold is active.
    await db().milestone.update({
      where: { id: next.id },
      data: { status: "AWAITING_PAYMENT" },
    });
    await assert.rejects(() => prepareOrder(client.id, next.id), /paused/);
    assert.equal(
      await db().payment.count({ where: { milestoneId: next.id } }),
      0,
    );
    await db().milestone.update({
      where: { id: next.id },
      data: { status: "LOCKED" },
    });
    await assert.rejects(() =>
      deliveryAction(client, m.id, "approve_resolution", { recordId: item.id }),
    );
    const resumed = new Date(Date.now() + 10 * 86400000)
      .toISOString()
      .slice(0, 10);
    await deliveryAction(developer, m.id, "propose_resolution", {
      recordId: item.id,
      resolution: "RESUME",
      date: resumed,
      reason: "Resume implementation with a revised delivery date",
    });
    await deliveryAction(client, m.id, "reject_resolution", {
      recordId: item.id,
    });
    assert(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .paymentHold,
    );
    await deliveryAction(developer, m.id, "propose_resolution", {
      recordId: item.id,
      resolution: "RESUME",
      date: resumed,
      reason: "Resume implementation with the agreed revised delivery date",
    });
    await deliveryAction(client, m.id, "approve_resolution", {
      recordId: item.id,
    });
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .paymentHold,
      false,
    );
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: m.id } })).dueAt
        ?.toISOString()
        .slice(0, 10),
      resumed,
    );
    await deliveryAction(client, m.id, "open_case", {
      reason: "Review a cancelled delivery report",
      evidence: "Client supplied follow up contact information",
    });
    item = await db().deliveryCase.findFirstOrThrow({
      where: { milestoneId: m.id, status: "OPEN" },
    });
    await deliveryAction(client, m.id, "withdraw_case", {
      recordId: item.id,
      reason: "Developer has responded with a working staging link",
    });
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .paymentHold,
      false,
    );
    await deliveryAction(client, m.id, "open_case", {
      reason: "Cancel future work by mutual agreement",
      evidence: "The existing funded implementation is still to be delivered",
    });
    item = await db().deliveryCase.findFirstOrThrow({
      where: { milestoneId: m.id, status: "OPEN" },
    });
    // Existing orders must not be silently discarded by cancellation.
    const nextPayment = await db().payment.create({
      data: {
        milestoneId: next.id,
        amount: 50,
        currency: "USD",
        paypalOrderId: "EXISTINGORDER12345",
      },
    });
    await assert.rejects(() =>
      deliveryAction(developer, m.id, "propose_resolution", {
        recordId: item.id,
        resolution: "CANCEL_REMAINING",
        reason: "Cancel the unpaid remaining implementation",
      }),
    );
    await db().payment.delete({ where: { id: nextPayment.id } });
    await deliveryAction(developer, m.id, "propose_resolution", {
      recordId: item.id,
      resolution: "CANCEL_REMAINING",
      reason: "Cancel the unpaid remaining implementation",
    });
    await deliveryAction(client, m.id, "approve_resolution", {
      recordId: item.id,
    });
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: next.id } }))
        .status,
      "CANCELLED",
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "CAPTURED",
    );
    await deliveryAction(client, m.id, "open_case", {
      reason: "Delivery cannot be completed and refund is requested",
      evidence: "Both parties agree the implementation was not delivered",
    });
    item = await db().deliveryCase.findFirstOrThrow({
      where: { milestoneId: m.id, status: "OPEN" },
    });
    let posts = 0,
      status = "PENDING",
      badAmount = false,
      loseResponse = true;
    const rawRefund = () => ({
      id: "REFUNDFOLLOWUP123",
      status,
      amount: { value: badAmount ? "99.00" : "100.00", currency_code: "USD" },
      links: [
        {
          rel: "up",
          href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${payment.paypalCaptureId}`,
        },
      ],
    });
    // Explicit provider fixture, not real Sandbox refund evidence.
    const provider = {
      refundCapture: async (
        _capture: string,
        amount: string,
        currency: string,
        requestKey: string,
      ) => {
        posts++;
        assert.equal(amount, "100.00");
        assert.equal(currency, "USD");
        assert.equal(requestKey, item.refundRequestKey);
        if (loseResponse) {
          loseResponse = false;
          throw new Error("Lost response");
        }
        return rawRefund();
      },
      getRefund: async () => rawRefund(),
    };
    await assert.rejects(() => processRefund(client, item.id, provider));
    assert.equal(posts, 0);
    await deliveryAction(developer, m.id, "propose_resolution", {
      recordId: item.id,
      resolution: "REFUND",
      reason: "We agree to a full refund of the undelivered work",
    });
    await assert.rejects(() => processRefund(developer, item.id, provider));
    await deliveryAction(client, m.id, "approve_resolution", {
      recordId: item.id,
    });
    await assert.rejects(() =>
      deliveryAction(client, m.id, "withdraw_case", {
        recordId: item.id,
        reason: "Cannot withdraw consent during refund processing",
      }),
    );
    await assert.rejects(() => processRefund(stranger, item.id, provider));
    await assert.rejects(() => processRefund(client, item.id, provider));
    await assert.rejects(
      () => processRefund(client, item.id, provider),
      /pending/,
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "CAPTURED",
    );
    status = "COMPLETED";
    badAmount = true;
    await assert.rejects(
      () => processRefund(client, item.id, provider),
      /match/,
    );
    assert.equal(
      (await db().deliveryCase.findUniqueOrThrow({ where: { id: item.id } }))
        .status,
      "REFUND_PENDING",
    );
    badAmount = false;
    await Promise.all([
      processRefund(client, item.id, provider),
      processRefund(developer, item.id, provider),
    ]);
    const refunded = await db().payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    assert.equal(refunded.status, "REFUNDED");
    assert(refunded.refundVerifiedAt);
    assert.equal(refunded.paypalCaptureId, payment.paypalCaptureId);
    assert.equal(posts, 2);
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: project.id } }))
        .status,
      "CANCELLED",
    );
    assert.equal(
      await db().activityLog.count({
        where: { projectId: project.id, action: "REFUND_VERIFIED" },
      }),
      1,
    );
    await processRefund(client, item.id, provider);
    await recordVerifiedOrder(payment.id, {}); // late capture reconciliation cannot overwrite refund
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "REFUNDED",
    );
    assert.equal(posts, 2);
  } finally {
    if (projectId) {
      await db().payment.deleteMany({ where: { milestone: { projectId } } });
      await db().project.delete({ where: { id: projectId } });
    }
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().$disconnect();
  }
});
