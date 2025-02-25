import { markdownv2 as format } from 'telegram-format';
import { FlightTrip, FlightItinerary, FlightSegment } from '@/types/flight';
import { formatDateTime, formatDuration } from '@/utils/datetime';
import { CalendarEvent } from '@/types/calendarEvent';
import { DIVIDER } from "@/formatters/common";

function flightAwareUrl(flightNumber: string) {
  return `https://flightaware.com/live/flight/${flightNumber}`;
}

export const formatPort = (
  city: string,
  iataCode: string,
  terminal?: string,
  gate?: string
) => {
  const location = `${format.bold(city)} (${format.monospace(iataCode)})`;
  const details = [terminal, gate].filter(Boolean).join(' ');
  return details ? `${location} | ${details}` : location;
};

export function formatFlightTrip(f: FlightTrip) {
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

export function formatFlightItinerary(f: FlightItinerary) {
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

function formatCalendarEventDescription(segment: FlightSegment, passengerName: string): string {
  const departureTime = new Date(segment.departureTime);
  const arrivalTime = new Date(segment.arrivalTime);

  return [
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
}

export function formatFlightCalendarEvent(segment: FlightSegment, passengerName: string): CalendarEvent {
  return {
    summary: `${segment.departureCity} (${segment.departureIataCode}) ➔ ${segment.arrivalCity} (${segment.arrivalIataCode})`,
    description: formatCalendarEventDescription(segment, passengerName),
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
