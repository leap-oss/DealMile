import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getPayPal, PaymentError } from "./paypal";
import { verifyOrderCapture, verifyOrderAssociation } from "./contracts";
import { paymentOperation } from "./operation";
export async function prepareOrder(userId: string, milestoneId: string) {
  const milestone = await db().milestone.findFirst({
    where: { id: milestoneId, project: { clientId: userId } },
    select: { projectId: true },
  });
  if (!milestone)
    throw new PaymentError("This milestone is not available to your account.");
  return paymentOperation(milestone.projectId, userId, false, () =>
    prepareReservedOrder(userId, milestoneId),
  );
}
async function prepareReservedOrder(userId: string, milestoneId: string) {
  const paypal = getPayPal();
  const milestone = await db().milestone.findFirst({
    where: {
      id: milestoneId,
      project: { clientId: userId, status: { in: ["AGREED", "ACTIVE"] } },
    },
    include: { project: true },
  });
  if (!milestone || milestone.status !== "AWAITING_PAYMENT")
    throw new PaymentError("This milestone is not awaiting payment.");
  if (milestone.project.paymentHold)
    throw new PaymentError(
      "Payments are paused while this project's delivery case is open.",
    );
  const payment = await db().payment.upsert({
    where: { milestoneId },
    create: {
      milestoneId,
      amount: milestone.amount,
      currency: milestone.project.currency,
    },
    update: {},
  });
  if (payment.status === "CAPTURED")
    return `${getEnv().APP_URL}/projects/${milestone.projectId}/payment?token=${payment.paypalOrderId}`;
  if (payment.status !== "CREATED")
    throw new PaymentError(
      "This payment needs review before another payment can be made.",
    );
  const order = payment.paypalOrderId
    ? await paypal.getOrder(payment.paypalOrderId)
    : await paypal.createOrder({
        paymentId: payment.id,
        milestoneId,
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        title: milestone.title,
        requestKey: payment.requestKey,
        returnUrl: `${getEnv().APP_URL}/projects/${milestone.projectId}/payment`,
        cancelUrl: `${getEnv().APP_URL}/projects/${milestone.projectId}/payment?cancelled=1`,
      });
  const unit = order.purchase_units[0];
  if (
    unit.custom_id !== payment.id ||
    unit.reference_id !== milestoneId ||
    unit.amount.value !== payment.amount.toFixed(2) ||
    unit.amount.currency_code !== payment.currency
  )
    throw new PaymentError(
      "PayPal order details did not match this milestone.",
    );
  if (payment.paypalPayeeId && payment.paypalPayeeId !== unit.payee.merchant_id)
    throw new PaymentError("PayPal recipient did not match this order.");
  await db().payment.update({
    where: { id: payment.id },
    data: { paypalOrderId: order.id, paypalPayeeId: unit.payee.merchant_id },
  });
  if (order.status === "COMPLETED" || order.status === "APPROVED")
    return `${getEnv().APP_URL}/projects/${milestone.projectId}/payment?token=${order.id}`;
  const approval = order.links?.find(
    (l) => l.rel === "payer-action" || l.rel === "approve",
  )?.href;
  if (
    !approval ||
    new URL(approval).hostname !== "www.sandbox.paypal.com" ||
    new URL(approval).protocol !== "https:"
  )
    throw new PaymentError(
      "PayPal did not return a valid Sandbox checkout link.",
    );
  return approval;
}
export async function recordVerifiedOrder(
  paymentId: string,
  order: unknown,
  event?: { id: string; captureId: string },
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db().$transaction(
        async (tx) => {
          if (
            event &&
            (await tx.webhookEvent.findUnique({ where: { id: event.id } }))
          )
            return;
          const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { milestone: { include: { project: true } } },
          });
          if (!payment) throw new PaymentError("Payment not found.");
          // A delayed capture webhook must never undo an authoritative refund.
          if (payment.status === "REFUNDED") return;
          let capture;
          try {
            capture = verifyOrderCapture(order, {
              ...payment,
              amount: payment.amount.toFixed(2),
            });
          } catch {
            throw new PaymentError(
              "The captured payment did not match the approved milestone.",
            );
          }
          if (event && capture.id !== event.captureId)
            throw new PaymentError("Webhook capture did not match the order.");
          if (payment.paypalCaptureId && payment.paypalCaptureId !== capture.id)
            throw new PaymentError(
              "This order already has a different capture.",
            );
          if (event)
            await tx.webhookEvent.create({
              data: { id: event.id, type: "PAYMENT.CAPTURE.COMPLETED" },
            });
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "CAPTURED",
              paypalCaptureId: capture.id,
              verifiedAt: payment.verifiedAt ?? new Date(),
              ...(event ? { webhookVerifiedAt: new Date() } : {}),
            },
          });
          // Only callers that read the order through the authenticated PayPal API
          // reach this path. A signed webhook is an additional reconciliation path.
          {
            const transitioned = await tx.milestone.updateMany({
              where: {
                id: payment.milestoneId,
                status: "AWAITING_PAYMENT",
                project: { status: { in: ["AGREED", "ACTIVE"] } },
              },
              data: {
                status: "FUNDED",
                dueAt: new Date(
                  (payment.verifiedAt ?? new Date()).getTime() +
                    payment.milestone.estimatedDays * 86400000,
                ),
              },
            });
            if (transitioned.count)
              await tx.activityLog.create({
                data: {
                  projectId: payment.milestone.projectId,
                  actorId: payment.milestone.project.clientId,
                  action: "PAYMENT_VERIFIED",
                  description: `PayPal Sandbox verified payment for “${payment.milestone.title}”. Milestone funded.`,
                },
              });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // Concurrent capture requests or duplicate webhook deliveries can conflict.
      // Retry the transaction, where persisted capture/event IDs prevent duplicates.
      if (
        attempt < 4 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 30 * 2 ** attempt));
        continue;
      }
      throw error;
    }
  }
}
export async function capturePayment(userId: string, orderId: string) {
  const payment = await db().payment.findFirst({
    where: {
      paypalOrderId: orderId,
      milestone: { project: { clientId: userId } },
    },
    select: { milestone: { select: { projectId: true } } },
  });
  if (!payment)
    throw new PaymentError("This payment is not available to your account.");
  return paymentOperation(payment.milestone.projectId, userId, true, () =>
    captureReservedPayment(userId, orderId),
  );
}
async function captureReservedPayment(userId: string, orderId: string) {
  const payment = await db().payment.findFirst({
    where: {
      paypalOrderId: orderId,
      milestone: {
        project: { clientId: userId, status: { in: ["AGREED", "ACTIVE"] } },
      },
    },
    include: { milestone: { include: { project: true } } },
  });
  if (!payment)
    throw new PaymentError("This payment is not available to your account.");
  if (payment.status === "REFUNDED")
    throw new PaymentError("This payment has already been refunded.");
  const paypal = getPayPal();
  let order = await paypal.getOrder(orderId);
  try {
    verifyOrderAssociation(order, {
      ...payment,
      amount: payment.amount.toFixed(2),
    });
  } catch {
    throw new PaymentError(
      "PayPal order details do not match the agreed milestone. Nothing was captured.",
    );
  }
  if (order.status !== "COMPLETED") {
    if (payment.milestone.project.paymentHold)
      throw new PaymentError(
        "New captures are paused while the delivery case is open.",
      );
    if (order.status !== "APPROVED")
      throw new PaymentError(
        "Approve this order in PayPal Sandbox before confirming payment.",
      );
    try {
      order = await paypal.captureOrder(orderId, payment.requestKey);
    } catch (error) {
      // A capture may have succeeded even when its response was lost.
      order = await paypal.getOrder(orderId);
      if (order.status !== "COMPLETED") throw error;
    }
  }
  await recordVerifiedOrder(payment.id, order);
  return payment.milestoneId;
}
