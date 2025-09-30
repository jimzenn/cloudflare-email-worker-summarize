import { CalendarEvent } from '@/types/calendarEvent';
import { Env } from '@/types/env';
import { getGoogleAccessToken } from '@/services/googleOAuth';

export class CalendarServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CalendarServiceError';
  }
}

export async function createCalendarEvent(event: CalendarEvent, env: Env) {
  try {
    console.log('[Calendar] Getting Google access token...');
    const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON_KEY);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    console.log('[Calendar] Sending request to Google Calendar API...', {
      eventSummary: event.summary,
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Calendar] Failed to create calendar event:', data);
      throw new CalendarServiceError(`Failed to create calendar event: ${response.statusText}`, data);
    }

    console.log('[Calendar] Successfully created calendar event:', {
      eventId: data.id,
      htmlLink: data.htmlLink,
    });

    return data;
  } catch (error) {
    if (error instanceof CalendarServiceError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[Calendar] Error in createCalendarEvent: ${message}`, {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new CalendarServiceError(`Error creating calendar event: ${message}`, error);
  }
}
