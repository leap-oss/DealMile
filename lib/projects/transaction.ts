import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
export async function transaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db().$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        attempt < 4 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 30 * 2 ** attempt));
        continue;
      }
      throw error;
    }
  }
}
