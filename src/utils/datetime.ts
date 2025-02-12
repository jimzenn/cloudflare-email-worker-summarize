import { format } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

export const formatDateTime = (date: Date, tz?: string): string => {
  const targetDate = tz ? zonedTimeToUtc(date, tz) : date;
  return format(targetDate, 'yyyy/MM/dd h:mm aa');
};

export const formatDuration = (durationMs: number): string => {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};
