"use client";
import { useActionState } from "react";
import { projectAction, type ProjectFormState } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
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
