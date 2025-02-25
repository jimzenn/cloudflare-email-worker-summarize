import { formatFlightCalendarEvent, formatFlightItinerary } from "@/formatters/flight";
import FlightSchema from "@/schemas/FlightSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { queryOpenAI } from "@/services/openai";
import { sendTelegramMessage } from "@/services/telegram";
import { CalendarEvent } from "@/types/calendarEvent";
import { Env } from "@/types/env";
import { FlightItinerary, FlightSegment } from "@/types/flight";
import { createEmailPrompt, fullSender } from "@/utils/email";
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


async function extractFlightItinerary(email: Email, env: Env): Promise<FlightItinerary> {
  console.log('[Flight] Sending email text to OpenAI:', email.text?.substring(0, 200) + '...');

  const response = await queryOpenAI(
    PROMPT_EXTRACT_FLIGHT_INFO,
    await createEmailPrompt(email, env),
    env,
    FlightSchema,
    "FlightItinerary"
  );

  try {
    const parsed = JSON.parse(response);
    console.log('[Flight] Successfully parsed response into FlightItinerary');
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Flight] JSON parsing error:', error.message);
    } else {
      console.error('[Flight] Unexpected error during flight extraction:', error);
      if (error instanceof Error) {
        console.error('[Flight] Error stack:', error.stack);
      }
    }
    throw error;
  }
}

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
    const flightItinerary = await extractFlightItinerary(this.email, this.env);
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