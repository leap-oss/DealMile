import "server-only";
import { z } from "zod";
import { orderSchema, type PayPalOrder } from "./contracts";
const BASE = "https://api-m.sandbox.paypal.com";
export class PaymentError extends Error {}
export class PayPalProvider {
  private token?: { value: string; expires: number };
  constructor(
    private clientId: string,
    private secret: string,
    private transport: typeof fetch = fetch,
  ) {}
  private async accessToken() {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const response = await this.transport(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new PaymentError(
        "Unable to connect to PayPal Sandbox. Check the server credentials.",
      );
    const value = z
      .object({
        access_token: z.string().min(1),
        expires_in: z.number().positive(),
      })
      .parse(await response.json());
    this.token = {
      value: value.access_token,
      expires: Date.now() + Math.max(0, value.expires_in - 60) * 1000,
    };
    return value.access_token;
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    requestId?: string,
  ) {
    try {
      const response = await this.transport(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${await this.accessToken()}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as {
          name?: string;
          debug_id?: string;
          details?: { issue?: string }[];
        };
        console.error("[PayPal Sandbox] API request failed", {
          status: response.status,
          method,
          path,
          name: failure.name,
          issue: failure.details?.[0]?.issue,
          debugId: failure.debug_id,
        });
        throw new PaymentError(
          "PayPal could not complete this request. No payment is confirmed; try again or review your Sandbox account.",
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        "PayPal verification is temporarily unavailable. Please retry; payment is not confirmed until verification succeeds.",
      );
    }
  }
  async createOrder(input: {
    paymentId: string;
    milestoneId: string;
    amount: string;
    currency: string;
    title: string;
    requestKey: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<PayPalOrder> {
    return orderSchema.parse(
      await this.request(
        "/v2/checkout/orders",
        "POST",
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: input.milestoneId,
              custom_id: input.paymentId,
              description: input.title.slice(0, 127),
              amount: { currency_code: input.currency, value: input.amount },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "DealMile",
                user_action: "CONTINUE",
                shipping_preference: "NO_SHIPPING",
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl,
              },
            },
          },
        },
        `${input.requestKey}-order`,
      ),
    );
  }
  async getOrder(id: string) {
    if (!/^[A-Z0-9]{10,40}$/.test(id))
      throw new PaymentError("Invalid PayPal order.");
    return orderSchema.parse(await this.request(`/v2/checkout/orders/${id}`));
  }
  async captureOrder(id: string, requestKey: string) {
    if (!/^[A-Z0-9]{10,40}$/.test(id))
      throw new PaymentError("Invalid PayPal order.");
    await this.request(
      `/v2/checkout/orders/${id}/capture`,
      "POST",
      {},
      `${requestKey}-capture`,
    );
    return this.getOrder(id);
  }
  async verifyWebhook(headers: Headers, event: unknown, webhookId: string) {
    const names = [
      "paypal-auth-algo",
      "paypal-cert-url",
      "paypal-transmission-id",
      "paypal-transmission-sig",
      "paypal-transmission-time",
    ];
    const values = names.map((n) => headers.get(n));
    if (values.some((v) => !v)) return false;
    const result = await this.request(
      "/v1/notifications/verify-webhook-signature",
      "POST",
      {
        auth_algo: values[0],
        cert_url: values[1],
        transmission_id: values[2],
        transmission_sig: values[3],
        transmission_time: values[4],
        webhook_id: webhookId,
        webhook_event: event,
      },
    );
    return (
      z
        .object({ verification_status: z.enum(["SUCCESS", "FAILURE"]) })
        .parse(result).verification_status === "SUCCESS"
    );
  }
  async refundCapture(
    captureId: string,
    amount: string,
    currency: string,
    requestKey: string,
  ) {
    if (!/^[A-Z0-9]{10,40}$/.test(captureId))
      throw new PaymentError("Invalid PayPal capture.");
    return this.request(
      `/v2/payments/captures/${captureId}/refund`,
      "POST",
      {
        amount: { value: amount, currency_code: currency },
      },
      `${requestKey}-refund`,
    );
  }
  async getRefund(id: string) {
    if (!/^[A-Z0-9]{10,40}$/.test(id))
      throw new PaymentError("Invalid PayPal refund.");
    return this.request(`/v2/payments/refunds/${id}`);
  }
}
let provider: PayPalProvider | undefined;
export function getPayPal() {
  if (
    !process.env.PAYPAL_CLIENT_ID?.trim() ||
    !process.env.PAYPAL_CLIENT_SECRET?.trim()
  )
    throw new PaymentError(
      "PayPal Sandbox isn’t configured yet. No payment has been collected.",
    );
  if (!provider && !process.env.PAYPAL_WEBHOOK_ID?.trim())
    console.info(
      "[PayPal Sandbox] Webhook confirmation is not configured. Payments require authoritative server-side capture verification.",
    );
  return (provider ??= new PayPalProvider(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET,
  ));
}
