import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TimeLogFilters from './time-log-filters';
import TimeLogSummary from './time-log-summary';
import TimeLogTable from './time-log-table';
import TimeLogModal from '@/components/modals/time-log-modal';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getDateRange } from '@/lib/date-utils';

const TimeLogs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentTimeLog, setCurrentTimeLog] = useState<any>(null);
  const [timeLogToDelete, setTimeLogToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'month',
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
  } else if (filters.dateRange !== 'custom' && filters.dateRange) {
    // Add the named date range AND the calculated dates for redundancy
    queryParams.append('dateRange', filters.dateRange);
    const { startDate, endDate } = getDateRange(filters.dateRange);
    queryParams.append('startDate', startDate.toISOString().split('T')[0]);
    queryParams.append('endDate', endDate.toISOString().split('T')[0]);
  } else {
    // Default to current month if no date range specified
    queryParams.append('dateRange', 'month');
    const { startDate, endDate } = getDateRange('month');
    queryParams.append('startDate', startDate.toISOString().split('T')[0]);
    queryParams.append('endDate', endDate.toISOString().split('T')[0]);
  }

  // Add search term if present
  if (filters.search) {
    queryParams.append('search', filters.search);
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
      return response.json();
    },
  });

  // Fetch engagements for client filter dropdown and the editing form
  const { data: engagements = [] } = useQuery<any[]>({
    queryKey: ['/api/engagements'],
  });
  
  // Extract unique client names for filter dropdown
  const clientOptions: string[] = Array.from(
    new Set(engagements.map((engagement: any) => engagement.clientName))
  );

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (timeLog: any) => {
    setCurrentTimeLog(timeLog);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentTimeLog(null);
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

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error) {
      console.error('Error deleting time log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time log',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTimeLogToDelete(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
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
          <Button 
            onClick={handleOpenCreateModal} 
            className="mt-3 sm:mt-0"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Time Log
          </Button>
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
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <TimeLogModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        timeLog={currentTimeLog}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Time Log"
        description="Are you sure you want to delete this time log? This action cannot be undone."
      />
    </div>
  );
};

export default TimeLogs;
