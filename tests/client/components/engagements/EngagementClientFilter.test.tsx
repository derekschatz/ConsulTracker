import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engagements from '@/components/engagements/engagements';
import { getDateRange } from '@/lib/date-utils';

// Mock the API response
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [
        // 2023 engagement - should not appear in current year view
        {
          id: 1,
          clientName: 'GlobalFirm',
          projectName: 'UX Research 2023',
          startDate: '2023-05-03T00:00:00.000Z',
          endDate: '2023-08-03T23:59:59.999Z',
          status: 'completed',
          hourlyRate: 145
        },
        // 2024 engagement - should not appear in current year view
        {
          id: 2,
          clientName: 'Acme Corp',
          projectName: 'Website Redesign 2023',
          startDate: '2023-02-03T00:00:00.000Z',
          endDate: '2023-06-03T23:59:59.999Z',
          status: 'active',
          hourlyRate: 125
        },
        // 2024-2025 overlapping engagement - should appear in current year view
        {
          id: 3,
          clientName: 'TechStart',
          projectName: 'Strategy Consulting 2024',
          startDate: '2024-01-03T00:00:00.000Z',
          endDate: '2025-05-03T23:59:59.999Z',
          status: 'active',
          hourlyRate: 150
        },
        // 2025 engagement - should appear in current year view
        {
          id: 4,
          clientName: 'GlobalFirm',
          projectName: 'UX Research 2025',
          startDate: '2025-05-03T00:00:00.000Z',
          endDate: '2025-08-03T23:59:59.999Z',
          status: 'active',
          hourlyRate: 145
        }
      ],
      isLoading: false
    })
  };
});

describe('Engagement Client-Side Filtering', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only show engagements that overlap with current year (2025)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Engagements />
      </QueryClientProvider>
    );

    // The 2023 engagements should not be visible
    expect(screen.queryByText('UX Research 2023')).not.toBeInTheDocument();
    expect(screen.queryByText('Website Redesign 2023')).not.toBeInTheDocument();
    
    // The 2024-2025 and 2025 engagements should be visible
    expect(screen.getByText('Strategy Consulting 2024')).toBeInTheDocument();
    expect(screen.getByText('UX Research 2025')).toBeInTheDocument();
  });

  it('should correctly filter for date ranges', async () => {
    const { startDate: yearStart, endDate: yearEnd } = getDateRange('current');
    
    // Test our sample data with the same filter logic used in the component
    const testData = [
      {
        id: 1,
        clientName: 'GlobalFirm',
        projectName: 'UX Research 2023',
        startDate: '2023-05-03T00:00:00.000Z',
        endDate: '2023-08-03T23:59:59.999Z'
      },
      {
        id: 2,
        clientName: 'Acme Corp',
        projectName: 'Website Redesign 2023',
        startDate: '2023-02-03T00:00:00.000Z',
        endDate: '2023-06-03T23:59:59.999Z'
      },
      {
        id: 3,
        clientName: 'TechStart',
        projectName: 'Strategy Consulting 2024',
        startDate: '2024-01-03T00:00:00.000Z',
        endDate: '2025-05-03T23:59:59.999Z'
      },
      {
        id: 4,
        clientName: 'GlobalFirm',
        projectName: 'UX Research 2025',
        startDate: '2025-05-03T00:00:00.000Z',
        endDate: '2025-08-03T23:59:59.999Z'
      }
    ];
    
    const filtered = testData.filter(engagement => {
      const engagementStartDate = new Date(engagement.startDate);
      const engagementEndDate = new Date(engagement.endDate);
      
      return (
        // Starts during the year
        (engagementStartDate >= yearStart && engagementStartDate <= yearEnd) ||
        // Ends during the year
        (engagementEndDate >= yearStart && engagementEndDate <= yearEnd) ||
        // Spans the entire year
        (engagementStartDate <= yearStart && engagementEndDate >= yearEnd)
      );
    });
    
    expect(filtered.length).toBe(2);
    expect(filtered.map(e => e.id)).toEqual([3, 4]);
    expect(filtered.map(e => e.projectName)).toEqual(['Strategy Consulting 2024', 'UX Research 2025']);
  });
  
  it('should properly handle custom date range filtering with date strings', () => {
    // Test data with various date ranges
    const testData = [
      {
        id: 1,
        projectName: 'January 2024',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      },
      {
        id: 2,
        projectName: 'February 2024',
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-02-29T23:59:59.999Z'
      },
      {
        id: 3,
        projectName: 'March 2024',
        startDate: '2024-03-01T00:00:00.000Z',
        endDate: '2024-03-31T23:59:59.999Z'
      },
      {
        id: 4,
        projectName: 'Q1 Long Project',
        startDate: '2024-01-15T00:00:00.000Z',
        endDate: '2024-03-15T23:59:59.999Z'
      }
    ];
    
    // Create custom date range filters (Feb 1 to Mar 15)
    const customStartStr = '2024-02-01';
    const customEndStr = '2024-03-15';
    
    // Parse date strings properly as we do in the component
    const customStartParts = customStartStr.split('-').map(Number);
    const customEndParts = customEndStr.split('-').map(Number);
    
    const customStart = new Date(customStartParts[0], customStartParts[1] - 1, customStartParts[2]);
    const customEnd = new Date(customEndParts[0], customEndParts[1] - 1, customEndParts[2]);
    
    // Set time components for proper day-level comparison
    customStart.setHours(0, 0, 0, 0);
    customEnd.setHours(23, 59, 59, 999);
    
    const filtered = testData.filter(engagement => {
      const engagementStartDate = new Date(engagement.startDate);
      const engagementEndDate = new Date(engagement.endDate);
      
      return (
        // Starts during the range
        (engagementStartDate >= customStart && engagementStartDate <= customEnd) ||
        // Ends during the range
        (engagementEndDate >= customStart && engagementEndDate <= customEnd) ||
        // Spans the entire range
        (engagementStartDate <= customStart && engagementEndDate >= customEnd)
      );
    });
    
    // February, March and Q1 Long Project should all be included
    // (February starts during the range, March ends during the range, Q1 spans the range)
    expect(filtered.length).toBe(3);
    expect(filtered.map(e => e.projectName)).toContain('February 2024');
    expect(filtered.map(e => e.projectName)).toContain('March 2024');
    expect(filtered.map(e => e.projectName)).toContain('Q1 Long Project');
    expect(filtered.map(e => e.projectName)).not.toContain('January 2024');
  });
}); 