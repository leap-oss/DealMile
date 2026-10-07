import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { loginSchema, registerSchema } from "../lib/auth/validation";
test("passwords use independent salts and reject a different password", async () => {
  const password = "a secure test passphrase";
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert(!a.includes(password));
  assert(await verifyPassword(password, a));
  assert(!(await verifyPassword("wrong password", a)));
  assert(!(await verifyPassword(password, "malformed")));
});
test("registration rejects unsupported roles and weak passwords", () => {
  const input = {
    name: "Test User",
    email: " TEST@EXAMPLE.COM ",
    password: "a secure test passphrase",
    role: "CLIENT",
  };
  const parsed = registerSchema.parse(input);
  assert.equal(parsed.email, "test@example.com");
  assert(!registerSchema.safeParse({ ...input, role: "ADMIN" }).success);
  assert(!registerSchema.safeParse({ ...input, password: "123" }).success);
  assert(!registerSchema.safeParse({ ...input, email: "invalid" }).success);
  assert(!registerSchema.safeParse({ ...input, name: " " }).success);
  assert(
    !loginSchema.safeParse({ email: "test@example.com", password: "" }).success,
  );
});
