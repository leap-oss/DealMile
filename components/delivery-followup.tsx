import type { DeadlineExtension, DeliveryCase } from "@prisma/client";
import { deliveryTiming, openCaseStatuses } from "@/lib/delivery/service";
import { DeliveryControls } from "./delivery-controls";
export function deliveryDate(date: Date) {
  return (
    date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}
export function DeliveryFollowup({
  milestoneId,
  status,
  dueAt,
  developer,
  hold,
  extensions,
  cases,
}: {
  milestoneId: string;
  status: string;
  dueAt: Date | null;
  developer: boolean;
  hold: boolean;
  extensions: DeadlineExtension[];
  cases: DeliveryCase[];
}) {
  const timing = deliveryTiming(status, dueAt);
  const active = ["FUNDED", "IN_PROGRESS", "SUBMITTED"].includes(status);
  const pendingExtension = extensions.find((e) => e.status === "PENDING");
  const openCase = cases.find((c) => openCaseStatuses.includes(c.status));
  return (
    <div className="delivery-followup">
      {dueAt && (
        <p className="delivery-deadline">
          <strong>Delivery due</strong>{" "}
          <time dateTime={dueAt.toISOString()}>{deliveryDate(dueAt)}</time>
          {timing && (
            <span className={`delivery-label ${timing.toLowerCase()}`}>
              {timing === "OVERDUE" ? "Overdue" : "Due within 48 hours"}
            </span>
          )}
          {status === "SUBMITTED" && (
            <span className="field-hint">
              Submitted · awaiting client review
            </span>
          )}
        </p>
      )}
      {pendingExtension && (
        <div className="delivery-record">
          <strong>Deadline extension awaiting client approval</strong>
          <p>Requested: {deliveryDate(pendingExtension.requestedDueAt)}</p>
          <p>{pendingExtension.reason}</p>
          {!developer && !hold && (
            <DeliveryControls
              milestoneId={milestoneId}
              recordId={pendingExtension.id}
              mode="extension_review"
            />
          )}
        </div>
      )}
      {active &&
        !hold &&
        developer &&
        !pendingExtension &&
        status !== "SUBMITTED" &&
        dueAt && (
          <details>
            <summary>Request more delivery time</summary>
            <DeliveryControls milestoneId={milestoneId} mode="extension" />
          </details>
        )}
      {active && !hold && !developer && (
        <details>
          <summary>Report a delivery problem</summary>
          <DeliveryControls milestoneId={milestoneId} mode="report" />
        </details>
      )}
      {cases.map((c) => (
        <article className="delivery-record" key={c.id}>
          <strong>
            Delivery case · {c.status.toLowerCase().replaceAll("_", " ")}
          </strong>
          <p>{c.reason}</p>
          <details>
            <summary>Evidence and contact attempts</summary>
            <p className="requirements-text">{c.evidence}</p>
          </details>
          {c.response && (
            <div>
              <strong>
                Developer proposal:{" "}
                {c.resolution?.toLowerCase().replaceAll("_", " ")}
              </strong>
              <p>{c.response}</p>
              {c.proposedDueAt && <p>{deliveryDate(c.proposedDueAt)}</p>}
            </div>
          )}
          {c.status === "OPEN" && developer && (
            <DeliveryControls
              milestoneId={milestoneId}
              recordId={c.id}
              mode="proposal"
            />
          )}
          {c.status === "OPEN" && !developer && (
            <p className="field-hint">
              If your developer remains unresponsive, this case keeps new
              payments paused.{" "}
              <a
                href="https://www.paypal.com/us/cshelp/article/how-do-i-open-a-dispute-with-a-seller-help160"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Read PayPal’s guidance for unresolved transactions.
              </a>{" "}
              This DealMile report does not open a PayPal dispute. Sandbox
              payments are test transactions.
            </p>
          )}
          {c.status === "PROPOSED" && !developer && (
            <>
              <p className="field-hint">
                {c.resolution === "REFUND"
                  ? "Approval authorizes a full PayPal refund of this milestone. Processing is a separate action; success requires server verification. Remaining unpaid work will be cancelled."
                  : c.resolution === "CANCEL_REMAINING"
                    ? "Only unpaid remaining work is cancelled. This funded milestone remains your developer's responsibility; previous payments are retained."
                    : "Approval changes this milestone's delivery deadline and resumes work."}
              </p>
              <DeliveryControls
                milestoneId={milestoneId}
                recordId={c.id}
                mode="proposal_review"
              />
            </>
          )}
          {c.status === "REFUND_PENDING" && (
            <>
              <p className="field-hint">
                Refund agreed; payment is still captured until PayPal confirms
                completion. Processing may need a verification retry.
              </p>
              <DeliveryControls
                milestoneId={milestoneId}
                recordId={c.id}
                mode="refund"
              />
            </>
          )}
          {!developer &&
            c.status !== "REFUND_PENDING" &&
            openCase?.id === c.id && (
              <details>
                <summary>Withdraw this report</summary>
                <DeliveryControls
                  milestoneId={milestoneId}
                  recordId={c.id}
                  mode="withdraw"
                />
              </details>
            )}
          {c.resolvedAt && (
            <p className="field-hint">
              Resolved {deliveryDate(c.resolvedAt)} ·{" "}
              {c.resolution?.toLowerCase().replaceAll("_", " ")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
