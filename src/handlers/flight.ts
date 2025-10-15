import { formatFlightCalendarEvent, formatFlightItinerary } from "@/formatters/flight";
import { PROMPT_EXTRACT_FLIGHT_INFO } from "@/prompts/flight";
import { createCalendarEvent } from "@/services/calendar";
import { CalendarEvent } from "@/types/calendarEvent";
import { FlightItinerary, FlightItinerarySchema, FlightSegment } from "@/types/zod/flight";
import { BaseHandler } from "./base";

export class FlightHandler extends BaseHandler<FlightItinerary> {
  protected schema = FlightItinerarySchema;
  protected systemPrompt = PROMPT_EXTRACT_FLIGHT_INFO;
  protected handlerName = "Flight";
  protected actionName = "FlightItinerary";

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

  async formatMessage(flightItinerary: FlightItinerary) {
    const message = formatFlightItinerary(flightItinerary);
    const departureCity = flightItinerary.trips[0].segments[0].departureCity;
    const arrivalCity = flightItinerary.trips[0].segments[flightItinerary.trips[0].segments.length - 1].arrivalCity;
    const title = `✈️ ${flightItinerary.passengerName}: ${departureCity} ➔ ${arrivalCity}`;

    await this.addFlightToCalendar(flightItinerary);

    return {
      title,
      message,
    };
  }
}
