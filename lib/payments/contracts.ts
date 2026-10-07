import { z } from "zod";
const amount = z.object({
  currency_code: z.string().length(3),
  value: z.string().regex(/^\d+\.\d{2}$/),
});
export const orderSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{10,40}$/),
  status: z.string(),
  intent: z.literal("CAPTURE"),
  purchase_units: z
    .array(
      z.object({
        reference_id: z.string(),
        custom_id: z.string(),
        amount,
        payee: z.object({
          merchant_id: z.string().min(1),
          email_address: z.string().optional(),
        }),
        payments: z
          .object({
            captures: z.array(
              z.object({
                id: z.string().min(1),
                status: z.string(),
                amount,
                final_capture: z.boolean().optional(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .length(1),
  links: z
    .array(z.object({ href: z.string().url(), rel: z.string() }))
    .optional(),
});
export type PayPalOrder = z.infer<typeof orderSchema>;
export type ExpectedPayment = {
  id: string;
  milestoneId: string;
  amount: string;
  currency: string;
  paypalOrderId: string | null;
  paypalPayeeId: string | null;
};
function cents(value: string) {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error("Invalid financial amount.");
  const n = Number(value.replace(".", ""));
  if (!Number.isSafeInteger(n))
    throw new Error("Financial amount is out of range.");
  return n;
}
export function verifyOrderAssociation(raw: unknown, payment: ExpectedPayment) {
  const order = orderSchema.parse(raw);
  const unit = order.purchase_units[0];
  if (
    order.id !== payment.paypalOrderId ||
    unit.reference_id !== payment.milestoneId ||
    unit.custom_id !== payment.id ||
    unit.payee.merchant_id !== payment.paypalPayeeId ||
    unit.amount.currency_code !== payment.currency ||
    cents(unit.amount.value) !== cents(payment.amount)
  )
    throw new Error("Payment verification mismatch.");
  return order;
}
export function verifyOrderCapture(raw: unknown, payment: ExpectedPayment) {
  const order = verifyOrderAssociation(raw, payment);
  const captures = order.purchase_units[0].payments?.captures ?? [];
  if (order.status !== "COMPLETED" || captures.length !== 1)
    throw new Error("Payment is not fully captured.");
  const capture = captures[0];
  if (
    capture.status !== "COMPLETED" ||
    capture.final_capture !== true ||
    capture.amount.currency_code !== payment.currency ||
    cents(capture.amount.value) !== cents(payment.amount)
  )
    throw new Error("Capture verification mismatch.");
  return capture;
}
