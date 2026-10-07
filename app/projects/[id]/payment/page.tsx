import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  CaptureButton,
  AwaitCaptureConfirmation,
} from "@/components/payment-controls";
export const metadata = { title: "PayPal Sandbox payment" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; cancelled?: string }>;
}) {
  const user = await requireUser("CLIENT");
  const { id } = await params;
  const { token, cancelled } = await searchParams;
  const project = await db().project.findFirst({
    where: { id, clientId: user.id },
    select: { name: true, paymentHold: true },
  });
  if (!project) notFound();
  const payment = token
    ? await db().payment.findFirst({
        where: { paypalOrderId: token, milestone: { projectId: id } },
        include: { milestone: true },
      })
    : null;
  if (!cancelled && !payment) notFound();
  const checkoutCancelled = Boolean(cancelled) && !payment?.verifiedAt;
  const refunded =
    payment?.status === "REFUNDED" &&
    !!payment.refundVerifiedAt &&
    !!payment.paypalRefundId;
  const funded =
    payment?.status === "CAPTURED" &&
    !!payment.verifiedAt &&
    !!payment.paypalCaptureId &&
    ["FUNDED", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].includes(
      payment.milestone.status,
    );
  return (
    <WorkspaceShell user={user}>
      <Link className="back-link" href={`/projects/${id}`}>
        <ChevronLeft size={15} />
        Back to project
      </Link>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">PAYPAL SANDBOX · NO REAL MONEY</span>
          <h1>
            {checkoutCancelled
              ? "Checkout cancelled"
              : refunded
                ? "Refund confirmed"
                : funded
                  ? "Payment confirmed"
                  : "One last confirmation"}
            <span>.</span>
          </h1>
          <p>{project.name}</p>
        </div>
      </div>
      <section className="payment-confirm-panel">
        {checkoutCancelled ? (
          <>
            <h2>No payment is confirmed.</h2>
            <p>
              You can return to your milestone and resume checkout when you’re
              ready.
            </p>
          </>
        ) : (
          payment && (
            <>
              <div className="payment-receipt">
                <span>{payment.milestone.title}</span>
                <strong>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: payment.currency,
                  }).format(Number(payment.amount))}
                </strong>
              </div>
              <p className="payment-recipient">
                Sandbox recipient: {payment.paypalPayeeId}
              </p>
              {refunded ? (
                <div className="payment-confirmed">
                  <Check size={23} />
                  <div>
                    <strong>Full PayPal refund verified.</strong>
                    <p>
                      The server verified the refund. This milestone is
                      cancelled; your original payment history remains
                      available.
                    </p>
                  </div>
                </div>
              ) : funded ? (
                <div className="payment-confirmed">
                  <Check size={23} />
                  <div>
                    <strong>Milestone funded.</strong>
                    <p>
                      PayPal capture was verified directly by the server. Your
                      {project.paymentHold
                        ? "work is paused while the delivery case is open."
                        : "developer can progress the milestone."}
                    </p>
                  </div>
                </div>
              ) : project.paymentHold ? (
                <p className="form-error" role="status">
                  New captures are paused while the delivery case is open.
                  Return to the project to review the resolution.
                </p>
              ) : payment.status === "CAPTURED" ? (
                <AwaitCaptureConfirmation orderId={payment.paypalOrderId!} />
              ) : (
                <>
                  <p>
                    Confirm to capture the order you approved in PayPal Sandbox.
                    DealMile verifies the amount, currency, recipient, and
                    milestone before confirming payment.
                  </p>
                  <CaptureButton orderId={payment.paypalOrderId!} />
                </>
              )}
              <div className="payment-security">
                <ShieldCheck size={17} />
                <span>
                  PayPal handles payments. DealMile does not hold funds.
                </span>
              </div>
              <dl className="payment-identifiers">
                <div>
                  <dt>PayPal order</dt>
                  <dd>{payment.paypalOrderId}</dd>
                </div>
                {payment.paypalCaptureId && (
                  <div>
                    <dt>Capture</dt>
                    <dd>{payment.paypalCaptureId}</dd>
                  </div>
                )}
                {refunded && (
                  <div>
                    <dt>Verified refund</dt>
                    <dd>{payment.paypalRefundId}</dd>
                  </div>
                )}
              </dl>
            </>
          )
        )}
      </section>
    </WorkspaceShell>
  );
}
