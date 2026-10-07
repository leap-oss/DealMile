import { z } from "zod";
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
});
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email,
  password,
  role: z.enum(["CLIENT", "DEVELOPER"]),
});
