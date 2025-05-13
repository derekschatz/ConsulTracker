import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import EngagementFilters from './engagement-filters';
import EngagementTable from './engagement-table';
import EngagementModal from '@/components/modals/engagement-modal';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import InvoiceHistoryModal from '@/components/modals/invoice-history-modal';
import ClientManagementModal from '@/components/modals/client-management-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface Filters {
  status: string;
  client: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
}

// Interface for the engagement data returned from the API
interface Engagement {
  id: number;
  userId: number;
  clientId: number;
  projectName: string;
  startDate: string;
  endDate: string;
  hourlyRate: string | null;
  projectAmount: string | number | null;
  engagementType: 'hourly' | 'project';
  status: string;
  clientName: string;
  [key: string]: any; // Allow for additional properties
}

const Engagements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInvoiceHistoryModalOpen, setIsInvoiceHistoryModalOpen] = useState(false);
  const [isClientManagementModalOpen, setIsClientManagementModalOpen] = useState(false);
  const [currentEngagement, setCurrentEngagement] = useState<Engagement | null>(null);
  const [engagementToDelete, setEngagementToDelete] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [allClients, setAllClients] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'all'
  });

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthLoading && !user) {
      window.location.href = '/login';
    } else if (user) {
      queryClient.invalidateQueries({ queryKey: ['/api/direct/engagements'] });
    }
  }, [user, isAuthLoading, queryClient]);

  // Fetch all unique client names once on component mount
  useEffect(() => {
    fetchAllClients();
  }, []);

  // Fetch engagements using the direct query endpoint
  const { data: allEngagements = [], isLoading } = useQuery<Engagement[]>({
    queryKey: ['/api/direct/engagements'],
    queryFn: async () => {
      const response = await fetch('/api/direct/engagements');
      if (!response.ok) {
        throw new Error('Failed to fetch engagements');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });

  // Apply filters client-side
  const filteredEngagements = allEngagements.filter(engagement => {
    // Status filter
    if (filters.status !== 'all' && engagement.status !== filters.status) {
      return false;
    }
    
    // Client filter
    if (filters.client !== 'all' && engagement.clientName !== filters.client) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      const engagementStart = new Date(engagement.startDate);
      const engagementEnd = new Date(engagement.endDate);
      
      if (engagementEnd < startDate || engagementStart > endDate) {
        return false;
      }
    }
    
    return true;
  });

  // Function to fetch all clients
  const fetchAllClients = async () => {
    try {
      const response = await fetch('/api/direct/engagements');
      if (!response.ok) throw new Error('Failed to fetch engagements');
      const data = await response.json();
      
      // Extract unique client names
      const clientNames: string[] = Array.from(
        new Set(data.map((engagement: Engagement) => engagement.clientName))
      ).filter((name): name is string => typeof name === 'string' && name !== '');
      
      setAllClients(clientNames);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = (open: boolean) => {
    if (!open) setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (engagement: Engagement) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/direct/engagements'] });
    } catch (error) {
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

  const handleSuccess = async () => {
    // Force a fresh refetch to update the UI immediately
    await queryClient.refetchQueries({ 
      queryKey: ['/api/direct/engagements'],
      type: 'all',
      exact: false,
      stale: true
    });
    
    // Also invalidate dashboard stats and any other related queries
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        return typeof queryKey === 'string' && 
          (queryKey.startsWith('/api/dashboard') || 
           queryKey.startsWith('/api/engagements') ||
           queryKey.startsWith('/api/direct'));
      }
    });
    
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

  const handleOpenClientManagementModal = () => {
    setIsClientManagementModalOpen(true);
  };

  const handleCloseClientManagementModal = (open: boolean) => {
    if (!open) {
      setIsClientManagementModalOpen(false);
      // Refresh the client list to get any new or updated clients
      fetchAllClients();
    }
  };

  // Use the separately fetched client list for the dropdown
  const clientOptions: string[] = allClients;

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Engagements</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0">
            <Button
              onClick={handleOpenClientManagementModal}
              variant="outline"
              size="sm"
              className="mb-2 sm:mb-0 sm:mr-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Clients
            </Button>
            <Button 
              onClick={handleOpenCreateModal} 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Engagement
            </Button>
          </div>
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

      {/* Client Management Modal */}
      <ClientManagementModal
        open={isClientManagementModalOpen}
        onOpenChange={handleCloseClientManagementModal}
      />
    </div>
  );
};

export default Engagements;
