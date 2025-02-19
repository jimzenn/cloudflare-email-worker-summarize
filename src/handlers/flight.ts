import FlightSchema from "@/schemas/FlightSchema.json";
import { queryOpenAI } from "@/services/openai";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { FlightItinery, FlightTrip } from "@/types/flight";
import { formatDateTime, formatDuration } from "@/utils/datetime";
import { createEmailPrompt } from "@/utils/email";
import { Email } from "postal-mime";
import { markdownv2 as format } from 'telegram-format';

export const PROMPT_EXTRACT_FLIGHT_INFO = `
You are my personal assistant, and you are given an email, help me extract key information.

For each email extract flight information and return it in a structured format.

Ensure your response matches the provided JSON schema structure exactly.
`

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

async function extractFlightItinery(email: Email, env: Env): Promise<FlightItinery> {
  console.log('[Flight] Sending email text to OpenAI:', email.text?.substring(0, 200) + '...');

  try {
    const response = await queryOpenAI(
      PROMPT_EXTRACT_FLIGHT_INFO,
      await createEmailPrompt(email, env),
      env,
      FlightSchema,
      "FlightSchema"
    );
    
    const parsed = JSON.parse(response);
    console.log('[Flight] Successfully parsed response into FlightItinery');
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

export class FlightHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) {
  }

  async handle() {
    console.log(`[Flight] Handling ${this.email.subject || '(No subject)'}`);
    try {
      const flightItinery = await extractFlightItinery(this.email, this.env);
      console.log('[Flight] Extracted flight itinery:', flightItinery);
      const message = formatFlightItinery(flightItinery);
      console.log('[Flight] Formatted flight itinery:', message);
      await sendTelegramMessage(this.email.from.address || 'unknown', this.email.subject || '(No subject)', message, this.env);
    } catch (error) {
      console.error('[Flight] Error processing flight:', error);
    }
  }
}