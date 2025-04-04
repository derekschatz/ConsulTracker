import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EngagementFilters from './engagement-filters';
import EngagementTable from './engagement-table';
import EngagementModal from '@/components/modals/engagement-modal';
import DeleteConfirmationModal from '@/components/modals/delete-confirmation-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getDateRange } from '@/lib/date-utils';

interface Filters {
  status: string;
  client: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
}

const Engagements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentEngagement, setCurrentEngagement] = useState<any>(null);
  const [engagementToDelete, setEngagementToDelete] = useState<{id: number, name?: string}|null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'all'
  });

  // Build query params
  let queryParams = new URLSearchParams();
  
  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    queryParams.append('status', filters.status);
  }
  
  // Apply client filter
  if (filters.client && filters.client !== 'all') {
    queryParams.append('client', filters.client);
  }
  
  // Apply date range filter
  if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
    // For custom date ranges, we need to ensure the backend gets dates in the correct format
    // and that our frontend filtering uses the same date interpretation
    const customStartParts = filters.startDate.split('-').map(Number);
    const customEndParts = filters.endDate.split('-').map(Number);
    
    // Create date objects for consistent formatting
    const customStart = new Date(customStartParts[0], customStartParts[1] - 1, customStartParts[2]);
    const customEnd = new Date(customEndParts[0], customEndParts[1] - 1, customEndParts[2]);
    
    // Set time components for consistent day boundary handling
    customStart.setHours(0, 0, 0, 0);
    customEnd.setHours(23, 59, 59, 999);
    
    // Format as ISO date strings (YYYY-MM-DD)
    const formattedStartDate = customStart.toISOString().split('T')[0];
    const formattedEndDate = customEnd.toISOString().split('T')[0];
    
    console.log('Custom date filter params:', { 
      startDate: formattedStartDate, 
      endDate: formattedEndDate 
    });
    
    // Send the properly formatted dates to the backend
    queryParams.append('startDate', formattedStartDate);
    queryParams.append('endDate', formattedEndDate);
  } else if (filters.dateRange) {
    queryParams.append('dateRange', filters.dateRange);
  }

  // Fetch engagements with filters
  const { data: engagements = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/engagements', queryParams.toString()],
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (engagement: any) => {
    setCurrentEngagement(engagement);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentEngagement(null);
  };

  const handleDeleteRequest = (id: number) => {
    // Find the engagement by id to get its name
    const engagement = engagements.find(e => e.id === id);
    if (engagement) {
      setEngagementToDelete({
        id,
        name: `${engagement.clientName} - ${engagement.projectName}`
      });
      setIsDeleteModalOpen(true);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEngagementToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!engagementToDelete) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/engagements/${engagementToDelete.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete engagement');
      }

      toast({
        title: 'Engagement deleted',
        description: 'The engagement has been deleted successfully.',
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
      
      // Close the modal
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting engagement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete engagement',
        variant: 'destructive',
      });
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
  };

  // Add client-side filtering to ensure we only show engagements that match the current filter criteria
  const filteredEngagements = engagements.filter((engagement: any) => {
    // First, check if the client filter matches (if specified)
    if (filters.client !== 'all' && engagement.clientName !== filters.client) {
      return false; // Skip this engagement if client doesn't match
    }
    
    // Then, check if the status filter matches (if specified)
    if (filters.status !== 'all' && engagement.status !== filters.status) {
      return false; // Skip this engagement if status doesn't match
    }
    
    const engagementStartDate = new Date(engagement.startDate);
    const engagementEndDate = new Date(engagement.endDate);
    
    // Get the date range based on the current filter
    if (filters.dateRange === 'all') {
      // Show all engagements regardless of date
      return true;
    } else if (filters.dateRange === 'current') {
      const { startDate: yearStart, endDate: yearEnd } = getDateRange('current');
      
      // Check if the engagement overlaps with the current year
      return (
        // Starts during the year
        (engagementStartDate >= yearStart && engagementStartDate <= yearEnd) ||
        // Ends during the year
        (engagementEndDate >= yearStart && engagementEndDate <= yearEnd) ||
        // Spans the entire year
        (engagementStartDate <= yearStart && engagementEndDate >= yearEnd)
      );
    } else if (filters.dateRange === 'last') {
      const { startDate: yearStart, endDate: yearEnd } = getDateRange('last');
      
      // Check if the engagement overlaps with the last year
      return (
        // Starts during the year
        (engagementStartDate >= yearStart && engagementStartDate <= yearEnd) ||
        // Ends during the year
        (engagementEndDate >= yearStart && engagementEndDate <= yearEnd) ||
        // Spans the entire year
        (engagementStartDate <= yearStart && engagementEndDate >= yearEnd)
      );
    } else if (filters.dateRange === 'month') {
      const { startDate: monthStart, endDate: monthEnd } = getDateRange('month');
      
      // Check if the engagement overlaps with the current month
      return (
        // Starts during the month
        (engagementStartDate >= monthStart && engagementStartDate <= monthEnd) ||
        // Ends during the month
        (engagementEndDate >= monthStart && engagementEndDate <= monthEnd) ||
        // Spans the entire month
        (engagementStartDate <= monthStart && engagementEndDate >= monthEnd)
      );
    } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      // Parse the date strings correctly to handle potential timezone issues
      // Format is 'YYYY-MM-DD' from the input field, so we need to parse it specifically
      const customStartParts = filters.startDate.split('-').map(Number);
      const customEndParts = filters.endDate.split('-').map(Number);
      
      // Create date objects using year, month (0-based), and day
      const customStart = new Date(customStartParts[0], customStartParts[1] - 1, customStartParts[2]);
      const customEnd = new Date(customEndParts[0], customEndParts[1] - 1, customEndParts[2]);
      
      // Set time components appropriately for day-level comparison
      customStart.setHours(0, 0, 0, 0);
      customEnd.setHours(23, 59, 59, 999);
      
      // Check if the engagement overlaps with the custom date range
      return (
        // Starts during the range
        (engagementStartDate >= customStart && engagementStartDate <= customEnd) ||
        // Ends during the range
        (engagementEndDate >= customStart && engagementEndDate <= customEnd) ||
        // Spans the entire range
        (engagementStartDate <= customStart && engagementEndDate >= customEnd)
      );
    }
    
    // If no matching filter, return true to include all engagements
    return true;
  });

  // Extract unique client names for filter dropdown
  const clientOptions: string[] = Array.from(
    new Set(engagements.map((engagement: any) => engagement.clientName))
  );

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Engagements</h1>
          <Button 
            onClick={handleOpenCreateModal} 
            className="mt-3 sm:mt-0"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Engagement
          </Button>
        </div>
      </header>

      {/* Filters */}
      <EngagementFilters
        filters={filters}
        setFilters={setFilters}
        clientOptions={clientOptions}
      />

      {/* Engagements Table */}
      <EngagementTable
        engagements={filteredEngagements}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteRequest}
      />

      {/* Create Modal */}
      <EngagementModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <EngagementModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        engagement={currentEngagement}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Engagement"
        itemName={engagementToDelete?.name}
        itemType="engagement"
      />
    </div>
  );
};

export default Engagements;
