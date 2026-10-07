import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
const COOKIE = "dealmile_session";
export function tokenHash(token: string) {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(token).digest("hex");
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db().session.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db().session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
});
export async function requireUser(role?: Role) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (role && user.role !== role)
    redirect(user.role === "CLIENT" ? "/dashboard" : "/developer");
  return user;
}
export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await db().session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.delete(COOKIE);
}
export async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  const project = await db().project.findFirst({
    where: {
      id: projectId,
      ...(user.role === "CLIENT"
        ? { clientId: user.id }
        : {
            developerId: user.id,
            status: { notIn: ["DRAFT", "AI_PLANNING"] },
          }),
    },
  });
  if (!project) throw new Error("Project unavailable.");
  return { user, project };
}
