export type EventDateTime =
  | { date: string; dateTime?: never; timeZone?: string }
  | { date?: never; dateTime: string; timeZone?: string };