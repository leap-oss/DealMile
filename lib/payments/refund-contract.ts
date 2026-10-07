import { z } from "zod";
export const refundSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{10,40}$/),
  status: z.enum(["COMPLETED", "PENDING", "FAILED", "CANCELLED"]),
  amount: z.object({
    value: z.string().regex(/^\d+\.\d{2}$/),
    currency_code: z.string().length(3),
  }),
  links: z.array(z.object({ rel: z.string(), href: z.string().url() })),
});
export function verifyRefund(
  raw: unknown,
  payment: {
    amount: { toFixed(n: number): string };
    currency: string;
    paypalCaptureId: string | null;
  },
) {
  const refund = refundSchema.parse(raw);
  if (
    refund.amount.value !== payment.amount.toFixed(2) ||
    refund.amount.currency_code !== payment.currency ||
    !refund.links.some(
      (l) =>
        l.rel === "up" &&
        [
          "https://api-m.sandbox.paypal.com",
          "https://api.sandbox.paypal.com",
        ].some(
          (origin) =>
            l.href ===
            `${origin}/v2/payments/captures/${payment.paypalCaptureId}`,
        ),
    )
  )
    throw new Error(
      "Refund did not match the verified capture, amount or currency.",
    );
  return refund;
}
