import { db } from "../lib/db";
import { prepareOrder } from "../lib/payments/service";
import { getPayPal } from "../lib/payments/paypal";
import { verifyOrderAssociation } from "../lib/payments/contracts";

// Uses the real Sandbox API and an existing agreed project; no seeded payment data.
async function main() {
  const projectId = process.argv[2];
  if (!projectId)
    throw new Error("Usage: npm run check:paypal -- <agreed-project-id>");
  const project = await db().project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      milestones: {
        where: { status: "AWAITING_PAYMENT" },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });
  const milestone = project.milestones[0];
  if (!milestone) throw new Error("No milestone is awaiting payment.");
  const checkoutUrl = await prepareOrder(project.clientId, milestone.id);
  const payment = await db().payment.findUniqueOrThrow({
    where: { milestoneId: milestone.id },
  });
  const order = await getPayPal().getOrder(payment.paypalOrderId!);
  verifyOrderAssociation(order, {
    ...payment,
    amount: payment.amount.toFixed(2),
  });
  console.log(
    JSON.stringify(
      {
        projectId,
        milestoneId: milestone.id,
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        paypalOrderId: order.id,
        paypalOrderStatus: order.status,
        associationVerified: true,
        checkoutUrl,
        returnPage: `/projects/${projectId}/payment?token=${order.id}`,
        webhookConfigured: !!process.env.PAYPAL_WEBHOOK_ID?.trim(),
        milestoneStatus: (
          await db().milestone.findUniqueOrThrow({
            where: { id: milestone.id },
          })
        ).status,
        nextStep:
          "Buyer must approve in the real PayPal Sandbox checkout, then confirm capture on the DealMile return page.",
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Sandbox checkout check failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
