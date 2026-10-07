import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyOrderAssociation,
  verifyOrderCapture,
} from "../lib/payments/contracts";
import { PayPalProvider, getPayPal } from "../lib/payments/paypal";
const payment = {
  id: "payment-1",
  milestoneId: "milestone-1",
  amount: "150.00",
  currency: "USD",
  paypalOrderId: "PAYPALORDER1234",
  paypalPayeeId: "merchant-1",
};
const order = {
  id: payment.paypalOrderId,
  intent: "CAPTURE",
  status: "COMPLETED",
  purchase_units: [
    {
      reference_id: payment.milestoneId,
      custom_id: payment.id,
      amount: { currency_code: "USD", value: "150.00" },
      payee: { merchant_id: "merchant-1" },
      payments: {
        captures: [
          {
            id: "capture-1",
            status: "COMPLETED",
            final_capture: true,
            amount: { currency_code: "USD", value: "150.00" },
          },
        ],
      },
    },
  ],
};
test("payment verification rejects mismatched order, amount, currency, recipient and milestone", () => {
  assert.equal(verifyOrderCapture(order, payment).id, "capture-1");
  for (const changed of [
    { ...payment, amount: "151.00" },
    { ...payment, currency: "EUR" },
    { ...payment, paypalPayeeId: "other-merchant" },
    { ...payment, milestoneId: "other-milestone" },
    { ...payment, paypalOrderId: "OTHERORDER1234" },
  ])
    assert.throws(() => verifyOrderAssociation(order, changed));
  const incomplete = structuredClone(order);
  incomplete.purchase_units[0].payments.captures[0].final_capture = false;
  assert.throws(() => verifyOrderCapture(incomplete, payment));
  const altered = structuredClone(order);
  altered.purchase_units[0].payments.captures[0].amount.value = "149.00";
  assert.throws(() => verifyOrderCapture(altered, payment));
});
test("webhooks without signature headers cannot reach a trusted verification path", async () => {
  let calls = 0;
  const provider = new PayPalProvider("id", "secret", async () => {
    calls++;
    throw new Error("Should not call API");
  });
  assert.equal(
    await provider.verifyWebhook(new Headers(), {}, "webhook-id"),
    false,
  );
  assert.equal(calls, 0);
});

test("Sandbox provider does not require a configured webhook", () => {
  const saved = {
    id: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET,
    webhook: process.env.PAYPAL_WEBHOOK_ID,
  };
  try {
    process.env.PAYPAL_CLIENT_ID = "contract-test-id";
    process.env.PAYPAL_CLIENT_SECRET = "contract-test-secret";
    delete process.env.PAYPAL_WEBHOOK_ID;
    assert(getPayPal() instanceof PayPalProvider);
    process.env.PAYPAL_CLIENT_SECRET = "";
    assert.throws(() => getPayPal());
  } finally {
    for (const [key, value] of [
      ["PAYPAL_CLIENT_ID", saved.id],
      ["PAYPAL_CLIENT_SECRET", saved.secret],
      ["PAYPAL_WEBHOOK_ID", saved.webhook],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});

test("capture confirmation uses a new authenticated order read after capture", async () => {
  const calls: string[] = [];
  const provider = new PayPalProvider(
    "unit-client",
    "unit-secret",
    async (url, init) => {
      const path = new URL(String(url)).pathname;
      calls.push(`${init?.method ?? "GET"} ${path}`);
      if (path === "/v1/oauth2/token")
        return Response.json({ access_token: "unit-token", expires_in: 3600 });
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer unit-token",
      );
      if (path.endsWith("/capture")) {
        assert.equal(
          new Headers(init?.headers).get("PayPal-Request-Id"),
          "unit-request-capture",
        );
        return Response.json({
          ignored:
            "The capture POST alone is not trusted as the persisted verification",
        });
      }
      return Response.json(order);
    },
  );
  const verified = await provider.captureOrder(
    payment.paypalOrderId,
    "unit-request",
  );
  assert.equal(verifyOrderCapture(verified, payment).id, "capture-1");
  assert.deepEqual(calls, [
    "POST /v1/oauth2/token",
    `POST /v2/checkout/orders/${payment.paypalOrderId}/capture`,
    `GET /v2/checkout/orders/${payment.paypalOrderId}`,
  ]);
});

test("unconfigured webhook handler accepts no events", async () => {
  const saved = process.env.PAYPAL_WEBHOOK_ID;
  delete process.env.PAYPAL_WEBHOOK_ID;
  try {
    const { POST } = await import("../app/api/paypal/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    assert.equal(response.status, 503);
  } finally {
    if (saved === undefined) delete process.env.PAYPAL_WEBHOOK_ID;
    else process.env.PAYPAL_WEBHOOK_ID = saved;
  }
});

test("refund transport uses the Sandbox capture, persisted idempotency key and authenticated read", async () => {
  const calls: string[] = [];
  const provider = new PayPalProvider(
    "unit-client",
    "unit-secret",
    async (url, init) => {
      const endpoint = new URL(String(url));
      assert.equal(endpoint.origin, "https://api-m.sandbox.paypal.com");
      calls.push(`${init?.method ?? "GET"} ${endpoint.pathname}`);
      if (endpoint.pathname === "/v1/oauth2/token")
        return Response.json({ access_token: "unit-token", expires_in: 3600 });
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer unit-token",
      );
      if (init?.method === "POST") {
        assert.equal(
          endpoint.pathname,
          "/v2/payments/captures/CAPTURE12345678/refund",
        );
        assert.equal(
          new Headers(init.headers).get("PayPal-Request-Id"),
          "persisted-case-refund",
        );
        assert.deepEqual(JSON.parse(String(init.body)), {
          amount: { value: "100.00", currency_code: "USD" },
        });
      }
      return Response.json({ id: "REFUND12345678", status: "COMPLETED" });
    },
  );
  await provider.refundCapture(
    "CAPTURE12345678",
    "100.00",
    "USD",
    "persisted-case",
  );
  await provider.getRefund("REFUND12345678");
  assert.deepEqual(calls, [
    "POST /v1/oauth2/token",
    "POST /v2/payments/captures/CAPTURE12345678/refund",
    "GET /v2/payments/refunds/REFUND12345678",
  ]);
  await assert.rejects(() => provider.getRefund("../../capture"));
});
