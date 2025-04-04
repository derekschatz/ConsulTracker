import { format, parse, isValid, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

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
export function getDateRange(range: string, referenceDate: Date = new Date()): DateRange {
  switch (range) {
    case 'all':
      // All time: use a very wide range to include all engagements
      // For demo purposes, we'll use 2020-2030 range
      return {
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2030, 11, 31)
      };
    
    case 'current':
      // Current Year: entire current year (Jan 1st to Dec 31st)
      return {
        startDate: startOfYear(referenceDate),
        endDate: endOfYear(referenceDate)
      };
    
    case 'last':
      // Last Year: entire previous year
      const lastYear = new Date(referenceDate);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return {
        startDate: startOfYear(lastYear),
        endDate: endOfYear(lastYear)
      };
    
    case 'month':
      // This Month: all dates in current month
      return {
        startDate: startOfMonth(referenceDate),
        endDate: endOfMonth(referenceDate)
      };
    
    default:
      // Default to current year
      return {
        startDate: startOfYear(referenceDate),
        endDate: referenceDate
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

// Get the current year - using 2025 as the current year
export function getCurrentYear(): number {
  // Using 2025 as the current year
  return 2025;
}

// Function to check if a date is in the past
export function isDateInPast(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  // Using April 3, 2025 as our reference "today"
  const demoToday = new Date(2025, 3, 3);
  demoToday.setHours(0, 0, 0, 0);
  return compareDate < demoToday;
}

// Function to check if a date is in the future
export function isDateInFuture(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  // Using April 3, 2025 as our reference "today"
  const demoToday = new Date(2025, 3, 3);
  demoToday.setHours(0, 0, 0, 0);
  return compareDate > demoToday;
}

// Function to check if a date is today
export function isDateToday(date: Date | string): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  // Using April 3, 2025 as our reference "today"
  const demoToday = new Date(2025, 3, 3);
  return (
    compareDate.getDate() === demoToday.getDate() &&
    compareDate.getMonth() === demoToday.getMonth() &&
    compareDate.getFullYear() === demoToday.getFullYear()
  );
}

// Get ISO formatted date string (YYYY-MM-DD)
export function getISODate(date: Date = new Date(2025, 3, 3)): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseISODate(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

export function formatDateForDisplay(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

export function formatDateTimeForDisplay(date: Date): string {
  return format(date, 'MMM d, yyyy h:mm a');
}

export function isValidDateString(dateString: string): boolean {
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return !isNaN(date.getTime());
}

export function getStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function getEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
