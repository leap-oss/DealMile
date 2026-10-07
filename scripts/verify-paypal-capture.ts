import { db } from "../lib/db";
import { getPayPal } from "../lib/payments/paypal";
import { capturePayment } from "../lib/payments/service";
async function main() {
  const orderId = process.argv[2];
  if (!orderId) throw new Error("Supply the real PayPal Sandbox order ID.");
  const payment = await db().payment.findUniqueOrThrow({
    where: { paypalOrderId: orderId },
    include: { milestone: { include: { project: true } } },
  });
  const order = await getPayPal().getOrder(orderId);
  console.log(
    JSON.stringify({
      orderId,
      paypalStatus: order.status,
      milestoneStatus: payment.milestone.status,
    }),
  );
  if (!["APPROVED", "COMPLETED"].includes(order.status)) {
    console.log(
      "Buyer approval is required before server capture can continue.",
    );
    return;
  }
  await capturePayment(payment.milestone.project.clientId, orderId);
  const result = await db().payment.findUniqueOrThrow({
    where: { id: payment.id },
    include: { milestone: true },
  });
  console.log(
    JSON.stringify({
      orderId,
      captureId: result.paypalCaptureId,
      verifiedAt: result.verifiedAt,
      milestoneStatus: result.milestone.status,
    }),
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Capture verification failed",
    );
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
