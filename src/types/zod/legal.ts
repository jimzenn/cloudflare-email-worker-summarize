import { z } from 'zod';

export const LegalDetailsSchema = z.object({
  documentType: z.string(),
  summary: z.string(),
  changes: z.array(z.string()),
  impact: z.string(),
  recommendation: z.string(),
});

export type LegalDetails = z.infer<typeof LegalDetailsSchema>;
