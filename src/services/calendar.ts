import { CalendarEvent } from '@/types/calendarEvent';
import { Env } from '@/types/env';
import { generateJWT } from '@/utils/jwt';

export async function createCalendarEvent(event: CalendarEvent, env: Env) {
  try {
    console.log('Generating JWT for calendar event creation...');
    const jwt = await generateJWT(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON_KEY));

    console.log('Sending request to Google Calendar API...', {
      eventSummary: event.summary,
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to create calendar event:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });
      throw new Error(`Failed to create calendar event: ${response.statusText}`);
    }

    console.log('Successfully created calendar event:', {
      eventId: data.id,
      htmlLink: data.htmlLink,
    });

    return data;
  } catch (error) {
    console.error('Error in createCalendarEvent:', error);
    throw error;
  }
}
