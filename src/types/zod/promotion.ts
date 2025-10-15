import { z } from 'zod';

export const PromotionItemSchema = z.object({
  promotedItem: z.string(),
  itemDescription: z.string(),
  deal: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  thoughts: z.array(z.string()),
  verdict: z.string(),
});

export const PromotionDetailsSchema = z.object({
  vendor: z.string(),
  items: z.array(PromotionItemSchema),
  generalTerms: z.array(z.string()),
  additionalNotes: z.array(z.string()),
});

export type PromotionItem = z.infer<typeof PromotionItemSchema>;
export type PromotionDetails = z.infer<typeof PromotionDetailsSchema>;
