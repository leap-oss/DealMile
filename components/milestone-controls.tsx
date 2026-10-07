"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { milestoneAction, type WorkState } from "@/app/projects/work-actions";
import { Button } from "@/components/ui/button";
export function MilestoneControls({
  id,
  status,
  developer,
}: {
  id: string;
  status: string;
  developer: boolean;
}) {
  const [state, action, pending] = useActionState<WorkState, FormData>(
    milestoneAction,
    {},
  );
  if (!(developer ? ["FUNDED", "IN_PROGRESS"] : ["SUBMITTED"]).includes(status))
    return null;
  return (
    <form action={action} className="milestone-controls">
      <input name="milestoneId" type="hidden" value={id} />
      <fieldset disabled={pending}>
        {developer && status === "IN_PROGRESS" && (
          <div className="form-field">
            <label htmlFor={`submission-${id}`}>Delivered work</label>
            <textarea
              id={`submission-${id}`}
              name="note"
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              placeholder="Describe what was delivered and include review links."
            />
          </div>
        )}
        <div className="work-buttons">
          <Button
            name="action"
            value={
              developer
                ? status === "FUNDED"
                  ? "start"
                  : "submit"
                : "complete"
            }
            size="small"
          >
            {pending && <LoaderCircle size={14} className="spin" />}
            {developer
              ? status === "FUNDED"
                ? "Start milestone"
                : "Submit work"
              : "Approve work"}
          </Button>
          {!developer && (
            <Button
              name="action"
              value="revision"
              variant="outline"
              size="small"
            >
              Request work revision
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
