import { z } from 'zod';

export const SummarizeResponseSchema = z.object({
  summary: z.string(),
  summarized_title: z.string(),
});

export type SummarizeResponse = z.infer<typeof SummarizeResponseSchema>;
