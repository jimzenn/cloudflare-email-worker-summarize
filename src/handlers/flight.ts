import { Env } from "../types/env";
import { ForwardableEmailMessage } from "postal-mime";
import { queryOpenAI } from "../services/openai";
import { sendTelegramMessage } from "../services/telegram";
import { markdownv2 as format } from 'telegram-format';
import { formatDateTime, formatDuration } from "../utils/datetime";

export const PROMPT_EXTRACT_FLIGHT_INFO = `
You are my personal assistant, and you are given an email, help me extract key information.

You should respond directly with a parsable JSON object with the following Typescript interface.

DO NOT include markdown code block quotes! The JSON response must be directly parsable!!

Here's the Typescript interface:

interface FlightSegment {
  airlineName: string; // e.g. "Delta Airlines"
  flightNumber: string; // e.g. "DL1234"
  seatNumber?: string; // e.g. "12A"

  departureTime: string;  // e.g. "2025-02-13T12:00:00Z"
  departureTZ?: string; // e.g. "America/Los_Angeles"
  departureCity: string; // e.g. "Los Angeles"
  departureIataCode: string; // e.g. "LAX"
  departureTerminal?: string; // e.g. "1"
  departureGate?: string; // e.g. "12"

  arrivalTime: string;  // e.g. "2025-02-13T12:00:00Z"
  arrivalTZ?: string; // e.g. "America/San_Francisco"
  arrivalCity: string; // e.g. "San Francisco"
  arrivalIataCode: string; // e.g. "SFO"
  arrivalTerminal?: string; // e.g. "International"
  arrivalGate?: string; // e.g. "12"
}

interface FlightTrip {
  confirmation_code: string;  // e.g. "H3VTK8"
  flightClass: string; // e.g. "Economy"
  segments: FlightSegment[];
}

interface FlightItinery {
  passengerName: string; // e.g. "John Doe"
  trips: FlightTrip[];
  additional_notes?: string[];
}
`

interface FlightSegment {
  airlineName: string; // e.g. "Delta Airlines"
  flightNumber: string; // e.g. "DL1234"
  seatNumber?: string; // e.g. "12A"

  departureTime: string;  // e.g. "2025-02-13T12:00:00Z"
  departureTZ: string; // e.g. "America/Los_Angeles"
  departureCity: string; // e.g. "Los Angeles"
  departureIataCode: string; // e.g. "LAX"
  departureTerminal?: string; // e.g. "1"
  departureGate?: string; // e.g. "12"

  arrivalTime: string;  // e.g. "2025-02-13T12:00:00Z"
  arrivalTZ: string; // e.g. "America/San_Francisco"
  arrivalCity: string; // e.g. "San Francisco"
  arrivalIataCode: string; // e.g. "SFO"
  arrivalTerminal?: string; // e.g. "International"
  arrivalGate?: string; // e.g. "12"
}

interface FlightTrip {
  confirmation_code: string;  // e.g. "H3VTK8"
  flightClass: string; // e.g. "Economy", "Main Cabin", "First Class"
  segments: FlightSegment[];
}

interface FlightItinery {
  passengerName: string; // e.g. "John Doe"
  trips: FlightTrip[];
  additional_notes?: string[];  // e.g. "No checked bags", "Non-refundable", etc.
}

function flightAwareUrl(flightNumber: string) {
  return `https://flightaware.com/live/flight/${flightNumber}`;
}

const formatPort = (city: string, iataCode: string, terminal?: string, gate?: string) => {
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
    `${f.flightClass}`,
    `Confirmation Code: ${format.bold(format.monospace(f.confirmation_code))}`,
    `${formatDuration(totalDuration)}`,
    `${f.segments.length - 1} layover${f.segments.length - 1 === 1 ? '' : 's'}`,
  ].join('\n');

  const segmentMarkdowns = f.segments.map((s, index) => {
    const departureTime = formatDateTime(new Date(s.departureTime), s.departureTZ);
    const arrivalTime = formatDateTime(new Date(s.arrivalTime), s.arrivalTZ);
    const departurePort = formatPort(s.departureCity, s.departureIataCode, s.departureTerminal, s.departureGate);
    const arrivalPort = formatPort(s.arrivalCity, s.arrivalIataCode, s.arrivalTerminal, s.arrivalGate);
    const segment = [
      `${format.bold(s.airlineName)} \- [${s.flightNumber}](${flightAwareUrl(s.flightNumber)})`,
      `${departurePort} ➔ ${arrivalPort}`,
      `${departureTime} \- ${arrivalTime}`
    ];

    if (index < f.segments.length - 1) {
      const nextSegment = f.segments[index + 1];
      const layoverDuration = new Date(nextSegment.departureTime).getTime() - new Date(s.arrivalTime).getTime();
      segment.push(`\n${format.italic(`Layover in ${s.arrivalCity}: ${formatDuration(layoverDuration)}`)}`);
    }

    return segment;
  });

  return [header, ...segmentMarkdowns].join('\n');
}

function formatFlightItinery(f: FlightItinery) {
  return [
    `Passenger: *${f.passengerName}*`,
    ...f.trips.map(formatFlightTrip),
    ...(f.additional_notes ? [`*Additional Notes:* ${f.additional_notes.join(', ')}`] : []),
  ].join('\n\n');
}

async function extractFlightItinery(email: ForwardableEmailMessage, env: Env): Promise<FlightItinery> {
  const prompt = PROMPT_EXTRACT_FLIGHT_INFO;
  console.log('[Flight] Sending email text to OpenAI:', email.text.substring(0, 200) + '...');
  
  let response: string;
  try {
    response = await queryOpenAI(prompt, email.text, env);
    console.log('[Flight] Raw OpenAI response:', response);
    
    const parsed = JSON.parse(response);
    console.log('[Flight] Successfully parsed response into FlightItinery');
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Flight] JSON parsing error:', error.message);
      console.error('[Flight] Invalid OpenAI response:', response!);
    } else {
      console.error('[Flight] Unexpected error during flight extraction:', error);
      if (error instanceof Error) {
        console.error('[Flight] Error stack:', error.stack);
      }
    }
    throw error; // Re-throw to maintain existing error handling
  }
}

export class FlightHandler {
  constructor(private email: ForwardableEmailMessage, private domainKnowledges: string[], private env: Env) {
  }

  async handle() {
    console.log(`[Flight] Handling ${this.email.subject}`);
    try {
      const flightItinery = await extractFlightItinery(this.email, this.env);
      console.log('[Flight] Extracted flight itinery:', flightItinery);
      const message = formatFlightItinery(flightItinery);
      console.log('[Flight] Formatted flight itinery:', message);
      await sendTelegramMessage(this.email.from.address, this.email.subject, message, this.env);
    } catch (error) {
      console.error('[Flight] Error processing flight:', error);
    }
  }

}