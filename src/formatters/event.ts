import { CalendarEvent } from "@/types/calendarEvent";
import { Event } from "@/types/event";
import { format } from "date-fns";

export function formatEventToCalendarEvent(event: Event): CalendarEvent {
  return {
    summary: event.name,
    location: event.location,
    start: {
      dateTime: event.startTime,
    },
    end: {
      dateTime: event.endTime || event.startTime,
    },
  };
}

export function formatEvent(event: Event): string {
  const { name, location, startTime, endTime } = event;

  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : null;

  const formattedStartTime = format(startDate, "eee, MMM d, yyyy 'at' h:mm a");
  const formattedEndTime = endDate ? ` - ${format(endDate, "h:mm a")}` : "";

  return `${name}
📍 ${location}
⏰ ${formattedStartTime}${formattedEndTime}`;
}
