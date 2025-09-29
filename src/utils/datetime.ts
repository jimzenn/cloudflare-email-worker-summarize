import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const DATE_TIME_FORMAT = 'yyyy/MM/dd h:mm aa';

export const formatDateTime = (date: Date, tz?: string): string => {
  if (!tz) {
    return format(date, DATE_TIME_FORMAT);
  }
  return formatInTimeZone(date, tz, DATE_TIME_FORMAT);
};

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;

/**
 * Formats a duration in milliseconds into a string like "Xh Ym".
 *
 * @param durationMs The duration in milliseconds.
 * @returns A formatted string representing the duration.
 */
export const formatDuration = (durationMs: number): string => {
  if (durationMs < 0) {
    // Duration should not be negative, but as a safeguard, we return 0.
    return '0h 0m';
  }

  const hours = Math.floor(durationMs / ONE_HOUR_IN_MS);
  const remainingMs = durationMs % ONE_HOUR_IN_MS;
  const minutes = Math.floor(remainingMs / ONE_MINUTE_IN_MS);

  return `${hours}h ${minutes}m`;
};
