"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { deliveryAction, type WorkState } from "@/app/projects/work-actions";
import { Button } from "@/components/ui/button";
type Props = {
  milestoneId: string;
  mode:
    | "extension"
    | "extension_review"
    | "report"
    | "proposal"
    | "proposal_review"
    | "withdraw"
    | "refund";
  recordId?: string;
};
export function DeliveryControls({ milestoneId, mode, recordId }: Props) {
  const [state, action, pending] = useActionState<WorkState, FormData>(
    deliveryAction,
    {},
  );
  const reason = ["extension", "report", "proposal", "withdraw"].includes(mode);
  const date = mode === "extension" || mode === "proposal";
  const primary = {
    extension: ["request_extension", "Request deadline extension"],
    extension_review: ["approve_extension", "Approve extension"],
    report: ["open_case", "Open delivery case"],
    proposal: ["propose_resolution", "Send resolution proposal"],
    proposal_review: ["approve_resolution", "Approve resolution"],
    withdraw: ["withdraw_case", "Withdraw delivery report"],
    refund: ["process_refund", "Process / verify agreed refund"],
  }[mode];
  const secondary =
    mode === "extension_review"
      ? ["reject_extension", "Reject extension"]
      : mode === "proposal_review"
        ? ["reject_resolution", "Reject resolution"]
        : null;
  return (
    <form action={action} className="delivery-form">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="recordId" value={recordId ?? ""} />
      <fieldset disabled={pending}>
        {mode === "proposal" && (
          <div className="form-field">
            <label htmlFor={`resolution-${recordId}`}>
              Proposed resolution
            </label>
            <select id={`resolution-${recordId}`} name="resolution">
              <option value="RESUME">Resume work with a new deadline</option>
              <option value="CANCEL_REMAINING">
                Cancel remaining unpaid milestones
              </option>
              <option value="REFUND">
                Full refund of this milestone and cancel unpaid work
              </option>
            </select>
          </div>
        )}
        {date && (
          <div className="form-field">
            <label htmlFor={`date-${recordId ?? milestoneId}-${mode}`}>
              {mode === "extension"
                ? "Requested delivery date (UTC)"
                : "New deadline for resume (UTC)"}
            </label>
            <input
              id={`date-${recordId ?? milestoneId}-${mode}`}
              type="date"
              name="date"
              required={mode === "extension"}
            />
            <span className="field-hint">
              {mode === "proposal"
                ? "A future date is required when resuming work."
                : "The existing deadline remains in effect until client approval."}
            </span>
          </div>
        )}
        {reason && (
          <div className="form-field">
            <label htmlFor={`reason-${recordId ?? milestoneId}-${mode}`}>
              {mode === "report"
                ? "Delivery problem"
                : mode === "proposal"
                  ? "Resolution explanation"
                  : mode === "withdraw"
                    ? "Withdrawal explanation"
                    : "Extension reason"}
            </label>
            <textarea
              id={`reason-${recordId ?? milestoneId}-${mode}`}
              name="reason"
              required
              minLength={10}
              maxLength={3000}
              rows={3}
            />
          </div>
        )}
        {mode === "report" && (
          <div className="form-field">
            <label htmlFor={`evidence-${milestoneId}`}>
              Evidence and contact attempts
            </label>
            <textarea
              id={`evidence-${milestoneId}`}
              name="evidence"
              required
              minLength={10}
              maxLength={3000}
              rows={3}
              placeholder="Describe missing deliverables, messages and relevant review links."
            />
            <span className="field-hint">
              Opening a case pauses new payments and milestone approvals. It
              does not issue a refund.
            </span>
          </div>
        )}
        <div className="work-buttons">
          <Button
            name="action"
            value={primary[0]}
            size="small"
            variant={
              mode === "report" || mode === "refund" ? "danger" : "outline"
            }
          >
            {pending && <LoaderCircle size={14} className="spin" />}
            {primary[1]}
          </Button>
          {secondary && (
            <Button
              name="action"
              value={secondary[0]}
              size="small"
              variant="outline"
              formNoValidate
            >
              {secondary[1]}
            </Button>
          )}
        </div>
      </fieldset>
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="action-success" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
