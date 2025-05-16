/**
 * Date utility functions for formatting and manipulating dates
 */

import { format } from 'date-fns';

/**
 * Formats a date for display in the application
 * @param {Date|string} date - The date to format
 * @param {string} formatString - The format string to use (default: 'yyyy-MM-dd')
 * @returns {string} The formatted date string
 */
export function formatDateForDisplay(date, formatString = 'yyyy-MM-dd') {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}

/**
 * Formats a date as a short date (MM/dd/yyyy)
 * @param {Date|string} date - The date to format
 * @returns {string} The formatted date string
 */
export function formatShortDate(date) {
  return formatDateForDisplay(date, 'MM/dd/yyyy');
}

/**
 * Formats a date as a long date (MMMM d, yyyy)
 * @param {Date|string} date - The date to format
 * @returns {string} The formatted date string
 */
export function formatLongDate(date) {
  return formatDateForDisplay(date, 'MMMM d, yyyy');
}

export default {
  formatDateForDisplay,
  formatShortDate,
  formatLongDate
}; 