import "server-only";
import { z } from "zod";
import { validAppUrl } from "./app-url";
const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (v) => /^postgres(ql)?:/.test(v),
      "Use a PostgreSQL connection URL",
    ),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
});
let value: z.infer<typeof schema> | undefined;
export function getEnv() {
  if (value) return value;
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Server configuration is incomplete. Configure DATABASE_URL, AUTH_SECRET (32+ characters), and APP_URL.",
    );
  if (!validAppUrl(result.data.APP_URL, process.env.NODE_ENV === "production"))
    throw new Error(
      "APP_URL must be an application origin. Production requires HTTPS and cannot use localhost or a loopback address.",
    );
  value = result.data;
  return value;
}
