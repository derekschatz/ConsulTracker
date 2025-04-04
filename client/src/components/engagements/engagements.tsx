import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EngagementFilters from './engagement-filters';
import EngagementTable from './engagement-table';
import EngagementModal from '@/components/modals/engagement-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  const [currentEngagement, setCurrentEngagement] = useState<any>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'current'
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
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
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

  const handleDeleteEngagement = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this engagement?')) {
      try {
        const response = await apiRequest('DELETE', `/api/engagements/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to delete engagement');
        }

        toast({
          title: 'Engagement deleted',
          description: 'The engagement has been deleted successfully.',
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
      } catch (error) {
        console.error('Error deleting engagement:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete engagement',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
  };

  // No need to filter engagements client-side since we're handling it on the server
  const filteredEngagements = engagements;

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
        onDelete={handleDeleteEngagement}
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
    </div>
  );
};

export default Engagements;
