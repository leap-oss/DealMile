import { getAIProvider, DEFAULT_GEMINI_MODEL } from "../lib/ai/gemini";
import { projectPlanSchema } from "../lib/ai/contracts";
import { proposalSchema } from "../lib/projects/validation";
async function main() {
  const input = {
    name: "E-commerce Platform",
    type: "Website",
    requirements:
      "Build email/password authentication, product management, a shopping cart, and an admin dashboard. Exclude social login and sales analytics.",
    budget: 1000,
    deadline: "2027-12-31",
  };
  const plan = projectPlanSchema.parse(
    await getAIProvider().generateProjectPlan(input),
  );
  const proposal = proposalSchema.parse({
    ...input,
    scope: plan.scope,
    milestones: plan.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      amount: m.suggestedAmount,
      estimatedDays: m.estimatedDays,
    })),
  });
  console.log(
    JSON.stringify(
      {
        provider: "Gemini",
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        structuredOutputValidated: true,
        proposalValidated: true,
        total: proposal.milestones.reduce((n, m) => n + m.amount, 0),
        plan,
      },
      null,
      2,
    ),
  );
}
main().catch((error: unknown) => {
  // Keep API credentials and raw provider responses out of logs.
  console.error(
    error instanceof Error ? error.message : "Gemini check failed.",
  );
  process.exitCode = 1;
});
