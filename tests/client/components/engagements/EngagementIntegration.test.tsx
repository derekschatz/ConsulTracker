import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engagements from '@/components/engagements/engagements';
import { getDateRange } from '@/lib/date-utils';
import type { Engagement } from '@/types';

// Mock the API call
vi.mock('@/lib/api', () => ({
  getEngagements: vi.fn()
}));

import { getEngagements } from '@/lib/api';

describe('Engagements Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockEngagements = [
    {
      id: 1,
      clientName: 'Test Client A',
      projectName: 'Project 2024-2025',
      startDate: '2024-06-01',
      endDate: '2025-05-31',
      status: 'active',
      hourlyRate: 150
    },
    {
      id: 2,
      clientName: 'Test Client B',
      projectName: 'Project 2025',
      startDate: '2025-01-15',
      endDate: '2025-12-31',
      status: 'upcoming',
      hourlyRate: 200
    },
    {
      id: 3,
      clientName: 'Test Client C',
      projectName: 'April 2025 Project',
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      status: 'active',
      hourlyRate: 175
    }
  ];

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Engagements />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getEngagements as Mock).mockResolvedValue({ engagements: mockEngagements });
  });

  describe('Date Range Filtering Integration', () => {
    it('should fetch and display engagements for current year', async () => {
      renderComponent();

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Project 2025')).toBeInTheDocument();
      });

      // Verify current year filter shows correct engagements
      expect(screen.getByText('Project 2024-2025')).toBeInTheDocument();
      expect(screen.getByText('Project 2025')).toBeInTheDocument();
      expect(screen.getByText('April 2025 Project')).toBeInTheDocument();

      // Verify API was called with correct parameters
      const { startDate, endDate } = getDateRange('current');
      expect(getEngagements).toHaveBeenCalledWith(expect.objectContaining({
        dateRange: 'current',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    });

    it('should fetch and display engagements for current month', async () => {
      renderComponent();

      // Select "This Month" from date range filter
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      const thisMonthOption = screen.getByText('This Month');
      fireEvent.click(thisMonthOption);

      // Wait for data to update
      await waitFor(() => {
        expect(screen.getByText('April 2025 Project')).toBeInTheDocument();
      });

      // Verify month filter shows correct engagements
      expect(screen.getByText('Project 2024-2025')).toBeInTheDocument();
      expect(screen.getByText('April 2025 Project')).toBeInTheDocument();

      // Verify API was called with correct parameters
      const { startDate, endDate } = getDateRange('month');
      expect(getEngagements).toHaveBeenCalledWith(expect.objectContaining({
        dateRange: 'month',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    });

    it('should fetch and display engagements for custom date range', async () => {
      renderComponent();

      // Select "Custom Range" from date range filter
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      const customRangeOption = screen.getByText('Custom Range');
      fireEvent.click(customRangeOption);

      // Set custom date range
      const startDateInput = screen.getByLabelText(/Start Date/i);
      const endDateInput = screen.getByLabelText(/End Date/i);
      fireEvent.change(startDateInput, { target: { value: '2024-06-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

      // Wait for data to update
      await waitFor(() => {
        expect(screen.getByText('Project 2024-2025')).toBeInTheDocument();
      });

      // Verify API was called with correct parameters
      expect(getEngagements).toHaveBeenCalledWith(expect.objectContaining({
        dateRange: 'custom',
        startDate: '2024-06-01',
        endDate: '2024-12-31'
      }));
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      (getEngagements as Mock).mockRejectedValue(new Error('API Error'));
      renderComponent();

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/Error loading engagements/i)).toBeInTheDocument();
      });
    });
  });
}); 