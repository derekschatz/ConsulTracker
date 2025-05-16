/**
 * Utility function to calculate engagement status
 * This file is imported dynamically in routes.ts
 */

/**
 * Calculate the engagement status based on the engagement data
 * @param {Object} engagement - The engagement object
 * @returns {string} The status of the engagement (active, completed, upcoming, unknown)
 */
export function calculateEngagementStatus(engagement) {
  if (!engagement) return 'unknown';
  
  // If the engagement has a status already, return it
  if (engagement.status) return engagement.status;
  
  const now = new Date();
  const startDate = engagement.start_date ? new Date(engagement.start_date) : null;
  const endDate = engagement.end_date ? new Date(engagement.end_date) : null;
  
  if (!startDate) return 'unknown';
  
  if (startDate > now) return 'upcoming';
  if (endDate && endDate < now) return 'completed';
  return 'active';
}

export default {
  calculateEngagementStatus
}; 