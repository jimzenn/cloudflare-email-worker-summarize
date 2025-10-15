import { z } from 'zod';

export const FlightSegmentSchema = z.object({
  airlineName: z.string(),
  flightNumber: z.string().optional(),
  seatNumber: z.string().optional(),

  departureTime: z.string().datetime(),
  departureTimezone: z.string(),
  departureCity: z.string(),
  departureIataCode: z.string(),
  departureTerminal: z.string().optional(),
  departureGate: z.string().optional(),

  arrivalTime: z.string().datetime(),
  arrivalTimezone: z.string(),
  arrivalCity: z.string(),
  arrivalIataCode: z.string(),
  arrivalTerminal: z.string().optional(),
  arrivalGate: z.string().optional(),
});

export const FlightTripSchema = z.object({
  confirmationCode: z.string(),
  flightClass: z.string(),
  segments: z.array(FlightSegmentSchema),
});

export const FlightItinerarySchema = z.object({
  passengerName: z.string(),
  trips: z.array(FlightTripSchema),
  additionalNotes: z.array(z.string()).optional(),
});

export type FlightItinerary = z.infer<typeof FlightItinerarySchema>;
export type FlightTrip = z.infer<typeof FlightTripSchema>;
export type FlightSegment = z.infer<typeof FlightSegmentSchema>;
