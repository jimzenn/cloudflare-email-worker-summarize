import { markdownv2 as format } from 'telegram-format';
import { FlightTrip, FlightItinerary, FlightSegment } from '@/types/flight';
import { formatDateTime, formatDuration } from '@/utils/datetime';
import { CalendarEvent } from '@/types/calendarEvent';
import { DIVIDER, formatList } from "@/formatters/common";

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
  return [location, [terminal, gate].filter(Boolean).join(' ')].filter(Boolean).join(' | ');
};

export function formatFlightTrip(f: FlightTrip) {
  const firstSegment = f.segments[0];
  const lastSegment = f.segments[f.segments.length - 1];
  const departureTime = new Date(firstSegment.departureTime);
  const arrivalTime = new Date(lastSegment.arrivalTime);
  const layoverCount = f.segments.length - 1;

  const header = [
    `${format.bold(firstSegment.departureCity)} ➔ ${format.bold(lastSegment.arrivalCity)}`,
    formatDuration(arrivalTime.getTime() - departureTime.getTime()),
    `${layoverCount} layover${layoverCount === 1 ? '' : 's'}`,
    DIVIDER,
  ].join('\n');

  const segmentMarkdowns = f.segments.flatMap((segment, index) => {
    const isLastSegment = index === f.segments.length - 1;
    const departureTime = formatDateTime(new Date(segment.departureTime), segment.departureTimezone);
    const arrivalTime = formatDateTime(new Date(segment.arrivalTime), segment.arrivalTimezone);
    const flightNumberWithLink = segment.flightNumber && 
      format.url(segment.flightNumber, flightAwareUrl(segment.flightNumber));

    const segmentLines = [
      `${format.bold(segment.airlineName)}${flightNumberWithLink ? ` \- ${flightNumberWithLink}` : ''}`,
      `${formatPort(segment.departureCity, segment.departureIataCode, segment.departureTerminal, segment.departureGate)} ➔ ` +
      `${formatPort(segment.arrivalCity, segment.arrivalIataCode, segment.arrivalTerminal, segment.arrivalGate)}`,
      `${departureTime} \- ${arrivalTime}`
    ];

    if (!isLastSegment) {
      const nextSegment = f.segments[index + 1];
      const layoverDuration = new Date(nextSegment.departureTime).getTime() - new Date(segment.arrivalTime).getTime();
      segmentLines.push('', `${format.italic(`Layover in ${segment.arrivalCity}: ${formatDuration(layoverDuration)}`)}`, '');
    }

    return segmentLines;
  });

  return [header, ...segmentMarkdowns].join('\n');
}

export function formatFlightItinerary(f: FlightItinerary) {
  const header = [
    `Passenger: ${format.bold(f.passengerName)}`,
    `${format.italic(f.trips[0].flightClass)}`,
    `Confirmation Code: ${format.bold(format.monospace(f.trips[0].confirmationCode))}`,
    ''
  ];

  const trips = f.trips.map(formatFlightTrip);
  const messageParts = [...header, ...trips];

  if (f.additionalNotes && f.additionalNotes.length > 0) {
    messageParts.push(DIVIDER, format.bold('Additional Notes:'), formatList(f.additionalNotes));
  }

  return messageParts.join('\n');
}

function formatCalendarEventDescription(segment: FlightSegment, passengerName: string): string {
  const formatSection = (title: string, details: Record<string, string | undefined>) => {
    const lines = Object.entries(details)
      .filter(([_, value]) => value)
      .map(([key, value]) => `• ${key}: ${value}`);
    return [`<b>${title}</b>`, ...lines].join('\n');
  };

  const departureDetails = {
    Time: formatDateTime(new Date(segment.departureTime), segment.departureTimezone),
    City: segment.departureCity,
    Terminal: segment.departureTerminal,
    Gate: segment.departureGate,
  };

  const arrivalDetails = {
    Time: formatDateTime(new Date(segment.arrivalTime), segment.arrivalTimezone),
    City: segment.arrivalCity,
    Terminal: segment.arrivalTerminal,
    Gate: segment.arrivalGate,
  };

  const sections = [
    `Passenger: <b>${passengerName}</b>`,
    segment.seatNumber && `Seat: <b>${segment.seatNumber}</b>`,
    '',
    formatSection('Departure', departureDetails),
    '',
    formatSection('Arrival', arrivalDetails),
    '',
    segment.flightNumber && 
      `<a href="${flightAwareUrl(segment.flightNumber)}">Flight tracking for ${segment.flightNumber}</a>`
  ];

  return sections.filter(Boolean).join('\n');
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
