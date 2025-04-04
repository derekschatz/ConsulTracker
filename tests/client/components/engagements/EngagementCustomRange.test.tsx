import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engagements from '@/components/engagements/engagements';

// Mock the API response
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [
        // Jan-Apr 2024 engagement
        {
          id: 1,
          clientName: 'TechStart',
          projectName: 'Early 2024 Project',
          startDate: '2024-01-15T00:00:00.000Z',
          endDate: '2024-04-20T23:59:59.999Z',
          status: 'completed',
          hourlyRate: 150
        },
        // May-Aug 2024 engagement
        {
          id: 2,
          clientName: 'Acme Corp',
          projectName: 'Mid 2024 Project',
          startDate: '2024-05-10T00:00:00.000Z',
          endDate: '2024-08-15T23:59:59.999Z',
          status: 'completed',
          hourlyRate: 125
        },
        // Sep-Dec 2024 engagement
        {
          id: 3,
          clientName: 'GlobalFirm',
          projectName: 'Late 2024 Project',
          startDate: '2024-09-05T00:00:00.000Z',
          endDate: '2024-12-20T23:59:59.999Z',
          status: 'completed',
          hourlyRate: 145
        },
        // 2025 engagement
        {
          id: 4,
          clientName: 'NewClient',
          projectName: '2025 Project',
          startDate: '2025-02-01T00:00:00.000Z',
          endDate: '2025-06-30T23:59:59.999Z',
          status: 'active',
          hourlyRate: 160
        }
      ],
      isLoading: false
    })
  };
});

// Mock the date-utils to ensure consistent testing
vi.mock('@/lib/date-utils', async () => {
  const actual = await vi.importActual('@/lib/date-utils');
  return {
    ...actual,
    getISODate: (date = new Date(2025, 3, 3)) => {
      return date.toISOString().split('T')[0];
    }
  };
});

describe('Engagement Custom Date Range Filtering', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // This test simulates selecting a custom date range and checks if correct engagements are displayed
  it('should correctly filter engagements based on custom date range', async () => {
    // Render component with QueryClientProvider
    render(
      <QueryClientProvider client={queryClient}>
        <Engagements />
      </QueryClientProvider>
    );

    // Initial view should show 2025 engagements only (current year filter)
    expect(screen.getByText('2025 Project')).toBeInTheDocument();
    expect(screen.queryByText('Early 2024 Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Mid 2024 Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Late 2024 Project')).not.toBeInTheDocument();

    // Select custom date range
    const dateRangeSelect = screen.getByLabelText(/Date Range/i);
    fireEvent.click(dateRangeSelect);
    const customRangeOption = screen.getByText('Custom Range');
    fireEvent.click(customRangeOption);

    // Wait for custom range inputs to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    });

    // Set custom date range for May-October 2024
    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    
    fireEvent.change(startDateInput, { target: { value: '2024-05-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-10-31' } });

    // Allow component to update
    await waitFor(() => {
      // Mid 2024 Project and Late 2024 Project should be visible (overlap with May-Oct 2024)
      expect(screen.queryByText('Early 2024 Project')).not.toBeInTheDocument();
      expect(screen.getByText('Mid 2024 Project')).toBeInTheDocument();
      expect(screen.getByText('Late 2024 Project')).toBeInTheDocument();
      expect(screen.queryByText('2025 Project')).not.toBeInTheDocument();
    });

    // Change date range to include 2025
    fireEvent.change(startDateInput, { target: { value: '2024-10-01' } });
    fireEvent.change(endDateInput, { target: { value: '2025-03-31' } });

    // Allow component to update
    await waitFor(() => {
      // Late 2024 Project and 2025 Project should be visible (overlap with Oct 2024-Mar 2025)
      expect(screen.queryByText('Early 2024 Project')).not.toBeInTheDocument();
      expect(screen.queryByText('Mid 2024 Project')).not.toBeInTheDocument();
      expect(screen.getByText('Late 2024 Project')).toBeInTheDocument();
      expect(screen.getByText('2025 Project')).toBeInTheDocument();
    });
  });
}); 