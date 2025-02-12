import { Env } from "../types/env";
import { ForwardableEmailMessage } from "postal-mime";
import { queryOpenAI } from "../services/openai";
import { sendTelegramMessage } from "../services/telegram";
import { markdownv2 as format } from 'telegram-format';

export const PROMPT_EXTRACT_FLIGHT_INFO = `
You are my personal assistant, and you are given an email, help me extract key information.

You should respond directly with a parsable JSON object with the following Typescript interface.

Here's the Typescript interface:

interface FlightSegment {
  airlineName: string; // e.g. "Delta Airlines"
  flightNumber: string; // e.g. "DL1234"

  departureTime: Date;
  departureTZ?: string; // e.g. "America/Los_Angeles"
  departureCity: string; // e.g. "Los Angeles"
  departureIataCode: string; // e.g. "LAX"
  departureTerminal?: string; // e.g. "1"
  departureGate?: string; // e.g. "12"

  arrivalTime: Date;
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
}
`

interface FlightSegment {
  airlineName: string; // e.g. "Delta Airlines"
  flightNumber: string; // e.g. "DL1234"

  departureTime: Date;
  departureTZ: string; // e.g. "America/Los_Angeles"
  departureCity: string; // e.g. "Los Angeles"
  departureIataCode: string; // e.g. "LAX"
  departureTerminal?: string; // e.g. "1"
  departureGate?: string; // e.g. "12"

  arrivalTime: Date;
  arrivalTZ: string; // e.g. "America/San_Francisco"
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
}


function formatFlightTrip(f: FlightTrip) {
  const departureCity = f.segments[0].departureCity;
  const arrivalCity = f.segments[f.segments.length - 1].arrivalCity;
  const departureTime = f.segments[0].departureTime;
  const arrivalTime = f.segments[f.segments.length - 1].arrivalTime;
  const totalDuration = arrivalTime.getTime() - departureTime.getTime();
  const totalDurationHourMinute = `${Math.floor(totalDuration / (1000 * 60 * 60))}h ${Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60))}m`;

  const header = [
    `${format.bold(departureCity)} ➔ ${format.bold(arrivalCity)}`,
    `${f.flightClass}`,
    `${format.monospace(f.confirmation_code)}`,
    `${totalDurationHourMinute} ${f.segments.length - 1} layover${f.segments.length - 1 === 1 ? '' : 's'}`,
  ].join('\n');

  const formatDateTime = (date: Date, tz?: string) => {
    if (!tz) return date.toLocaleString();
    return date.toLocaleString('en-US', { timeZone: tz });
  };

  const formatPort = (terminal?: string, gate?: string) => {
    if (!terminal && !gate) return '';
    if (terminal && !gate) return `(${terminal})`;
    if (!terminal && gate) return `(${gate})`;
    return `(${terminal} ${gate})`;
  };

  const segmentMarkdowns = f.segments.map(s => {
    const departureTime = formatDateTime(s.departureTime, s.departureTZ);
    const arrivalTime = formatDateTime(s.arrivalTime, s.arrivalTZ);
    const departurePort = formatPort(s.departureTerminal, s.departureGate);
    const arrivalPort = formatPort(s.arrivalTerminal, s.arrivalGate);
    return [
      `${format.bold(s.airlineName)} \- ${format.monospace(s.flightNumber)}`,
      `Departure: ${format.monospace(s.departureIataCode)}`,
      `${departureTime}`,
      `${departurePort}`,
      `Arrival: ${format.monospace(s.arrivalIataCode)}`,
      `${arrivalTime}`,
      `${arrivalPort}`
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
  return JSON.parse(response);
}

export class FlightHandler {
  constructor(private email: ForwardableEmailMessage, private domainKnowledges: string[], private env: Env) {
  }

  async handle() {
    const flightItinery = await extractFlightItinery(this.email, this.env);
    // Send a message to the user with the flight itinerary.
    const message = formatFlightItinery(flightItinery);
    await sendTelegramMessage(this.email.from.address, this.email.subject, message, this.env);
  }

}