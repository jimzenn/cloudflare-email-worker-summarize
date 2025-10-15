import { z } from 'zod';
import { BasicCalendarEventSchema } from './basicCalendarEvent';

export const BillInfoSchema = z.object({
  to_whom: z.string(),
  bill_account: z.string(),
  bill_status: z.string(),
  bill_date: z.string(),
  bill_amount: z.number(),
  bill_currency: z.string(),
  what_for: z.string(),
  card_last4: z.string().optional(),
  additional_notes: z.array(z.string()).optional(),
  calendar_event: BasicCalendarEventSchema.optional(),
});

export type BillInfo = z.infer<typeof BillInfoSchema>;
