"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { trustedOrigins } from "@/lib/origins";
import { requireUser } from "@/lib/auth/session";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name (at least 2 characters).")
    .max(80, "Use at most 80 characters."),
});

export type ProfileActionState = {
  error?: string;
  fieldError?: string;
  success?: string;
  name?: string;
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

export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const rawName = String(formData.get("name") ?? "");
  const parsed = profileSchema.safeParse({ name: rawName });
  if (!parsed.success) {
    return {
      fieldError: parsed.error.flatten().fieldErrors.name?.[0],
      name: rawName,
    };
  }
  try {
    await checkOrigin();
    const user = await requireUser();
    await db().user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/developer");
    return {
      success: "Your full name has been updated across your workspace.",
      name: parsed.data.name,
    };
  } catch {
    return {
      error: "Unable to update your profile right now. Please try again.",
      name: rawName,
    };
  }
}
