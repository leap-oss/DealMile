"use client";
import { useActionState, useState } from "react";
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
  function fieldError(name: string) {
    return state.fields?.[name]?.[0] ? (
      <span id={`${name}-error`} className="field-error">
        {state.fields[name]?.[0]}
      </span>
    ) : null;
  }
  return (
    <form action={action} className="auth-form">
      <fieldset disabled={pending}>
        {signUp && (
          <>
            <div className="form-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                defaultValue={state.values?.name ?? ""}
                autoComplete="name"
                placeholder="Your full name"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={!!state.fields?.name}
                aria-describedby="name-error"
              />
              {fieldError("name")}
            </div>
            <div className="form-field">
              <span className="field-label" id="role-label">
                I’m here as a
              </span>
              <div
                className="role-options"
                role="group"
                aria-labelledby="role-label"
              >
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="CLIENT"
                    defaultChecked={
                      (state.values?.role ?? defaultRole) === "CLIENT"
                    }
                  />
                  <span>
                    <BriefcaseBusiness size={19} />
                    <strong>Client</strong>
                    <small>I have a project</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="DEVELOPER"
                    defaultChecked={
                      (state.values?.role ?? defaultRole) === "DEVELOPER"
                    }
                  />
                  <span>
                    <Code2 size={19} />
                    <strong>Developer</strong>
                    <small>I build projects</small>
                  </span>
                </label>
              </div>
              {fieldError("role")}
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
            placeholder="you@company.com"
            required
            maxLength={254}
            aria-invalid={!!state.fields?.email}
            aria-describedby="email-error"
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
              placeholder={
                signUp ? "At least 12 characters" : "Enter your password"
              }
              required
              minLength={signUp ? 12 : 1}
              maxLength={128}
              aria-invalid={!!state.fields?.password}
              aria-describedby={
                signUp ? "password-hint password-error" : "password-error"
              }
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
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
          </div>
        )}
        <Button type="submit" className="auth-submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle size={17} className="spin" />
              {signUp ? "Creating your account…" : "Signing you in…"}
            </>
          ) : (
            <>
              {signUp ? "Create account" : "Log in"}
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </fieldset>
      <p className="auth-switch">
        {signUp ? "Already have an account?" : "New to DealMile?"}{" "}
        <Link href={signUp ? "/login" : "/register"}>
          {signUp ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
