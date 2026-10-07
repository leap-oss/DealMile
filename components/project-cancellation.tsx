import type {
  CancellationRequest,
  Milestone,
  Payment,
  Project,
} from "@prisma/client";
import { cancellationSettlement } from "@/lib/cancellations/service";
import { settlementSchema } from "@/lib/cancellations/contract";
import { CancellationControls } from "./cancellation-controls";
type Props = {
  project: Project & {
    milestones: (Milestone & { payments: Payment[] })[];
    cancellations: CancellationRequest[];
  };
  userId: string;
};
export function ProjectCancellation({ project, userId }: Props) {
  let settlement = null;
  let blockedReason = "";
  try {
    settlement = cancellationSettlement(project);
  } catch {
    blockedReason =
      "Reconcile the existing checkout or payment before requesting cancellation.";
  }
  const active = project.cancellations.find((r) =>
    ["PENDING", "REFUND_PENDING"].includes(r.status),
  );
  const eligible =
    [
      "PENDING_DEVELOPER_REVIEW",
      "DEVELOPER_REVIEW",
      "CLIENT_REVIEW",
      "AGREED",
      "ACTIVE",
    ].includes(project.status) && !!project.developerId;
  const canRequest = eligible && !project.paymentHold && !!settlement;
  if (!eligible && !project.cancellations.length) return null;
  const money = (amount: string, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      Number(amount),
    );
  return (
    <section className="editor-section project-cancellation">
      <h2>Project cancellation</h2>
      <p className="field-hint">
        Either party can request cancellation. The other party must approve. A
        request pauses new payments and milestone actions without cancelling or
        refunding the project.
      </p>
      {eligible && !canRequest && !active && (
        <p className="field-hint">
          {project.paymentHold
            ? "Resolve the open delivery case before requesting cancellation."
            : blockedReason}
        </p>
      )}
      {canRequest && settlement && (
        <details>
          <summary>Request cancellation by mutual agreement</summary>
          <p>
            Cancel unfinished work · refund{" "}
            {money(settlement.refundAmount, settlement.currency)} · retain{" "}
            {money(settlement.retainedAmount, settlement.currency)} for
            completed work.
          </p>
          <p className="field-hint">
            This settlement refunds the entire unfinished funded milestone.
            Completed milestones are retained. Different financial terms must be
            resolved before requesting cancellation.
          </p>
          <CancellationControls projectId={project.id} mode="request" />
        </details>
      )}
      {project.cancellations.map((request) => {
        const terms = settlementSchema.parse(request.settlement);
        const own = request.requestedById === userId;
        return (
          <article className="delivery-record" key={request.id}>
            <strong>
              Cancellation · {request.status.replaceAll("_", " ").toLowerCase()}
            </strong>
            <p>
              {own
                ? "You requested cancellation"
                : "The other party requested cancellation"}{" "}
              ·{" "}
              <time dateTime={request.createdAt.toISOString()}>
                {request.createdAt.toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </time>
            </p>
            <p className="requirements-text">{request.reason}</p>
            <p>
              Unfinished work refund:{" "}
              <strong>{money(terms.refundAmount, terms.currency)}</strong> ·
              Completed work retained:{" "}
              <strong>{money(terms.retainedAmount, terms.currency)}</strong>
            </p>
            {request.decisionNote && <p>{request.decisionNote}</p>}
            {request.status === "PENDING" && (
              <CancellationControls
                projectId={project.id}
                requestId={request.id}
                mode={own ? "withdraw" : "review"}
              />
            )}
            {request.status === "REFUND_PENDING" && (
              <>
                <p role="status">
                  Both parties agreed. The project remains paused until PayPal
                  authoritatively confirms the refund.
                </p>
                <CancellationControls
                  projectId={project.id}
                  requestId={request.id}
                  mode="refund"
                />
              </>
            )}
          </article>
        );
      })}
      {!active && project.status === "CANCELLED" && (
        <p className="action-success">
          Project cancelled by agreement. Financial and delivery history is
          retained.
        </p>
      )}
    </section>
  );
}
