import "server-only";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export function db() {
  if (!globalDb.prisma)
    globalDb.prisma = new PrismaClient({
      datasourceUrl: getEnv().DATABASE_URL,
    });
  return globalDb.prisma;
}
