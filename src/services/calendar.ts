import { CalendarEvent } from '@/types/calendarEvent';
import { Env } from '@/types/env';
import { generateJWT } from '@/utils/jwt';

export async function createCalendarEvent(event: CalendarEvent, env: Env) {

  const jwt = await generateJWT(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON_KEY));

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

  return await response.json();
}
