/**
 * Script to test date formatting
 */
import { format, isValid } from 'date-fns';

// Test dates from our API response
const testDates = [
  "2025-03-31T00:57:05.281Z",
  "2025-04-30T00:57:05.281Z",
  "2025-02-28T00:57:05.281Z",
  "2025-03-30T00:57:05.281Z"
];

// Test the formatting function
function formatDate(date) {
  const dateObj = new Date(date);
  console.log(`Original: ${date}`);
  console.log(`Date object: ${dateObj}`);
  console.log(`Valid: ${isValid(dateObj)}`);
  console.log(`Formatted: ${format(dateObj, 'MMM d, yyyy')}`);
  console.log('---');
}

// Run tests
console.log("Testing date formatting...\n");
testDates.forEach(date => formatDate(date));