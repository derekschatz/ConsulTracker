import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        // 2023 engagement
        {
          id: 1,
          clientName: 'GlobalFirm',
          projectName: 'UX Research 2023',
          startDate: '2023-05-03T00:00:00.000Z',
          endDate: '2023-08-03T23:59:59.999Z',
          status: 'completed',
          hourlyRate: 145
        },
        // 2024 engagement
        {
          id: 2,
          clientName: 'Acme Corp',
          projectName: 'Website Redesign 2024',
          startDate: '2024-02-03T00:00:00.000Z',
          endDate: '2024-06-03T23:59:59.999Z',
          status: 'active',
          hourlyRate: 125
        },
        // 2025 engagement
        {
          id: 3,
          clientName: 'TechStart',
          projectName: 'Strategy Consulting 2025',
          startDate: '2025-01-03T00:00:00.000Z',
          endDate: '2025-05-03T23:59:59.999Z',
          status: 'active',
          hourlyRate: 150
        },
        // 2026 future engagement
        {
          id: 4,
          clientName: 'NewClient',
          projectName: 'Future Project 2026',
          startDate: '2026-01-15T00:00:00.000Z',
          endDate: '2026-12-15T23:59:59.999Z',
          status: 'upcoming',
          hourlyRate: 175
        }
      ],
      isLoading: false
    })
  };
});

describe('Engagement All Filter', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display all engagements when "All Engagements" filter is selected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Engagements />
      </QueryClientProvider>
    );

    // With new default of 'all', all engagements should be visible initially
    expect(screen.getByText('UX Research 2023')).toBeInTheDocument();
    expect(screen.getByText('Website Redesign 2024')).toBeInTheDocument();
    expect(screen.getByText('Strategy Consulting 2025')).toBeInTheDocument();
    expect(screen.getByText('Future Project 2026')).toBeInTheDocument();

    // Change to current year filter
    const dateRangeSelect = screen.getByLabelText(/Date Range/i);
    fireEvent.click(dateRangeSelect);
    const currentYearOption = screen.getByText('Current Year');
    fireEvent.click(currentYearOption);
    
    // Now only 2025 engagement should be visible
    await waitFor(() => {
      expect(screen.queryByText('UX Research 2023')).not.toBeInTheDocument();
      expect(screen.queryByText('Website Redesign 2024')).not.toBeInTheDocument();
      expect(screen.getByText('Strategy Consulting 2025')).toBeInTheDocument();
      expect(screen.queryByText('Future Project 2026')).not.toBeInTheDocument();
    });

    // Change back to all engagements
    fireEvent.click(dateRangeSelect);
    const allEngagementsOption = screen.getByText('All Engagements');
    fireEvent.click(allEngagementsOption);
    
    // All engagements should be visible again
    await waitFor(() => {
      expect(screen.getByText('UX Research 2023')).toBeInTheDocument();
      expect(screen.getByText('Website Redesign 2024')).toBeInTheDocument();
      expect(screen.getByText('Strategy Consulting 2025')).toBeInTheDocument();
      expect(screen.getByText('Future Project 2026')).toBeInTheDocument();
    });
  });

  it('should correctly filter all engagements regardless of date', () => {
    // Test data with engagements from various years
    const testData = [
      { id: 1, projectName: '2022 Project', startDate: '2022-01-01', endDate: '2022-12-31' },
      { id: 2, projectName: '2023 Project', startDate: '2023-01-01', endDate: '2023-12-31' },
      { id: 3, projectName: '2024 Project', startDate: '2024-01-01', endDate: '2024-12-31' },
      { id: 4, projectName: '2025 Project', startDate: '2025-01-01', endDate: '2025-12-31' },
      { id: 5, projectName: '2026 Project', startDate: '2026-01-01', endDate: '2026-12-31' }
    ];
    
    // Use the "all" date range to filter
    const { startDate, endDate } = getDateRange('all');
    
    // Apply the filter logic
    const filteredEngagements = testData.filter(engagement => {
      const engagementStart = new Date(engagement.startDate);
      const engagementEnd = new Date(engagement.endDate);
      
      return (
        (engagementStart >= startDate && engagementStart <= endDate) ||
        (engagementEnd >= startDate && engagementEnd <= endDate) ||
        (engagementStart <= startDate && engagementEnd >= endDate)
      );
    });
    
    // All engagements should be included
    expect(filteredEngagements.length).toBe(5);
  });
}); 