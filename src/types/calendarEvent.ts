// https://developers.google.com/calendar/api/v3/reference/events

export interface CalendarEvent {
    summary: string;
    description?: string;
    location?: string;
    colorId?: string;
    start: {
      date?: string;  // Date-only (YYYY-MM-DD)
      dateTime?: string;  // Full date/time in RFC3339
      timeZone?: string;
    };
    end: {
      date?: string;  // Date-only (YYYY-MM-DD)
      dateTime?: string;  // Full date/time in RFC3339
      timeZone?: string;
    };
    recurrence?: string[];  // RRULE, EXRULE, RDATE and EXDATE entries
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
    conferenceData?: {
      createRequest?: {
        requestId?: string;
        conferenceSolutionKey?: {
          type: string;
        };
      };
    };
    source?: {
      url?: string;
      title?: string;
    };
    attachments?: Array<{
      fileUrl: string;
      title: string;
      mimeType?: string;
    }>;
  }
  