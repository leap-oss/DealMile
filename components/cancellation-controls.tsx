"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { cancelProject, type WorkState } from "@/app/projects/work-actions";
import { Button } from "./ui/button";
export function CancellationControls({
  projectId,
  requestId,
  mode,
}: {
  projectId: string;
  requestId?: string;
  mode: "request" | "review" | "withdraw" | "refund";
}) {
  const [state, action, pending] = useActionState<WorkState, FormData>(
    cancelProject,
    {},
  );
  const id = `cancellation-${requestId ?? projectId}-${mode}`;
  return (
    <form action={action} className="delivery-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="requestId" value={requestId ?? ""} />
      <fieldset disabled={pending}>
        {mode !== "refund" && (
          <div className="form-field">
            <label htmlFor={id}>
              {mode === "review"
                ? "Reason if declining"
                : mode === "withdraw"
                  ? "Withdrawal reason"
                  : "Cancellation reason"}
            </label>
            <textarea
              id={id}
              name="reason"
              rows={3}
              minLength={10}
              maxLength={3000}
              required={mode !== "review"}
            />
          </div>
        )}
        {mode === "review" && (
          <label className="cancellation-consent">
            <input type="checkbox" name="consent" value="yes" required />I agree
            to cancel unfinished work under the displayed settlement. Completed
            work is retained; any listed refund requires PayPal verification.
          </label>
        )}
        <div className="work-buttons">
          <Button
            variant={mode === "withdraw" ? "outline" : "danger"}
            size="small"
            name="action"
            value={
              mode === "review"
                ? "approve"
                : mode === "refund"
                  ? "refund"
                  : mode
            }
          >
            {pending && <LoaderCircle size={14} className="spin" />}
            {mode === "request"
              ? "Request project cancellation"
              : mode === "review"
                ? "Approve cancellation settlement"
                : mode === "refund"
                  ? "Process / verify agreed refund"
                  : "Withdraw cancellation request"}
          </Button>
          {mode === "review" && (
            <Button
              variant="outline"
              size="small"
              name="action"
              value="reject"
              formNoValidate
            >
              Decline cancellation
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
