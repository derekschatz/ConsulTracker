import { format, parseISO } from 'date-fns';

export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
}

export function adjustDateForTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate() + 1  // Add one day to compensate for timezone shift
  );
} 