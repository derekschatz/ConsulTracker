import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EngagementFilters from '@/components/engagements/engagement-filters';
import { getDateRange } from '@/lib/date-utils';

describe('EngagementFilters', () => {
  const queryClient = new QueryClient();
  const mockSetFilters = vi.fn();
  
  const defaultFilters = {
    status: 'all',
    client: 'all',
    dateRange: 'current',
    startDate: undefined,
    endDate: undefined
  };

  const mockClientOptions = ['Client A', 'Client B'];

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EngagementFilters
          filters={defaultFilters}
          setFilters={mockSetFilters}
          clientOptions={mockClientOptions}
        />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date Range Selection', () => {
    it('should update filters when selecting current year', async () => {
      renderComponent();
      
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      
      const currentYearOption = screen.getByText('Current Year');
      fireEvent.click(currentYearOption);

      const { startDate, endDate } = getDateRange('current');
      
      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({
          dateRange: 'current',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }));
      });
    });

    it('should update filters when selecting this month', async () => {
      renderComponent();
      
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      
      const thisMonthOption = screen.getByText('This Month');
      fireEvent.click(thisMonthOption);

      const { startDate, endDate } = getDateRange('month');
      
      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({
          dateRange: 'month',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }));
      });
    });

    it('should show custom date inputs when selecting custom range', async () => {
      renderComponent();
      
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      
      const customRangeOption = screen.getByText('Custom Range');
      fireEvent.click(customRangeOption);

      await waitFor(() => {
        expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
      });
    });

    it('should update filters when changing custom date range', async () => {
      renderComponent();
      
      // Select custom range
      const dateRangeSelect = screen.getByLabelText(/Date Range/i);
      fireEvent.click(dateRangeSelect);
      const customRangeOption = screen.getByText('Custom Range');
      fireEvent.click(customRangeOption);

      // Set custom dates
      const startDateInput = screen.getByLabelText(/Start Date/i);
      const endDateInput = screen.getByLabelText(/End Date/i);
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({
          dateRange: 'custom',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }));
      });
    });
  });
}); 