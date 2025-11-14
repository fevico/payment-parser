import { z } from 'zod';

export const paymentInstructionSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string().min(1),
      balance: z.number().int().nonnegative(),
      currency: z.string().length(3),
    })
  ).min(1),
  instruction: z.string().min(1),
});