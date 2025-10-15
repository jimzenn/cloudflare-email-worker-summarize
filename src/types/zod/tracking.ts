import { z } from 'zod';

export const TrackingInfoSchema = z.object({
  store_name: z.string(),
  item_name: z.string(),
  order_id: z.string(),
  order_url: z.string().optional(),
  tracking_number: z.string().optional(),
  status: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  recipient_name: z.string(),
  destination_city: z.string(),
  destination_state: z.string(),
});

export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;
