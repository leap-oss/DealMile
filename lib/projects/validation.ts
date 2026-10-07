import { z } from "zod";
export const moneySchema = z.coerce
  .number()
  .finite()
  .positive()
  .max(1_000_000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
    "Use at most two decimal places.",
  );
export const proposalSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    type: z.string().trim().min(2).max(80),
    requirements: z
      .string()
      .trim()
      .min(20, "Describe your requirements in at least 20 characters.")
      .max(10000),
    budget: moneySchema,
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
        "Enter a valid date.",
      ),
    scope: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
    milestones: z
      .array(
        z.object({
          title: z.string().trim().min(3).max(120),
          description: z.string().trim().min(5).max(2000),
          amount: moneySchema,
          estimatedDays: z.coerce.number().int().min(1).max(365),
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((v, c) => {
    if (
      v.milestones.reduce((n, m) => n + Math.round(m.amount * 100), 0) !==
      Math.round(v.budget * 100)
    )
      c.addIssue({
        code: "custom",
        path: ["budget"],
        message: "Milestone amounts must add up to the project budget.",
      });
  });
export type ProposalInput = z.infer<typeof proposalSchema>;
