import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalSchema } from "../lib/projects/validation";
const valid = {
  name: "Commerce website",
  type: "Website",
  requirements: "Email authentication and a product catalog with shopping cart",
  budget: 1000,
  deadline: "2026-12-31",
  scope: ["Product catalog"],
  milestones: [
    {
      title: "Implementation",
      description: "Deliver the working application",
      amount: 1000,
      estimatedDays: 30,
    },
  ],
};
test("proposals require matching milestone budgets and valid calendar dates", () => {
  assert(proposalSchema.safeParse(valid).success);
  assert(!proposalSchema.safeParse({ ...valid, budget: 999 }).success);
  assert(
    !proposalSchema.safeParse({ ...valid, deadline: "2026-02-30" }).success,
  );
  assert(!proposalSchema.safeParse({ ...valid, budget: 1000.001 }).success);
  assert(!proposalSchema.safeParse({ ...valid, milestones: [] }).success);
  assert(
    !proposalSchema.safeParse({
      ...valid,
      milestones: [{ ...valid.milestones[0], estimatedDays: 0 }],
    }).success,
  );
});
