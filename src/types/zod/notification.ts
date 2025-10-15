import { z } from 'zod';

export const NotificationInfoSchema = z.object({
  summary: z.string(),
});

export type NotificationInfo = z.infer<typeof NotificationInfoSchema>;
