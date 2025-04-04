import { describe, it, expect } from 'vitest';

describe('Date Parsing Consistency Tests', () => {
  it('should parse dates consistently between frontend and backend methods', () => {
    // Test dates in ISO format (YYYY-MM-DD)
    const testDates = [
      '2024-01-15',
      '2024-02-29', // Leap year
      '2024-12-31',
      '2025-01-01'
    ];

    // Frontend parsing method (using date parts)
    function parseWithDateParts(dateStr: string) {
      const dateParts = dateStr.split('-').map(Number);
      const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    // Backend/standard parsing (using new Date())
    function parseWithStandardMethod(dateStr: string) {
      const date = new Date(dateStr);
      // Ensure we're comparing at the same time within day
      date.setHours(0, 0, 0, 0);
      return date;
    }

    // Test each date with both parsing methods
    for (const dateStr of testDates) {
      const dateParsed1 = parseWithDateParts(dateStr);
      const dateParsed2 = parseWithStandardMethod(dateStr);
      
      // Check year, month, and day are identical
      expect(dateParsed1.getFullYear()).toBe(dateParsed2.getFullYear());
      expect(dateParsed1.getMonth()).toBe(dateParsed2.getMonth());
      expect(dateParsed1.getDate()).toBe(dateParsed2.getDate());
      
      // Log the full dates for debugging
      console.log(`Date: ${dateStr}`);
      console.log(`- Parts method: ${dateParsed1.toISOString()}`);
      console.log(`- Standard method: ${dateParsed2.toISOString()}`);
    }
  });

  it('should correctly filter engagements based on date range', () => {
    // Sample engagement data
    const engagements = [
      {
        id: 1,
        projectName: 'Project A',
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-04-30T23:59:59.999Z'
      },
      {
        id: 2,
        projectName: 'Project B',
        startDate: '2024-05-15T00:00:00.000Z',
        endDate: '2024-08-15T23:59:59.999Z'
      },
      {
        id: 3,
        projectName: 'Long Project',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z'
      }
    ];

    // Define a date range for March-June 2024
    const startDateStr = '2024-03-01';
    const endDateStr = '2024-06-30';
    
    // Parse date range - frontend method
    const startDateParts = startDateStr.split('-').map(Number);
    const endDateParts = endDateStr.split('-').map(Number);
    
    const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
    const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter engagements using our overlap logic
    const filteredEngagements = engagements.filter(engagement => {
      const engagementStartParts = engagement.startDate.split('T')[0].split('-').map(Number);
      const engagementEndParts = engagement.endDate.split('T')[0].split('-').map(Number);
      
      const engagementStart = new Date(
        engagementStartParts[0], 
        engagementStartParts[1] - 1, 
        engagementStartParts[2]
      );
      const engagementEnd = new Date(
        engagementEndParts[0], 
        engagementEndParts[1] - 1, 
        engagementEndParts[2]
      );
      
      engagementStart.setHours(0, 0, 0, 0);
      engagementEnd.setHours(23, 59, 59, 999);
      
      return (
        // Starts during the range
        (engagementStart >= startDate && engagementStart <= endDate) ||
        // Ends during the range
        (engagementEnd >= startDate && engagementEnd <= endDate) ||
        // Spans the entire range
        (engagementStart <= startDate && engagementEnd >= endDate)
      );
    });
    
    // We expect all three projects to be included because:
    // - Project A: ends during the range (April 30 is within Mar-Jun)
    // - Project B: starts during the range (May 15 is within Mar-Jun)
    // - Long Project: spans the entire range (Jan-Dec encompasses Mar-Jun)
    expect(filteredEngagements.length).toBe(3);
    expect(filteredEngagements.map(e => e.id)).toEqual([1, 2, 3]);
  });
}); 