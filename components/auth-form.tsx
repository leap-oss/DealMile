"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { login, register, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
export function AuthForm({
  mode,
  defaultRole = "CLIENT",
}: {
  mode: "login" | "register";
  defaultRole?: "CLIENT" | "DEVELOPER";
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    {},
  );
  const [visible, setVisible] = useState(false);
  const signUp = mode === "register";
  const role = state.values?.role ?? defaultRole;
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const firstError = ["name", "role", "email", "password"].find(
      (key) => state.fields?.[key]?.length,
    );
    if (firstError)
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${firstError}"]`)
        ?.focus();
  }, [state.fields]);
  function describedBy(name: string, hint?: string) {
    return (
      [hint, state.fields?.[name]?.length ? `${name}-error` : undefined]
        .filter(Boolean)
        .join(" ") || undefined
    );
  }
  function fieldError(name: string) {
    return state.fields?.[name]?.[0] ? (
      <span id={`${name}-error`} className="field-error">
        {state.fields[name]?.[0]}
      </span>
    ) : null;
  }
  return (
    <form ref={form} action={action} className="auth-form" aria-busy={pending}>
      <fieldset disabled={pending}>
        {signUp && (
          <>
            <fieldset
              key={role}
              className="auth-role-choice"
              aria-describedby={describedBy("role", "role-hint")}
            >
              <legend>I’m joining as a</legend>
              <div className="role-options">
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="CLIENT"
                    defaultChecked={role === "CLIENT"}
                  />
                  <span>
                    <BriefcaseBusiness size={20} aria-hidden="true" />
                    <strong>Client</strong>
                    <small>Plan and review work</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="DEVELOPER"
                    defaultChecked={role === "DEVELOPER"}
                  />
                  <span>
                    <Code2 size={20} aria-hidden="true" />
                    <strong>Developer</strong>
                    <small>Review and deliver work</small>
                  </span>
                </label>
              </div>
              <p id="role-hint" className="field-hint auth-role-hint">
                Your role is fixed after registration.
              </p>
              {fieldError("role")}
            </fieldset>
            <div className="form-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                defaultValue={state.values?.name ?? ""}
                autoComplete="name"
                placeholder="e.g. Alex Morgan"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={!!state.fields?.name}
                aria-describedby={describedBy("name")}
              />
              {fieldError("name")}
            </div>
          </>
        )}
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            defaultValue={state.values?.email ?? ""}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            aria-invalid={!!state.fields?.email}
            aria-describedby={describedBy("email")}
          />
          {fieldError("email")}
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={signUp ? "new-password" : "current-password"}
              required
              minLength={signUp ? 12 : 1}
              maxLength={128}
              aria-invalid={!!state.fields?.password}
              aria-describedby={describedBy(
                "password",
                signUp ? "password-hint" : undefined,
              )}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-controls="password"
              aria-pressed={visible}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {signUp && (
            <small id="password-hint" className="field-hint">
              Use 12 or more characters. A passphrase works well.
            </small>
          )}
          {fieldError("password")}
        </div>
        {state.error && (
          <div className="form-error" role="alert">
            {state.error}
            {state.error === "Email or password is incorrect." && (
              <p>Check your email and password, then try again.</p>
            )}
          </div>
        )}
        <Button type="submit" className="auth-submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle size={17} className="spin" aria-hidden="true" />
              {signUp ? "Creating your account…" : "Signing you in…"}
            </>
          ) : (
            <>
              {signUp ? "Create account" : "Log in"}
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </Button>
      </fieldset>
      <p className="auth-form-status" role="status">
        {pending ? (signUp ? "Creating your account…" : "Signing you in…") : ""}
      </p>
      <p className="auth-switch">
        {signUp ? "Already have an account?" : "New to DealMile?"}{" "}
        <Link href={signUp ? "/login" : "/register"}>
          {signUp ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
