import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import TimeLogFilters from './time-log-filters';
import TimeLogSummary from './time-log-summary';
import TimeLogTable from './time-log-table';
import TimeLogModal from '@/components/modals/time-log-modal';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const TimeLogs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentTimeLog, setCurrentTimeLog] = useState<any>(null);
  const [timeLogToDelete, setTimeLogToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'all', // Changed default to 'all' to see all time logs
    client: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  // Build query params - run this on every render with current filters
  const queryParams = new URLSearchParams();
  
  // Filter by client
  if (filters.client && filters.client !== 'all') {
    queryParams.append('client', filters.client);
  }
  
  // Handle date filtering
  if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
  } else if (filters.dateRange === 'all') {
    // Don't apply date filtering for "all" date range
    console.log('Using all date range - no date filters applied');
  } else if (filters.dateRange !== 'custom' && filters.dateRange) {
    // Add the named date range - this is important to keep for debugging
    queryParams.append('dateRange', filters.dateRange);
    
    // ISSUE FOUND: We're using the current month date range (April) but our time logs are from March
    // For now, let's NOT filter by date at all to show all time logs
    // Remove date range filtering completely to see all data
  } else {
    // Default to all time logs if no date range specified
    queryParams.append('dateRange', 'all');
  }

  // Add search term if present
  if (filters.search) {
    // Trim the search term to avoid whitespace issues
    const trimmedSearch = filters.search.trim();
    if (trimmedSearch) {
      queryParams.append('search', trimmedSearch);
      console.log(`Adding search parameter: "${trimmedSearch}"`);
    }
  }

  // Fetch time logs with filters
  const { data: timeLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/time-logs', queryParams.toString()],
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0]}?${queryKey[1]}`;
      console.log('Fetching time logs with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch time logs');
      }
      const data = await response.json();
      console.log('Time logs data received:', data);
      
      // Log a sample time log client name to debug
      if (data && data.length > 0) {
        console.log('First time log client data:', {
          id: data[0].id,
          clientNameProperty: data[0].clientName,
          engagementClientName: data[0].engagement?.clientName,
          hourlyRate: data[0].engagement?.hourlyRate,
          billableAmount: data[0].billableAmount
        });
      }
      
      return data;
    },
    // Ensure we always get fresh data
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0, // Don't keep old data in cache
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Fetch engagements for client filter dropdown and the editing form
  const { data: engagements = [] } = useQuery<any[]>({
    queryKey: ['/api/engagements'],
  });
  
  // Extract unique client names for filter dropdown - get from time logs instead of engagements
  // This uses the correct clientName property location
  const clientOptions: string[] = Array.from(
    new Set([
      ...timeLogs.map((log: any) => log.clientName).filter(Boolean),
      ...engagements.map((engagement: any) => engagement.clientName).filter(Boolean)
    ])
  ).sort();

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = (open: boolean) => {
    if (!open) setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (timeLog: any) => {
    setCurrentTimeLog(timeLog);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = (open: boolean) => {
    if (!open) {
      setIsEditModalOpen(false);
      setCurrentTimeLog(null);
    }
  };

  const handleDeleteTimeLog = (id: number) => {
    setTimeLogToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!timeLogToDelete) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/time-logs/${timeLogToDelete}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete time log');
      }

      toast({
        title: 'Time log deleted',
        description: 'The time log has been deleted successfully.',
      });

      // Force a fresh refetch to update the UI immediately
      console.log('Force refreshing time log data after deletion');
      
      // Invalidate all time log queries 
      await queryClient.invalidateQueries({
        queryKey: ['/api/time-logs']
      });
      
      // Invalidate all dashboard queries
      await queryClient.invalidateQueries({
        queryKey: ['/api/dashboard']
      });
      
      // Extra measure - explicitly refetch the current view
      await queryClient.refetchQueries({ 
        queryKey: ['/api/time-logs', queryParams.toString()],
        exact: true
      });
    } catch (error) {
      console.error('Error deleting time log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time log',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDeleteModal = (open: boolean) => {
    if (!open) {
      setIsDeleteModalOpen(false);
      setTimeLogToDelete(null);
    }
  };

  const handleSuccess = async () => {
    // Force a fresh refetch to update the UI immediately
    console.log('Force refreshing time log data after operation');
    
    // Invalidate all time log queries with a more aggressive approach
    await queryClient.invalidateQueries({
      queryKey: ['/api/time-logs'],
      refetchType: 'all',
    });
    
    // Invalidate all dashboard queries
    await queryClient.invalidateQueries({
      queryKey: ['/api/dashboard'],
      refetchType: 'all',
    });
    
    // Extra measure - explicitly refetch all queries
    await queryClient.refetchQueries({
      type: 'all'
    });
    
    // Wait a moment for the UI to update
    setTimeout(() => {
      // Additional explicit refetch for the specific query
      queryClient.refetchQueries({ 
        queryKey: ['/api/time-logs', queryParams.toString()],
        exact: true
      });
    }, 100);
  };

  // Remove client-side filtering and use server-filtered data directly
  const filteredTimeLogs = timeLogs;

  // Calculate summary stats
  const totalHours = filteredTimeLogs.reduce((sum: number, log: any) => sum + log.hours, 0);
  const billableAmount = filteredTimeLogs.reduce((sum: number, log: any) => sum + log.billableAmount, 0);
  const avgDailyHours = filteredTimeLogs.length > 0 
    ? totalHours / (new Set(filteredTimeLogs.map((log: any) => new Date(log.date).toDateString())).size || 1)
    : 0;

  // Format for display
  const currentPeriod = filters.dateRange === 'custom'
    ? `Custom date range`
    : `${filters.dateRange === 'month' ? 'This Month' : 
        filters.dateRange === 'week' ? 'This Week' : 
        filters.dateRange === 'quarter' ? 'This Quarter' : 
        filters.dateRange === 'year' ? 'This Year' : 'All Time'}`;

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Time Logs</h1>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <Button 
              onClick={() => queryClient.invalidateQueries({queryKey: ['/api/time-logs']})}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button 
              onClick={handleOpenCreateModal} 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Time Log
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <TimeLogFilters
        filters={filters}
        setFilters={setFilters}
        clientOptions={clientOptions}
      />

      {/* Summary Stats */}
      <TimeLogSummary
        totalHours={totalHours}
        billableAmount={billableAmount}
        avgDailyHours={avgDailyHours}
        period={currentPeriod}
      />

      {/* Time Logs Table */}
      <TimeLogTable
        timeLogs={filteredTimeLogs}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteTimeLog}
      />

      {/* Create Modal */}
      <TimeLogModal
        open={isCreateModalOpen}
        onOpenChange={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <TimeLogModal
        open={isEditModalOpen}
        onOpenChange={handleCloseEditModal}
        timeLog={currentTimeLog}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Time Log"
        description="Are you sure you want to delete this time log? This action cannot be undone."
      />
    </div>
  );
};

export default TimeLogs;
