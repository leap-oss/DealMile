"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import {
  payMilestone,
  confirmPayment,
  type PaymentState,
} from "@/app/projects/payment-actions";
import { Button } from "@/components/ui/button";
export function PayButton({ milestoneId }: { milestoneId: string }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(
    payMilestone,
    {},
  );
  return (
    <form action={action} className="pay-button">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <Button size="small" type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={13} />
        ) : (
          <LockKeyhole size={13} />
        )}{" "}
        {pending ? "Creating order…" : "Pay with PayPal"}
      </Button>
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function CaptureButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(
    confirmPayment,
    {},
  );
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle size={16} className="spin" />
            Verifying payment…
          </>
        ) : (
          <>
            Confirm payment <LockKeyhole size={16} />
          </>
        )}
      </Button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="capture-status" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
export function AwaitCaptureConfirmation({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  useEffect(() => {
    if (checks >= 20) return;
    const t = setTimeout(() => {
      router.refresh();
      setChecks((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [checks, router]);
  return (
    <div className="verification-wait" role="status">
      <LoaderCircle size={19} className="spin" />
      <p>
        {checks < 20
          ? "Waiting for server-verified PayPal capture confirmation…"
          : "Capture confirmation is taking longer than expected. Don’t pay again; use Confirm payment to retry server verification."}
      </p>
      <CaptureButton orderId={orderId} />
      <Button
        type="button"
        variant="outline"
        size="small"
        onClick={() => {
          setChecks(0);
          router.refresh();
        }}
      >
        Check again
      </Button>
    </div>
  );
}
