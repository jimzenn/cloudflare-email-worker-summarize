// https://developers.google.com/calendar/api/v3/reference/events

import { EventDateTime } from "./calendar";

export interface BasicCalendarEvent {
  summary: string;
  description: string;
  location: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: Array<{
    email: string;
    displayName?: string;
    optional?: boolean;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    comment?: string;
    additionalGuests?: number;
  }>;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  transparency?: 'opaque' | 'transparent';
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  source?: {
    url: string;
    title: string;
  };
}