import { z } from 'zod';

export const HotelStaySchema = z.object({
  hotelName: z.string(),
  roomType: z.string(),
  checkInDate: z.string().datetime(),
  checkInTime: z.string(),
  checkOutDate: z.string().datetime(),
  checkOutTime: z.string(),
  timezone: z.string(),
  address: z.string(),
  confirmationCode: z.string(),
  guestName: z.string(),
  numberOfGuests: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
  cancellationPolicy: z.string().optional(),
  additionalNotes: z.array(z.string()).optional(),
});

export type HotelStay = z.infer<typeof HotelStaySchema>;
