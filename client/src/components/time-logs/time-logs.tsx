import { useState, useMemo } from 'react';
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

  // Fetch engagements for client filter dropdown and the editing form
  const { data: engagements = [] } = useQuery<any[]>({
    queryKey: ['/api/engagements'],
  });
  
  // Build query params
  const queryParams = new URLSearchParams();
  
  // Only add client if not 'all' and not empty
  if (filters.client && filters.client !== 'all') {
    queryParams.append('client', filters.client);
  }
  
  // Only add search if not empty
  if (filters.search && filters.search.trim() !== '') {
    queryParams.append('search', filters.search.trim());
  }
  
  // Handle date filtering
  if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
    queryParams.append('dateRange', 'custom');
  } else if (filters.dateRange !== 'all') {
    // For specific date ranges (week, month, quarter, year)
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (filters.dateRange) {
      case 'week': {
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      }
      case 'month': {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      }
      case 'quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      }
      case 'year': {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      }
      default: {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
    }
    queryParams.append('startDate', startDate.toISOString().split('T')[0]);
    queryParams.append('endDate', endDate.toISOString().split('T')[0]);
    queryParams.append('dateRange', filters.dateRange);
  } else {
    // Only send dateRange=all, do NOT send startDate or endDate at all
    queryParams.append('dateRange', 'all');
  }

  // Fetch time logs with filters
  const { data: timeLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/time-logs', queryParams.toString()],
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0]}?${queryKey[1]}`;
      console.log('Fetching time logs with URL:', url);
      console.log('Current filters:', filters);
      console.log('Query parameters:', Object.fromEntries(queryParams.entries()));
      
      const response = await fetch(url);
      if (!response.ok) {
        // Log detailed error information
        const errorText = await response.text();
        console.error(`Error fetching time logs (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch time logs: ${errorText}`);
      }
      const data = await response.json();
      console.log('Time logs data received:', data);
      return data;
    },
    // Ensure we always get fresh data
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0, // Don't keep old data in cache
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
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
          <h1 className="text-2xl font-semibold text-foreground">Time Logs</h1>
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
