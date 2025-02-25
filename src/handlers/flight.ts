import { formatFlightCalendarEvent, formatFlightItinerary } from "@/formatters/flight";
import FlightSchema from "@/schemas/FlightSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { sendTelegramMessage } from "@/services/telegram";
import { CalendarEvent } from "@/types/calendarEvent";
import { Env } from "@/types/env";
import { FlightItinerary, FlightSegment } from "@/types/flight";
import { fullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export const PROMPT_EXTRACT_FLIGHT_INFO = `
You are my personal assistant, and you are given an email, help me extract key information.

For each email extract flight information and return it in a structured format.

- Timezone must be in the format of "America/New_York" or "Asia/Shanghai".
- Datetime must be in ISO format (YYYY-MM-DDTHH:mm:ss.SSSZ).
- Ensure all known fields and calculatable fields are included.
- Include all important unincluded information in the additional_notes field.
- If a field is not present, return an empty string.

Ensure your response matches the provided JSON schema structure exactly.
`;


function createFlightCalendarEvent(segment: FlightSegment, passengerName: string): CalendarEvent {
  return formatFlightCalendarEvent(segment, passengerName);
}

async function addFlightToCalendar(flightItinerary: FlightItinerary, env: Env) {
  const calendarPromises = flightItinerary.trips.flatMap(trip =>
    trip.segments.map(segment =>
      createCalendarEvent(
        createFlightCalendarEvent(segment, flightItinerary.passengerName),
        env
      )
    )
  );

  await Promise.all(calendarPromises);
}

export class FlightHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) {
  }

  async handle() {
    console.log(`[Flight] Handling ${this.email.subject || '(No subject)'}`);
    const flightItinerary: FlightItinerary = await extractInformation(this.email, PROMPT_EXTRACT_FLIGHT_INFO, FlightSchema, "FlightItinerary", this.env);
    try {
      const message = formatFlightItinerary(flightItinerary);
      const departureCity = flightItinerary.trips[0].segments[0].departureCity;
      const arrivalCity = flightItinerary.trips[0].segments[flightItinerary.trips[0].segments.length - 1].arrivalCity;
      const title = `✈️ ${flightItinerary.passengerName}: ${departureCity} ➔ ${arrivalCity}`;
      console.log('[Flight] Formatted flight itinerary:', message);

      await Promise.all([
        sendTelegramMessage(fullSender(this.email), title, message, this.env),
        addFlightToCalendar(flightItinerary, this.env)
      ]);

      console.log('[Flight] Added flight segments to calendar');
    } catch (error) {
      console.error('[Flight] Error processing flight:', error);
      throw error;
    }
  }
}