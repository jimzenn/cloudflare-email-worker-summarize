import { z } from 'zod';

export const VerificationCodeSchema = z.object({
  service: z.string(),
  code: z.string(),
  accountName: z.string(),
  additionalNotes: z.array(z.string()),
});

export type VerificationCode = z.infer<typeof VerificationCodeSchema>;
