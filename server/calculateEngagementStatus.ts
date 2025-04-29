/**
 * Calculates the status of an engagement based on its start and end dates
 * 
 * @param startDate The start date of the engagement
 * @param endDate The end date of the engagement
 * @returns 'active' | 'upcoming' | 'completed'
 */
export function calculateEngagementStatus(
  startDate: Date,
  endDate: Date
): 'active' | 'upcoming' | 'completed' {
  const today = new Date();
  
  // Normalize all dates to midnight to avoid time-of-day comparisons
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  console.log('Status check:', {
    today: normalizedToday.toISOString(),
    start: normalizedStart.toISOString(),
    end: normalizedEnd.toISOString()
  });

  // Check if engagement is completed
  if (normalizedToday > normalizedEnd) {
    return 'completed';
  }
  
  // Check if engagement is upcoming
  if (normalizedToday < normalizedStart) {
    return 'upcoming';
  }
  
  // Otherwise it's active
  return 'active';
} 