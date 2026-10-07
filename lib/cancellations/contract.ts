import { z } from "zod";
export const settlementSchema = z.object({
  currency: z.string().length(3),
  refundMilestoneId: z.string().nullable(),
  refundAmount: z.string().regex(/^\d+\.\d{2}$/),
  retainedAmount: z.string().regex(/^\d+\.\d{2}$/),
  cancelledMilestoneIds: z.array(z.string()),
});
export type Settlement = z.infer<typeof settlementSchema>;
