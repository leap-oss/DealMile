import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPayPal } from "@/lib/payments/paypal";
import { recordVerifiedOrder } from "@/lib/payments/service";
export const runtime = "nodejs";
const eventSchema = z.object({
  id: z.string().min(1).max(100),
  event_type: z.string().min(1),
  resource: z.unknown(),
});
export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    console.info(
      "[PayPal Sandbox] Webhook confirmation is not configured; incoming webhook was not accepted.",
    );
    return new Response("Webhook confirmation is not configured", {
      status: 503,
    });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 200000)
    return new Response("Payload too large", { status: 413 });
  const text = await request.text();
  if (Buffer.byteLength(text) > 200000)
    return new Response("Payload too large", { status: 413 });
  let event: unknown;
  try {
    event = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) return new Response("Invalid event", { status: 400 });
  try {
    const paypal = getPayPal();
    if (!(await paypal.verifyWebhook(request.headers, event, webhookId)))
      return new Response("Invalid signature", { status: 401 });
    if (await db().webhookEvent.findUnique({ where: { id: parsed.data.id } }))
      return Response.json({ received: true });
    if (parsed.data.event_type !== "PAYMENT.CAPTURE.COMPLETED")
      return Response.json({ received: true });
    const capture = z
      .object({
        id: z.string().min(1),
        status: z.literal("COMPLETED"),
        supplementary_data: z.object({
          related_ids: z.object({
            order_id: z.string().regex(/^[A-Z0-9]{10,40}$/),
          }),
        }),
      })
      .parse(parsed.data.resource);
    const payment = await db().payment.findUnique({
      where: { paypalOrderId: capture.supplementary_data.related_ids.order_id },
      include: { milestone: { select: { projectId: true } } },
    });
    if (!payment) return Response.json({ received: true });
    const order = await paypal.getOrder(payment.paypalOrderId!);
    await recordVerifiedOrder(payment.id, order, {
      id: parsed.data.id,
      captureId: capture.id,
    });
    revalidatePath(`/projects/${payment.milestone.projectId}`);
    revalidatePath(`/projects/${payment.milestone.projectId}/payment`);
    revalidatePath(`/developer/projects/${payment.milestone.projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/developer");
    return Response.json({ received: true });
  } catch {
    return new Response("Webhook verification failed; retry delivery", {
      status: 500,
    });
  }
}
