"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { trustedOrigins } from "@/lib/origins";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/auth/validation";
import { createSession, deleteSession, tokenHash } from "@/lib/auth/session";
export type AuthState = {
  values?: { email: string; name: string; role: "CLIENT" | "DEVELOPER" };
  error?: string;
  fields?: Record<string, string[] | undefined>;
};
async function checkOrigin() {
  const origin = (await headers()).get("origin");
  const allowed = trustedOrigins({
    appUrl: getEnv().APP_URL,
    development: process.env.NODE_ENV === "development",
    codespaceName: process.env.CODESPACE_NAME,
    forwardingDomain: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
  });
  if (!origin || !allowed.includes(origin))
    throw new Error("Invalid request origin.");
}
async function allowAttempt(email: string) {
  const key = tokenHash(`auth:${email}`);
  return db().$transaction(async (tx) => {
    // Atomic increment serializes concurrent attempts for this identifier.
    const attempt = await tx.authAttempt.upsert({
      where: { key },
      create: { key },
      update: { count: { increment: 1 } },
    });
    if (Date.now() - attempt.windowStart.getTime() > 15 * 60 * 1000) {
      await tx.authAttempt.update({
        where: { key },
        data: { count: 1, windowStart: new Date() },
      });
      return true;
    }
    return attempt.count <= 10;
  });
}
async function handleLogin(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = loginSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: input.error.flatten().fieldErrors };
  let destination = "/dashboard";
  try {
    await checkOrigin();
    if (!(await allowAttempt(input.data.email)))
      return { error: "Too many attempts. Please try again in 15 minutes." };
    const user = await db().user.findUnique({
      where: { email: input.data.email },
    });
    // Derive a key even when the account does not exist.
    const valid = await verifyPassword(
      input.data.password,
      user?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!user || !valid) return { error: "Email or password is incorrect." };
    await createSession(user.id);
    destination = user.role === "CLIENT" ? "/dashboard" : "/developer";
  } catch {
    return {
      error:
        "Unable to sign in. Please try again. If this continues, contact the workspace administrator.",
    };
  }
  redirect(destination);
}
async function handleRegister(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = registerSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: input.error.flatten().fieldErrors };
  try {
    await checkOrigin();
    if (!(await allowAttempt(input.data.email)))
      return { error: "Too many attempts. Please try again in 15 minutes." };
    const { password, ...data } = input.data;
    const user = await db().user.create({
      data: { ...data, passwordHash: await hashPassword(password) },
    });
    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return {
        error:
          "Unable to create this account. Try signing in or use another email.",
      };
    return {
      error:
        "Unable to create your account. Please try again. If this continues, contact the workspace administrator.",
    };
  }
  redirect(input.data.role === "CLIENT" ? "/dashboard" : "/developer");
}
export async function logout() {
  await checkOrigin();
  await deleteSession();
  redirect("/");
}

function formValues(form: FormData): NonNullable<AuthState["values"]> {
  return {
    email: String(form.get("email") ?? "").slice(0, 254),
    name: String(form.get("name") ?? "").slice(0, 80),
    role: form.get("role") === "DEVELOPER" ? "DEVELOPER" : "CLIENT",
  };
}
export async function login(
  state: AuthState,
  form: FormData,
): Promise<AuthState> {
  return { ...(await handleLogin(state, form)), values: formValues(form) };
}
export async function register(
  state: AuthState,
  form: FormData,
): Promise<AuthState> {
  return { ...(await handleRegister(state, form)), values: formValues(form) };
}
