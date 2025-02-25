import FlightSchema from "@/schemas/FlightSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { queryOpenAI } from "@/services/openai";
import { sendTelegramMessage } from "@/services/telegram";
import { CalendarEvent } from "@/types/calendarEvent";
import { Env } from "@/types/env";
import { FlightItinerary, FlightSegment, FlightTrip } from "@/types/flight";
import { formatDateTime, formatDuration } from "@/utils/datetime";
import { createEmailPrompt, fullSender } from "@/utils/email";
import { Email } from "postal-mime";
import { markdownv2 as format } from 'telegram-format';

export const PROMPT_EXTRACT_FLIGHT_INFO = `
You are my personal assistant, and you are given an email, help me extract key information.

For each email extract flight information and return it in a structured format.

- Timezone (i.e. departureTimezone, arrivalTimezone) must be in the format of "America/New_York" or "Asia/Shanghai".
- Ensure all known fields and calculatable fields are included.
- Include all important unincluded information in the additional_notes field, and make the key information section bold.
- If a field is not present, return an empty string.

Ensure your response matches the provided JSON schema structure exactly.
`

const DIVIDER = "———————————————————————————";

function flightAwareUrl(flightNumber: string) {
  return `https://flightaware.com/live/flight/${flightNumber}`;
}

const formatPort = (
  city: string,
  iataCode: string,
  terminal?: string,
  gate?: string
) => {
  const location = `${format.bold(city)} (${format.monospace(iataCode)})`;
  const details = [terminal, gate].filter(Boolean).join(' ');
  return details ? `${location} | ${details}` : location;
};

function formatFlightTrip(f: FlightTrip) {
  const departureCity = f.segments[0].departureCity;
  const arrivalCity = f.segments[f.segments.length - 1].arrivalCity;
  const departureTime = new Date(f.segments[0].departureTime);
  const arrivalTime = new Date(f.segments[f.segments.length - 1].arrivalTime);
  const totalDuration = arrivalTime.getTime() - departureTime.getTime();

  const header = [
    `${format.bold(departureCity)} ➔ ${format.bold(arrivalCity)}`,
    `${formatDuration(totalDuration)}`,
    `${f.segments.length - 1} layover${f.segments.length - 1 === 1 ? '' : 's'}`,
    DIVIDER,
  ].join('\n');

  const segmentMarkdowns = f.segments.flatMap((s, index) => {
    const departureTime = formatDateTime(new Date(s.departureTime), s.departureTimezone);
    const arrivalTime = formatDateTime(new Date(s.arrivalTime), s.arrivalTimezone);
    const departurePort = formatPort(s.departureCity, s.departureIataCode, s.departureTerminal, s.departureGate);
    const arrivalPort = formatPort(s.arrivalCity, s.arrivalIataCode, s.arrivalTerminal, s.arrivalGate);
    const flightNumberWithLink = format.url(s.flightNumber, flightAwareUrl(s.flightNumber));
    const segmentLines = [
      `${format.bold(s.airlineName)}${s.flightNumber ? ` \- ${flightNumberWithLink}` : ''}`,
      `${departurePort} ➔ ${arrivalPort}`,
      `${departureTime} \- ${arrivalTime}`
    ];

    if (index < f.segments.length - 1) {
      const nextSegment = f.segments[index + 1];
      const layoverDuration = new Date(nextSegment.departureTime).getTime() - new Date(s.arrivalTime).getTime();
      segmentLines.push('', `${format.italic(`Layover in ${s.arrivalCity}: ${formatDuration(layoverDuration)}`)}`, '');
    }

    return segmentLines;
  });

  return [header, ...segmentMarkdowns].join('\n');
}

function formatFlightItinerary(f: FlightItinerary) {
  const header = [
    `Passenger: ${format.bold(f.passengerName)}`,
    `${format.italic(f.trips[0].flightClass)}`,
    `Confirmation Code: ${format.bold(format.monospace(f.trips[0].confirmation_code))}`,
    ''
  ];

  const trips = f.trips.map(formatFlightTrip);

  const notes = f.additionalNotes
    ? [DIVIDER, format.bold('Additional Notes:'), ...f.additionalNotes.map(note => `- ${note}`)]
    : [];

  return [...header, ...trips, ...notes].join('\n');
}

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
  const departureTime = new Date(segment.departureTime);
  const arrivalTime = new Date(segment.arrivalTime);

  const description = [
    `Passenger: <b>${passengerName}</b>`,
    segment.seatNumber && `Seat: <b>${segment.seatNumber}</b>`,
    '',
    `<b>Departure</b>`,
    `• Time: ${formatDateTime(departureTime, segment.departureTimezone)}`,
    `• City: ${segment.departureCity}`,
    segment.departureTerminal && `• Terminal: ${segment.departureTerminal}`,
    segment.departureGate && `• Gate: ${segment.departureGate}`,
    '',
    `<b>Arrival</b>`,
    `• Time: ${formatDateTime(arrivalTime, segment.arrivalTimezone)}`,
    `• City: ${segment.arrivalCity}`,
    segment.arrivalTerminal && `• Terminal: ${segment.arrivalTerminal}`,
    segment.arrivalGate && `• Gate: ${segment.arrivalGate}`,
    '',
    segment.flightNumber && `<a href="${flightAwareUrl(segment.flightNumber)}">Flight tracking for ${segment.flightNumber}</a>`
  ].filter(Boolean).join('\n');

  return {
    summary: `${segment.departureCity} (${segment.departureIataCode}) ➔ ${segment.arrivalCity} (${segment.arrivalIataCode})`,
    description,
    location: `${segment.departureIataCode} Airport, Terminal ${segment.departureTerminal}`,
    start: {
      dateTime: segment.departureTime,
      timeZone: segment.departureTimezone,
    },
    end: {
      dateTime: segment.arrivalTime,
      timeZone: segment.arrivalTimezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 180 }, // 3 hours before
        { method: 'popup', minutes: 120 }, // 2 hours before
      ]
    }
  };
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