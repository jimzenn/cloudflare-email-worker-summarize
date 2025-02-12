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
  passengerName: string; // e.g. "John Doe"
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
  const location = `${city} (${format.monospace(iataCode)})`;
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
    `${format.bold(format.monospace(f.confirmation_code))}`,
    `${formatDuration(totalDuration)}`,
    `${f.segments.length - 1} layover${f.segments.length - 1 === 1 ? '' : 's'}`,
  ].join('\n');

  const segmentMarkdowns = f.segments.map(s => {
    const departureTime = formatDateTime(new Date(s.departureTime), s.departureTZ);
    const arrivalTime = formatDateTime(new Date(s.arrivalTime), s.arrivalTZ);
    const departurePort = formatPort(s.departureCity, s.departureIataCode, s.departureTerminal, s.departureGate);
    const arrivalPort = formatPort(s.arrivalCity, s.arrivalIataCode, s.arrivalTerminal, s.arrivalGate);
    return [
      `${format.bold(s.airlineName)} \- [${format.monospace(s.flightNumber)}](${flightAwareUrl(s.flightNumber)})`,
      `Departure: ${departurePort}`,
      `${departureTime}`,
      `Arrival: ${arrivalPort}`,
      `${arrivalTime}`
    ].join('\n');
  });

  return [header, ...segmentMarkdowns].join('\n');
}

function formatFlightItinery(f: FlightItinery) {
  return f.trips.map(formatFlightTrip).join('\n\n');
}

async function extractFlightItinery(email: ForwardableEmailMessage, env: Env): Promise<FlightItinery> {
  const prompt = PROMPT_EXTRACT_FLIGHT_INFO;
  const response = await queryOpenAI(prompt, email.text, env);
  
  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('[Flight] Failed to parse OpenAI response:', response);
    throw new Error('Failed to parse flight information from OpenAI response');
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