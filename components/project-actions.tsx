"use client";
import { useActionState, useState } from "react";
import {
  deleteProjectAction,
  projectAction,
  type ProjectFormState,
} from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Trash2 } from "lucide-react";
export function ProjectActions({
  id,
  actions,
}: {
  id: string;
  actions: { value: string; label: string; secondary?: boolean }[];
}) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(
    projectAction,
    {},
  );
  return (
    <form action={action} className="project-actions">
      <input name="projectId" value={id} type="hidden" />
      <div>
        {actions.map((a) => (
          <Button
            key={a.value}
            name="action"
            value={a.value}
            variant={
              a.value === "reject"
                ? "danger"
                : a.secondary
                  ? "outline"
                  : "default"
            }
            disabled={pending}
          >
            {pending && <LoaderCircle size={14} className="spin" />}
            {a.label}
          </Button>
        ))}
      </div>
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

export function DeleteProjectButton({
  id,
  projectName,
}: {
  id: string;
  projectName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(
    deleteProjectAction,
    {},
  );
  if (!confirming) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete project
      </Button>
    );
  }
  return (
    <form action={action} className="project-delete-confirm">
      <input name="projectId" value={id} type="hidden" />
      <div className="work-buttons" style={{ alignItems: "center" }}>
        <span className="field-hint" style={{ margin: 0 }}>
          Permanently delete <strong>{projectName}</strong>?
        </span>
        <Button type="submit" variant="danger" size="small" disabled={pending}>
          {pending ? (
            <LoaderCircle size={14} className="spin" />
          ) : (
            <Trash2 size={14} aria-hidden="true" />
          )}
          {pending ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="small"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
