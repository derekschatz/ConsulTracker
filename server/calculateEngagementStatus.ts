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
  // Ensure we're dealing with Date objects
  if (!(startDate instanceof Date)) {
    console.error('startDate is not a Date object:', startDate, typeof startDate);
    startDate = new Date(startDate);
  }
  
  if (!(endDate instanceof Date)) {
    console.error('endDate is not a Date object:', endDate, typeof endDate);
    endDate = new Date(endDate);
  }
  
  const today = new Date();
  
  // Normalize all dates to midnight to avoid time-of-day comparisons
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  console.log('Status check:', {
    today: normalizedToday.toISOString(),
    todayTime: normalizedToday.getTime(),
    start: normalizedStart.toISOString(),
    startTime: normalizedStart.getTime(),
    end: normalizedEnd.toISOString(),
    endTime: normalizedEnd.getTime(),
    isAfterEnd: normalizedToday > normalizedEnd,
    isBeforeStart: normalizedToday < normalizedStart
  });

  // Check if engagement is completed
  if (normalizedToday > normalizedEnd) {
    console.log('Engagement COMPLETED: today is after end date');
    return 'completed';
  }
  
  // Check if engagement is upcoming
  if (normalizedToday < normalizedStart) {
    console.log('Engagement UPCOMING: today is before start date');
    return 'upcoming';
  }
  
  // Otherwise it's active
  console.log('Engagement ACTIVE: today is between start and end dates');
  return 'active';
} 