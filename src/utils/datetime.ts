import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const formatDateTime = (date: Date, tz?: string): string => {
  if (!tz) {
    return format(date, 'yyyy/MM/dd h:mm aa');
  }
  return formatInTimeZone(date, tz, 'yyyy/MM/dd h:mm aa');
};

export const formatDuration = (durationMs: number): string => {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};
