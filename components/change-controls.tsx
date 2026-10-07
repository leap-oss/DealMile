"use client";
import { useActionState } from "react";
import { LoaderCircle, ScanLine } from "lucide-react";
import {
  requestChange,
  changeAction,
  type WorkState,
} from "@/app/projects/work-actions";
import { Button } from "@/components/ui/button";
export function ChangeRequestForm({
  projectId,
  retryId,
  description,
}: {
  projectId: string;
  retryId?: string;
  description?: string;
}) {
  const [state, action, pending] = useActionState<WorkState, FormData>(
    requestChange,
    {},
  );
  return (
    <form action={action} className="change-request-form">
      <fieldset disabled={pending}>
        <input type="hidden" name="projectId" value={projectId} />
        {retryId ? (
          <>
            <input type="hidden" name="retryId" value={retryId} />
            <input type="hidden" name="description" value={description} />
          </>
        ) : (
          <div className="form-field">
            <label htmlFor="change-description">New change request</label>
            <textarea
              id="change-description"
              name="description"
              required
              minLength={10}
              maxLength={5000}
              rows={3}
              placeholder="Describe the new functionality you need."
            />
            <small className="field-hint">
              AI compares this request with your agreement. It cannot approve
              pricing or charge you.
            </small>
          </div>
        )}
        <Button type="submit" variant="outline">
          {pending ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <ScanLine size={16} />
          )}
          {pending
            ? "Comparing scope with Gemini…"
            : retryId
              ? "Retry scope analysis"
              : "Analyze change request"}
        </Button>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
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
export function ChangeControls({
  id,
  status,
  developer,
  amount,
  days,
}: {
  id: string;
  status: string;
  developer: boolean;
  amount?: string;
  days?: number;
}) {
  const [state, action, pending] = useActionState<WorkState, FormData>(
    changeAction,
    {},
  );
  if (!(developer ? status === "DEVELOPER_REVIEW" : status === "CLIENT_REVIEW"))
    return null;
  return (
    <form action={action} className="change-controls">
      <input type="hidden" name="changeId" value={id} />
      <fieldset disabled={pending}>
        {developer ? (
          <>
            <div className="work-buttons">
              <Button
                name="action"
                value="included"
                variant="outline"
                formNoValidate
              >
                Included in scope
              </Button>
              <Button
                name="action"
                value="accept_free"
                variant="outline"
                formNoValidate
              >
                Accept without extra charge
              </Button>
              <Button
                name="action"
                value="reject"
                variant="danger"
                formNoValidate
              >
                Reject change
              </Button>
            </div>
            <details className="additional-proposal">
              <summary>Propose additional milestone</summary>
              <div className="form-field">
                <label htmlFor={`change-title-${id}`}>
                  Additional milestone title
                </label>
                <input
                  id={`change-title-${id}`}
                  name="title"
                  required
                  minLength={3}
                  maxLength={120}
                />
              </div>
              <div className="form-field">
                <label htmlFor={`change-deliverables-${id}`}>
                  Additional deliverables
                </label>
                <textarea
                  id={`change-deliverables-${id}`}
                  name="description"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor={`change-amount-${id}`}>
                    Additional amount (USD)
                  </label>
                  <input
                    id={`change-amount-${id}`}
                    name="amount"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`change-days-${id}`}>
                    Additional estimated days
                  </label>
                  <input
                    id={`change-days-${id}`}
                    name="estimatedDays"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    required
                  />
                </div>
              </div>
              <Button name="action" value="propose">
                {pending && <LoaderCircle className="spin" size={14} />}Send
                additional proposal
              </Button>
            </details>
          </>
        ) : (
          <div>
            <p className="field-hint">
              Approval adds ${amount} to the agreement and {days} estimated days
              of work. It does not charge your PayPal account. You fund the
              unlocked milestone separately.
            </p>
            <div className="work-buttons">
              <Button name="action" value="approve">
                {pending && <LoaderCircle className="spin" size={14} />}Approve
                additional milestone
              </Button>
              <Button name="action" value="decline" variant="danger">
                Decline additional proposal
              </Button>
            </div>
          </div>
        )}
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
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
