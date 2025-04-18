import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InvoiceModal from '../invoice-modal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';
import userEvent from '@testing-library/user-event';

// Mock the useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch for time logs
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

// Sample test data
const mockEngagements = [
  { id: 1, clientName: 'Client A', status: 'active', rate: 100 },
  { id: 2, clientName: 'Client B', status: 'active', rate: 150 },
  { id: 3, clientName: 'Client A', status: 'active', rate: 200 },
];

const mockTimeLogs = [
  { id: 1, hours: 2, billableAmount: 200 },
  { id: 2, hours: 3, billableAmount: 300 },
];

// Create a new QueryClient instance for testing
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(() => Promise.resolve({ ok: true }))
}));

// Wrap component with necessary providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
};

describe('InvoiceModal', () => {
  // Mock props
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    preselectedClientName: 'Test Client',
    preselectedEngagementId: 123
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset queryClient
    queryClient.clear();
    // Mock the engagements query
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/time-logs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTimeLogs),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders correctly when open', () => {
    renderWithProviders(<InvoiceModal {...mockProps} />);
    expect(screen.getByText('Generate Invoice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', () => {
    renderWithProviders(<InvoiceModal {...mockProps} />);
    const closeButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(closeButton);
    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles empty engagement data gracefully', () => {
    const propsWithoutEngagement = {
      open: true,
      onOpenChange: vi.fn(),
      onSuccess: vi.fn()
    };
    renderWithProviders(<InvoiceModal {...propsWithoutEngagement} />);
    expect(screen.getByText('Generate Invoice')).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    renderWithProviders(<InvoiceModal {...mockProps} />);
    const submitButton = screen.getByRole('button', { name: /generate invoice/i });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Client name is required')).toBeInTheDocument();
      expect(screen.getByText('Billing start is required')).toBeInTheDocument();
      expect(screen.getByText('Billing end is required')).toBeInTheDocument();
      expect(screen.getByText('Net terms are required')).toBeInTheDocument();
    });
  });

  it('disables submit button when no time logs are present', () => {
    renderWithProviders(<InvoiceModal {...mockProps} />);
    const submitButton = screen.getByRole('button', { name: /generate invoice/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles date selection correctly', async () => {
    renderWithProviders(<InvoiceModal {...mockProps} />);
    
    const startDateInput = screen.getByLabelText(/billing start/i);
    const endDateInput = screen.getByLabelText(/billing end/i);
    
    const startDate = '2024-03-01';
    const endDate = '2024-03-31';
    
    await userEvent.type(startDateInput, startDate);
    await userEvent.type(endDateInput, endDate);
    
    expect(startDateInput).toHaveValue(startDate);
    expect(endDateInput).toHaveValue(endDate);
  });

  it('handles client selection correctly', async () => {
    // Mock the active engagements query response
    const mockEngagements = [
      { id: 1, clientName: 'Test Client', status: 'active' },
      { id: 2, clientName: 'Another Client', status: 'active' }
    ];

    vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue(mockEngagements);

    renderWithProviders(<InvoiceModal {...mockProps} />);
    
    const clientSelect = screen.getByRole('combobox', { name: /client/i });
    await userEvent.click(clientSelect);
    
    // Wait for client options to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument();
      expect(screen.getByText('Another Client')).toBeInTheDocument();
    });
  });

  it('handles successful form submission', async () => {
    const mockTimeLogs = [
      { id: 1, hours: 2, billableAmount: 200 },
      { id: 2, hours: 3, billableAmount: 300 }
    ];

    // Mock the time logs query response
    vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue(mockTimeLogs);

    renderWithProviders(<InvoiceModal {...mockProps} />);

    // Fill in required fields
    await userEvent.type(screen.getByLabelText(/billing start/i), '2024-03-01');
    await userEvent.type(screen.getByLabelText(/billing end/i), '2024-03-31');
    await userEvent.type(screen.getByLabelText(/net terms/i), '30');

    const submitButton = screen.getByRole('button', { name: /generate invoice/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalled();
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // New test cases for time logs fetching and calculations
  it('fetches and displays time logs when engagement and dates are selected', async () => {
    renderWithProviders(
      <InvoiceModal {...mockProps} />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/time-logs?engagementId=123'),
        expect.any(Object)
      );
    });

    // Check if totals are displayed
    await waitFor(() => {
      expect(screen.getByText('5.00 hours')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });
  });

  it('handles time logs API error gracefully', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch'))
    );

    renderWithProviders(
      <InvoiceModal {...mockProps} />
    );

    await waitFor(() => {
      expect(screen.queryByText('5.00 hours')).not.toBeInTheDocument();
      expect(screen.queryByText('$500.00')).not.toBeInTheDocument();
    });
  });

  // Test client selection and engagement filtering
  it('filters engagements when client is selected', async () => {
    renderWithProviders(
      <InvoiceModal {...mockProps} />
    );

    // Select Client A
    const clientSelect = screen.getByLabelText('Client Name');
    await userEvent.click(clientSelect);
    await userEvent.click(screen.getByText('Client A'));

    // Should only show Client A's engagements
    const engagementSelect = screen.getByLabelText('Engagement');
    await userEvent.click(engagementSelect);
    
    await waitFor(() => {
      expect(screen.queryAllByRole('option')).toHaveLength(2); // Client A has 2 engagements
    });
  });

  // Test form validation
  it('validates all required fields before submission', async () => {
    renderWithProviders(
      <InvoiceModal {...mockProps} />
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create invoice/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Client name is required')).toBeInTheDocument();
      expect(screen.getByText('Engagement is required')).toBeInTheDocument();
      expect(screen.getByText('Billing start is required')).toBeInTheDocument();
      expect(screen.getByText('Billing end is required')).toBeInTheDocument();
      expect(screen.getByText('Net terms are required')).toBeInTheDocument();
    });
  });

  // Test date handling
  it('handles date formatting correctly', async () => {
    renderWithProviders(
      <InvoiceModal {...mockProps} />
    );

    // Set dates
    const startDate = screen.getByLabelText('Period Start');
    const endDate = screen.getByLabelText('Period End');

    await userEvent.clear(startDate);
    await userEvent.type(startDate, '2024-03-01');
    await userEvent.clear(endDate);
    await userEvent.type(endDate, '2024-03-31');

    await waitFor(() => {
      expect(startDate).toHaveValue('2024-03-01');
      expect(endDate).toHaveValue('2024-03-31');
    });

    // Verify time logs are fetched with correct date format
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('startDate=2024-03-01'),
      expect.any(Object)
    );
  });

  // Test modal reset on close
  it('resets form and state when modal is closed', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <InvoiceModal {...mockProps} onOpenChange={onOpenChange} />
    );

    // Fill some form data
    const clientSelect = screen.getByLabelText('Client Name');
    await userEvent.click(clientSelect);
    await userEvent.click(screen.getByText('Client A'));

    // Close modal
    const closeButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Reopen modal and verify form is reset
    renderWithProviders(
      <InvoiceModal {...mockProps} open={true} />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Client Name')).toHaveValue('');
      expect(screen.getByLabelText('Engagement')).toHaveValue('');
    });
  });
}); 