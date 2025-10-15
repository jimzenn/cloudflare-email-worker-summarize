import { z } from 'zod';
import { BasicCalendarEventSchema } from './basicCalendarEvent';

export const EventSchema = BasicCalendarEventSchema.extend({
  name: z.string(),
  description: z.string().optional(),
  organizer: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  status: z.string().optional(),
});

export type Event = z.infer<typeof EventSchema>;
