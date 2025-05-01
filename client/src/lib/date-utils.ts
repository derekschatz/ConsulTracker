import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, differenceInDays, parseISO, addDays as dateFnsAddDays } from 'date-fns';

// Re-export parseISO from date-fns for easier imports
export { parseISO };

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Format a date to a string with specified format
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

// Parse a string to a Date object
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
}

// Get date range based on predefined ranges
export function getDateRange(range: string, referenceDate: Date = new Date()): DateRange {
  switch (range) {
    case 'current':
      return {
        startDate: startOfYear(referenceDate),
        endDate: endOfYear(referenceDate)
      };
    
    case 'last':
      const lastYear = new Date(referenceDate);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return {
        startDate: startOfYear(lastYear),
        endDate: endOfYear(lastYear)
      };

    case 'week':
      return {
        startDate: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(referenceDate, { weekStartsOn: 1 })
      };
    
    case 'month':
      return {
        startDate: startOfMonth(referenceDate),
        endDate: endOfMonth(referenceDate)
      };
    
    case 'quarter':
      return {
        startDate: startOfQuarter(referenceDate),
        endDate: endOfQuarter(referenceDate)
      };
    
    case 'year':
      return {
        startDate: startOfYear(referenceDate),
        endDate: endOfYear(referenceDate)
      };
    
    case 'last3':
      return {
        startDate: startOfMonth(subMonths(referenceDate, 3)),
        endDate: endOfMonth(referenceDate)
      };
    
    case 'last6':
      return {
        startDate: startOfMonth(subMonths(referenceDate, 6)),
        endDate: endOfMonth(referenceDate)
      };
    
    case 'last12':
      return {
        startDate: startOfMonth(subMonths(referenceDate, 12)),
        endDate: endOfMonth(referenceDate)
      };
    
    default:
      return {
        startDate: startOfYear(referenceDate),
        endDate: endOfYear(referenceDate)
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
export function getISODate(date?: Date | string): string {
  // If no date provided, use the demo today date (April 3, 2025)
  if (!date) {
    return format(new Date(2025, 3, 3), 'yyyy-MM-dd');
  }
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

export function parseISODate(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

// Format a date for display in the UI
export function formatDateForDisplay(date: Date | string | null): string {
  if (!date) {
    return '';
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }
  return dateObj.toLocaleDateString();
}

export function formatDateTimeForDisplay(date: Date): string {
  return format(date, 'MMM d, yyyy h:mm a');
}

export function isValidDateString(dateString: string): boolean {
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return !isNaN(date.getTime());
}

// Get start of day without timezone adjustment
export function startOfDay(date: Date): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to startOfDay');
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Get end of day without timezone adjustment
export function endOfDay(date: Date): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to endOfDay');
  }
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Convert a date to storage format (YYYY-MM-DD)
export function toStorageDate(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Add days to a date without timezone issues
export function addDays(date: Date, days: number): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to addDays');
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Parse a date string in YYYY-MM-DD format to a local Date object at midnight
export function parseLocalDate(str: string): Date | null {
  if (!str || typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return null;
  }
  const [year, month, day] = str.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}

// Convert a storage date (YYYY-MM-DD) to a local Date object
export function fromStorageDate(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }
  return parseLocalDate(dateStr);
}

// Format a date string as MM/DD/YYYY without timezone conversion
export function formatDateNoTZ(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD, use it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  }
  // If ISO string, extract date part
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
  }
  return dateStr;
}
