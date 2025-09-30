import { formatFlightCalendarEvent, formatFlightItinerary } from "@/formatters/flight";
import { PROMPT_EXTRACT_FLIGHT_INFO } from "@/prompts/flight";
import FlightSchema from "@/schemas/FlightSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { sendTelegramMessage } from "@/services/telegram";
import { CalendarEvent } from "@/types/calendarEvent";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { FlightItinerary, FlightSegment } from "@/types/flight";
import { Handler } from "@/types/handler";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class FlightHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  private createFlightCalendarEvent(segment: FlightSegment, passengerName: string): CalendarEvent {
    return formatFlightCalendarEvent(segment, passengerName);
  }

  private async addFlightToCalendar(flightItinerary: FlightItinerary) {
    const calendarPromises = flightItinerary.trips.flatMap(trip =>
      trip.segments.map(segment =>
        createCalendarEvent(
          this.createFlightCalendarEvent(segment, flightItinerary.passengerName),
          this.env
        )
      )
    );
    await Promise.all(calendarPromises);
  }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Flight] Handling email: "${subject}"`);

    try {
      const { data: flightItinerary, model } = await extractInformation<FlightItinerary>(
        this.email,
        PROMPT_EXTRACT_FLIGHT_INFO,
        FlightSchema,
        "FlightItinerary",
        this.env
      );
      this.debugInfo.llmModel = model;

      const message = formatFlightItinerary(flightItinerary);
      const departureCity = flightItinerary.trips[0].segments[0].departureCity;
      const arrivalCity = flightItinerary.trips[0].segments[flightItinerary.trips[0].segments.length - 1].arrivalCity;
      const title = `✈️ ${flightItinerary.passengerName}: ${departureCity} ➔ ${arrivalCity}`;

      console.log('[Flight] Formatted flight itinerary:', message);

      await Promise.all([
        sendTelegramMessage(
          stylizedFullSender(this.email),
          title,
          message,
          this.debugInfo,
          this.env
        ),
        this.addFlightToCalendar(flightItinerary)
      ]);

      console.log(`[Flight] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Flight] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}