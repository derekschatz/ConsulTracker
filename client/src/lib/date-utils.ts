import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from 'date-fns';

// Format a date to a string with specified format
export function formatDate(date: Date | string, formatStr = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  return format(dateObj, formatStr);
}

// Parse a string to a Date object
export function parseDate(dateStr: string, formatStr = 'yyyy-MM-dd'): Date | null {
  try {
    const parsed = parse(dateStr, formatStr, new Date());
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

// Get date range based on predefined ranges
export function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const today = new Date();
  
  switch (range) {
    case 'today':
      return { startDate: today, endDate: today };
    
    case 'week':
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 })
      };
    
    case 'month':
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(today)
      };
    
    case 'quarter':
      return {
        startDate: startOfQuarter(today),
        endDate: endOfQuarter(today)
      };
    
    case 'year':
      return {
        startDate: startOfYear(today),
        endDate: endOfYear(today)
      };
    
    case 'last3':
      return {
        startDate: startOfMonth(subMonths(today, 3)),
        endDate: endOfMonth(today)
      };
    
    case 'last6':
      return {
        startDate: startOfMonth(subMonths(today, 6)),
        endDate: endOfMonth(today)
      };
    
    case 'last12':
      return {
        startDate: startOfMonth(subMonths(today, 12)),
        endDate: endOfMonth(today)
      };
    
    default:
      return {
        startDate: startOfYear(today),
        endDate: endOfYear(today)
      };
  }
}

// Calculate the difference between two dates in days
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date range as a string
export function formatDateRange(startDate: Date, endDate: Date): string {
  if (startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()) {
    return format(startDate, 'MMMM d, yyyy');
  }
  
  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${format(startDate, 'MMMM d')} - ${format(endDate, 'd, yyyy')}`;
    }
    return `${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}`;
  }
  
  return `${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`;
}

// Get the current year
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Function to check if a date is in the past
export function isDateInPast(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return compareDate < today;
}

// Function to check if a date is in the future
export function isDateInFuture(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return compareDate > today;
}

// Function to check if a date is today
export function isDateToday(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    compareDate.getDate() === today.getDate() &&
    compareDate.getMonth() === today.getMonth() &&
    compareDate.getFullYear() === today.getFullYear()
  );
}

// Get ISO formatted date string (YYYY-MM-DD)
export function getISODate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
