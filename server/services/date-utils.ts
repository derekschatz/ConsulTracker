import { format, parseISO } from 'date-fns';

export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
}
