import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveryTiming } from "../lib/delivery/service";
import { verifyRefund } from "../lib/payments/refund-contract";
const now = new Date("2026-10-07T12:00:00Z");
test("delivery reminders distinguish work from client review and completed states", () => {
  assert.equal(
    deliveryTiming("IN_PROGRESS", new Date("2026-10-06T12:00:00Z"), now),
    "OVERDUE",
  );
  assert.equal(
    deliveryTiming("FUNDED", new Date("2026-10-09T12:00:00Z"), now),
    "DUE_SOON",
  );
  assert.equal(
    deliveryTiming("FUNDED", new Date("2026-10-10T12:00:00Z"), now),
    null,
  );
  for (const status of [
    "SUBMITTED",
    "COMPLETED",
    "CANCELLED",
    "LOCKED",
    "AWAITING_PAYMENT",
  ])
    assert.equal(deliveryTiming(status, new Date("2026-10-06"), now), null);
  assert.equal(deliveryTiming("FUNDED", null, now), null);
});
test("refunds must match capture, currency and full amount", () => {
  const payment = {
    amount: { toFixed: () => "100.00" },
    currency: "USD",
    paypalCaptureId: "CAPTURE12345678",
  };
  const raw = {
    id: "REFUND12345678",
    status: "COMPLETED",
    amount: { value: "100.00", currency_code: "USD" },
    links: [
      {
        rel: "up",
        href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE12345678",
      },
    ],
  };
  assert.equal(verifyRefund(raw, payment).status, "COMPLETED");
  assert.throws(() =>
    verifyRefund(
      { ...raw, amount: { value: "10.00", currency_code: "USD" } },
      payment,
    ),
  );
  assert.throws(() =>
    verifyRefund(
      { ...raw, amount: { value: "100.00", currency_code: "EUR" } },
      payment,
    ),
  );
  assert.throws(() => verifyRefund({ ...raw, links: [] }, payment));
  assert.throws(() =>
    verifyRefund(
      {
        ...raw,
        links: [
          {
            rel: "up",
            href: "https://attacker.example/v2/payments/captures/CAPTURE12345678",
          },
        ],
      },
      payment,
    ),
  );
  assert.throws(() =>
    verifyRefund(
      {
        ...raw,
        links: [
          {
            rel: "up",
            href: "https://api-m.sandbox.paypal.com/v2/payments/captures/OTHER12345678",
          },
        ],
      },
      payment,
    ),
  );
  assert.throws(() => verifyRefund({ ...raw, status: "APPROVED" }, payment));
});
