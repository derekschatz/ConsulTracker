import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EngagementFilters from './engagement-filters';
import EngagementTable from './engagement-table';
import EngagementModal from '@/components/modals/engagement-modal';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import InvoiceHistoryModal from '@/components/modals/invoice-history-modal';
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInvoiceHistoryModalOpen, setIsInvoiceHistoryModalOpen] = useState(false);
  const [currentEngagement, setCurrentEngagement] = useState<any>(null);
  const [engagementToDelete, setEngagementToDelete] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [allClients, setAllClients] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'current'
  });

  // Fetch all unique client names once on component mount
  useEffect(() => {
    fetchAllClients();
  }, []);

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
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0]}?${queryKey[1]}`;
      console.log('Fetching engagements with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch engagements');
      }
      return response.json();
    },
  });

  // Function to fetch all clients
  const fetchAllClients = async () => {
    try {
      // Request all engagements with no client filter to get all client names
      const response = await fetch(`/api/engagements?dateRange=all`);
      if (!response.ok) throw new Error('Failed to fetch engagements');
      const data = await response.json();
      
      // Extract unique client names with proper type safety
      const clientNames: string[] = Array.from(
        new Set(data.map((engagement: any) => engagement.clientName as string))
      ).filter((name): name is string => typeof name === 'string' && name !== '');
      
      setAllClients(clientNames);
    } catch (error) {
      console.error('Error fetching client names:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = (open: boolean) => {
    if (!open) setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (engagement: any) => {
    setCurrentEngagement(engagement);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = (open: boolean) => {
    if (!open) {
      setIsEditModalOpen(false);
      setCurrentEngagement(null);
    }
  };

  const handleDeleteEngagement = (id: number) => {
    setEngagementToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!engagementToDelete) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/engagements/${engagementToDelete}`);
      
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
  };

  const handleCloseDeleteModal = (open: boolean) => {
    if (!open) {
      setIsDeleteModalOpen(false);
      setEngagementToDelete(null);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
    // Refresh the client list in case a new client was added
    fetchAllClients();
  };

  const handleViewInvoiceHistory = (clientName: string) => {
    setSelectedClient(clientName);
    setIsInvoiceHistoryModalOpen(true);
  };

  const handleCloseInvoiceHistoryModal = (open: boolean) => {
    if (!open) {
      setIsInvoiceHistoryModalOpen(false);
      setSelectedClient('');
    }
  };

  // No need to filter engagements client-side since we're handling it on the server
  const filteredEngagements = engagements;

  // Use the separately fetched client list for the dropdown
  const clientOptions: string[] = allClients;

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Engagements</h1>
          </div>
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
        onViewInvoiceHistory={handleViewInvoiceHistory}
      />

      {/* Create Modal */}
      <EngagementModal
        open={isCreateModalOpen}
        onOpenChange={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <EngagementModal
        open={isEditModalOpen}
        onOpenChange={handleCloseEditModal}
        engagement={currentEngagement}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Engagement"
        description="Are you sure you want to delete this engagement? This action cannot be undone and will remove all associated time logs."
      />

      {/* Invoice History Modal */}
      <InvoiceHistoryModal
        open={isInvoiceHistoryModalOpen}
        onOpenChange={handleCloseInvoiceHistoryModal}
        clientName={selectedClient}
      />
    </div>
  );
};

export default Engagements;
