import { z } from "zod";
import { moneySchema } from "@/lib/projects/validation";
export const planInputSchema = z.object({
  name: z.string().trim().min(3).max(120),
  type: z.string().trim().min(2).max(80),
  requirements: z.string().trim().min(20).max(10000),
  budget: moneySchema,
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const projectPlanSchema = z.object({
  summary: z.string().min(10).max(2000),
  scope: z.array(z.string().min(3).max(500)).min(1).max(50),
  milestones: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().min(5).max(2000),
        suggestedAmount: z.number().positive().max(1000000),
        estimatedDays: z.number().int().min(1).max(365),
      }),
    )
    .min(1)
    .max(20),
  risks: z.array(z.string().min(3).max(500)).max(20),
});
export const scopeAnalysisSchema = z.object({
  scopeChangeDetected: z.boolean(),
  changes: z
    .array(
      z.object({
        feature: z.string().min(3).max(200),
        includedInOriginalScope: z.boolean(),
        originalRequirement: z.string().max(500),
        reason: z.string().min(10).max(1000),
      }),
    )
    .min(1)
    .max(20),
});
export type ProjectPlanInput = z.infer<typeof planInputSchema>;
export type ProjectPlan = z.infer<typeof projectPlanSchema>;
export type ScopeAnalysis = z.infer<typeof scopeAnalysisSchema>;
export interface AIProvider {
  generateProjectPlan(input: ProjectPlanInput): Promise<ProjectPlan>;
  analyzeScopeChange(input: {
    scope: string[];
    request: string;
  }): Promise<ScopeAnalysis>;
}
