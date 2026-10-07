import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import {
  cancellationAction,
  refundCancellation,
} from "../../lib/cancellations/service";
import { mutateMilestone } from "../../lib/milestones/service";
import { mutateProject } from "../../lib/projects/service";
test("bilateral cancellation enforces ownership, other-party consent and authoritative refund", async () => {
  const prefix = `cancel-${Date.now()}`,
    users: string[] = [],
    projects: string[] = [];
  try {
    const account = async (role: "CLIENT" | "DEVELOPER", name: string) => {
      const u = await db().user.create({
        data: {
          name,
          email: `${prefix}-${name}@example.com`,
          passwordHash: "unused",
          role,
        },
      });
      users.push(u.id);
      return u;
    };
    const client = await account("CLIENT", "client"),
      developer = await account("DEVELOPER", "dev"),
      stranger = await account("CLIENT", "stranger");
    const project = async (funded: boolean) => {
      const p = await db().project.create({
        data: {
          name: "Cancellation fixture",
          type: "Website",
          requirements: "Deliver a website",
          budget: 150,
          deadline: new Date("2028-12-31"),
          clientId: client.id,
          developerId: developer.id,
          status: funded ? "ACTIVE" : "AGREED",
          milestones: {
            create: [
              {
                title: "Implementation",
                description: "Build implementation",
                amount: 100,
                estimatedDays: 3,
                position: 0,
                status: funded ? "IN_PROGRESS" : "AWAITING_PAYMENT",
                dueAt: funded ? new Date("2028-11-01") : null,
              },
              {
                title: "Polish",
                description: "Polish implementation",
                amount: 50,
                estimatedDays: 2,
                position: 1,
              },
            ],
          },
        },
        include: { milestones: { orderBy: { position: "asc" } } },
      });
      projects.push(p.id);
      return p;
    };
    const unpaid = await project(false);
    await assert.rejects(
      cancellationAction(stranger, unpaid.id, "request", {
        reason: "This is not my project",
      }),
    );
    await cancellationAction(client, unpaid.id, "request", {
      reason: "Our requirements have changed significantly",
    });
    let request = await db().cancellationRequest.findFirstOrThrow({
      where: { projectId: unpaid.id, status: "PENDING" },
    });
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: unpaid.id } }))
        .status,
      "AGREED",
    );
    await assert.rejects(
      cancellationAction(client, unpaid.id, "approve", {
        requestId: request.id,
      }),
    );
    await assert.rejects(
      cancellationAction(stranger, unpaid.id, "approve", {
        requestId: request.id,
      }),
    );
    await assert.rejects(mutateProject(developer, unpaid.id, "accept"));
    await cancellationAction(developer, unpaid.id, "reject", {
      requestId: request.id,
      reason: "We should revise the scope instead",
    });
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: unpaid.id } }))
        .paymentHold,
      false,
    );
    await cancellationAction(developer, unpaid.id, "request", {
      reason: "I cannot commit to this delivery window",
    });
    request = await db().cancellationRequest.findFirstOrThrow({
      where: { projectId: unpaid.id, status: "PENDING" },
    });
    await assert.rejects(
      cancellationAction(client, unpaid.id, "withdraw", {
        requestId: request.id,
        reason: "Cannot withdraw another person's request",
      }),
    );
    await cancellationAction(developer, unpaid.id, "withdraw", {
      requestId: request.id,
      reason: "We have agreed to discuss alternatives",
    });
    await cancellationAction(developer, unpaid.id, "request", {
      reason: "We both agree that the project should end",
    });
    request = await db().cancellationRequest.findFirstOrThrow({
      where: { projectId: unpaid.id, status: "PENDING" },
    });
    await Promise.all([
      cancellationAction(client, unpaid.id, "approve", {
        requestId: request.id,
      }),
      cancellationAction(client, unpaid.id, "approve", {
        requestId: request.id,
      }),
    ]);
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: unpaid.id } }))
        .status,
      "CANCELLED",
    );
    assert.equal(
      await db().milestone.count({
        where: { projectId: unpaid.id, status: "CANCELLED" },
      }),
      2,
    );
    assert.equal(
      await db().activityLog.count({
        where: { projectId: unpaid.id, action: "CANCELLATION_APPROVED" },
      }),
      1,
    );
    const paid = await project(true);
    const delivered = await db().milestone.create({
      data: {
        projectId: paid.id,
        title: "Completed discovery",
        description: "Previously approved delivery",
        amount: 25,
        estimatedDays: 1,
        position: -1,
        status: "COMPLETED",
      },
    });
    const retainedPayment = await db().payment.create({
      data: {
        milestoneId: delivered.id,
        amount: 25,
        currency: "USD",
        status: "CAPTURED",
        paypalCaptureId: "CANCELDONECAP1234",
        paypalOrderId: "CANCELDONEORDER123",
        verifiedAt: new Date(),
      },
    });
    await db().project.update({
      where: { id: paid.id },
      data: { budget: 175 },
    });
    // Isolated provider fixture, never a real refund of the user's Sandbox payment.
    const payment = await db().payment.create({
      data: {
        milestoneId: paid.milestones[0].id,
        amount: 100,
        currency: "USD",
        status: "CAPTURED",
        paypalOrderId: "CANCELORDER123456",
        paypalCaptureId: "CANCELCAPTURE1234",
        verifiedAt: new Date(),
      },
    });
    await cancellationAction(developer, paid.id, "request", {
      reason: "I need to withdraw and return unfinished work funds",
    });
    const paidRequest = await db().cancellationRequest.findFirstOrThrow({
      where: { projectId: paid.id, status: "PENDING" },
    });
    assert.equal(
      (paidRequest.settlement as { retainedAmount: string }).retainedAmount,
      "25.00",
    );
    await assert.rejects(refundCancellation(developer, paidRequest.id));
    await assert.rejects(
      mutateMilestone(
        developer,
        paid.milestones[0].id,
        "submit",
        "Work should stay paused until agreement",
      ),
    );
    await cancellationAction(client, paid.id, "approve", {
      requestId: paidRequest.id,
    });
    assert.equal(
      (await db().project.findUniqueOrThrow({ where: { id: paid.id } })).status,
      "ACTIVE",
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "CAPTURED",
    );
    let completed = false,
      posts = 0;
    const result = () => ({
      id: "CANCELREFUND12345",
      status: completed ? "COMPLETED" : "PENDING",
      amount: { value: "100.00", currency_code: "USD" },
      links: [
        {
          rel: "up",
          href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CANCELCAPTURE1234",
        },
      ],
    });
    const provider = {
      refundCapture: async () => {
        posts++;
        return result();
      },
      getRefund: async () => result(),
    };
    await assert.rejects(
      refundCancellation(stranger, paidRequest.id, provider),
    );
    await assert.rejects(refundCancellation(client, paidRequest.id, provider));
    assert.equal(
      (
        await db().cancellationRequest.findUniqueOrThrow({
          where: { id: paidRequest.id },
        })
      ).status,
      "REFUND_PENDING",
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "CAPTURED",
    );
    completed = true;
    await refundCancellation(developer, paidRequest.id, provider);
    await refundCancellation(client, paidRequest.id, provider);
    assert.equal(posts, 1);
    const final = await db().project.findUniqueOrThrow({
      where: { id: paid.id },
    });
    assert.equal(final.status, "CANCELLED");
    assert.equal(final.paymentHold, false);
    assert.equal(
      (await db().milestone.findUniqueOrThrow({ where: { id: delivered.id } }))
        .status,
      "COMPLETED",
    );
    assert.equal(
      (
        await db().payment.findUniqueOrThrow({
          where: { id: retainedPayment.id },
        })
      ).status,
      "CAPTURED",
    );
    assert.equal(
      (
        await db().cancellationRequest.findUniqueOrThrow({
          where: { id: paidRequest.id },
        })
      ).status,
      "APPROVED",
    );
    assert.equal(
      (await db().payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
      "REFUNDED",
    );
    const checkout = await project(false);
    await db().payment.create({
      data: {
        milestoneId: checkout.milestones[0].id,
        amount: 100,
        currency: "USD",
        paypalOrderId: "CHECKOUTORDER12345",
      },
    });
    await assert.rejects(
      cancellationAction(client, checkout.id, "request", {
        reason: "This order has not yet been reconciled",
      }),
    );
  } finally {
    await db().payment.deleteMany({
      where: { milestone: { projectId: { in: projects } } },
    });
    await db().project.deleteMany({ where: { id: { in: projects } } });
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().$disconnect();
  }
});
