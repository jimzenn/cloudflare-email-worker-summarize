import { CalendarEvent } from "@/types/calendarEvent";
import { Event } from "@/types/zod/event";
import { format } from "date-fns";

export function formatEventToCalendarEvent(event: Event): CalendarEvent {
  return {
    summary: event.name,
    location: event.location,
    start: {
      dateTime: event.start_time,
    },
    end: {
      dateTime: event.end_time || event.start_time,
    },
  };
}

export function formatEvent(event: Event): string {
  const { name, location, start_time, end_time } = event;

  const startDate = new Date(start_time);
  const endDate = end_time ? new Date(end_time) : null;

  const formattedStartTime = format(startDate, "eee, MMM d, yyyy 'at' h:mm a");
  const formattedEndTime = endDate ? ` - ${format(endDate, "h:mm a")}` : "";

  return `${name}
📍 ${location}
⏰ ${formattedStartTime}${formattedEndTime}`;
}
