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
  // Using April 2025 as our reference "today" to match the current date
  const demoToday = new Date(2025, 3, 3); // April 3, 2025
  
  switch (range) {
    case 'today':
      return { startDate: demoToday, endDate: demoToday };
    
    case 'week':
      return {
        startDate: startOfWeek(demoToday, { weekStartsOn: 1 }),
        endDate: endOfWeek(demoToday, { weekStartsOn: 1 })
      };
    
    case 'month':
      return {
        startDate: startOfMonth(demoToday),
        endDate: endOfMonth(demoToday)
      };
    
    case 'quarter':
      return {
        startDate: startOfQuarter(demoToday),
        endDate: endOfQuarter(demoToday)
      };
    
    case 'year':
      return {
        startDate: startOfYear(demoToday),
        endDate: endOfYear(demoToday)
      };
    
    case 'last3':
      return {
        startDate: startOfMonth(subMonths(demoToday, 3)),
        endDate: endOfMonth(demoToday)
      };
    
    case 'last6':
      return {
        startDate: startOfMonth(subMonths(demoToday, 6)),
        endDate: endOfMonth(demoToday)
      };
    
    case 'last12':
      return {
        startDate: startOfMonth(subMonths(demoToday, 12)),
        endDate: endOfMonth(demoToday)
      };
    
    default:
      return {
        startDate: startOfYear(demoToday),
        endDate: endOfYear(demoToday)
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
  // Using the provided date or defaulting to our reference date (April 3, 2025)
  return format(date, 'yyyy-MM-dd');
}
