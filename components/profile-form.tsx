"use client";
import { useActionState, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/settings/actions";
import { Button } from "@/components/ui/button";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    {},
  );
  const [name, setName] = useState(currentName);
  const unchanged = name.trim() === currentName.trim();

  return (
    <form
      action={action}
      className="profile-edit-form"
      noValidate
      style={{
        marginTop: 20,
        paddingTop: 20,
        borderTop: "1px solid var(--border)",
      }}
    >
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label htmlFor="profile-full-name">Update full name</label>
          <input
            id="profile-full-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(state.fieldError)}
            aria-describedby={
              state.fieldError ? "profile-name-error" : "profile-name-hint"
            }
          />
          <span id="profile-name-hint" className="field-hint">
            Shown on project proposals, milestones, and agreement records.
          </span>
          {state.fieldError && (
            <span id="profile-name-error" className="field-error" role="alert">
              {state.fieldError}
            </span>
          )}
        </div>
        {state.error && (
          <div className="form-error" role="alert" style={{ marginBottom: 12 }}>
            {state.error}
          </div>
        )}
        {state.success && (
          <p
            className="action-success"
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--success)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <Check size={15} aria-hidden="true" /> {state.success}
          </p>
        )}
        <Button
          type="submit"
          size="small"
          disabled={pending || unchanged || name.trim().length < 2}
        >
          {pending ? (
            <>
              <LoaderCircle size={15} className="spin" /> Saving…
            </>
          ) : (
            "Save full name"
          )}
        </Button>
      </fieldset>
    </form>
  );
}
