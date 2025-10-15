import { z } from 'zod';

export const BasicCalendarEventSchema = z.object({
  title: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().optional(),
});

export type BasicCalendarEvent = z.infer<typeof BasicCalendarEventSchema>;
