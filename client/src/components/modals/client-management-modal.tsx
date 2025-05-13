import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientDetailsPanel } from './client-details-panel';
import { DeleteConfirmationModal } from './delete-confirmation-modal';
import { ClientFormModal } from './client-form-modal';
import { apiRequest } from '@/lib/queryClient';
import { useSubscription } from '@/hooks/use-subscription';
import { useLocation } from 'wouter';

interface Client {
  id: number;
  name: string;
  billingContactName?: string;
  billingContactEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
}

interface ClientManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientManagementModal({
  open,
  onOpenChange
}: ClientManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [clientToDeleteName, setClientToDeleteName] = useState<string>('');
  const { isSubscriptionActive, tier, isSolo } = useSubscription();

  // Fetch clients
  const { data: clients = [], isLoading, refetch } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: open, // Only fetch when modal is open
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsDetailsOpen(false);
      setIsCreateOpen(false);
      setIsDeleteOpen(false);
      setSelectedClientId(null);
      setClientToDelete(null);
      setClientToDeleteName('');
    }
  }, [open]);

  const handleViewDetails = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsDetailsOpen(true);
  };

  const handleCreateClient = () => {
    // Check if user is on the free tier and already has 5 clients
    if (isSolo && clients.length >= 5) {
      toast({
        title: 'Client limit reached',
        description: 'Free accounts are limited to 5 clients. Upgrade to Pro for unlimited clients.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreateOpen(true);
  };

  const handleUpgrade = () => {
    onOpenChange(false); // Close the modal
    navigate('/pricing'); // Navigate to pricing page
  };

  const handleDeleteClient = (clientId: number, clientName: string) => {
    setClientToDelete(clientId);
    setClientToDeleteName(clientName);
    setIsDeleteOpen(true);
  };

  const checkActiveEngagements = async (clientId: number): Promise<boolean> => {
    try {
      // Fetch active engagements for this client
      const response = await fetch(`/api/engagements?client=${clientToDeleteName}&status=active`);
      if (!response.ok) {
        throw new Error('Failed to check active engagements');
      }
      
      const engagements = await response.json();
      return engagements.length > 0;
    } catch (error) {
      console.error('Error checking active engagements:', error);
      // In case of error, prevent deletion to be safe
      return true;
    }
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete === null) return;

    try {
      // Check if client has active engagements
      const hasActiveEngagements = await checkActiveEngagements(clientToDelete);
      
      if (hasActiveEngagements) {
        toast({
          title: 'Cannot delete client',
          description: `This client has active engagements. Complete or delete all engagements before deleting the client.`,
          variant: 'destructive',
        });
        setIsDeleteOpen(false);
        return;
      }

      // Proceed with deletion if no active engagements
      const response = await apiRequest('DELETE', `/api/clients/${clientToDelete}`);
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast({
        title: 'Client deleted',
        description: 'The client has been successfully deleted',
      });

      // Refresh client list
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
      await refetch();
      
      // Close delete modal
      setIsDeleteOpen(false);
      setClientToDelete(null);
      setClientToDeleteName('');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      });
    }
  };

  const handleClientCreated = async () => {
    await refetch();
    setIsCreateOpen(false);
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
  };

  // Check if user has reached the free tier client limit
  const hasReachedClientLimit = isSolo && clients.length >= 5;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Clients</DialogTitle>
            <DialogDescription>
              View, edit, or delete your client information.
              {isSolo && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Free accounts are limited to 5 clients.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex justify-end">
            {hasReachedClientLimit ? (
              <Button onClick={handleUpgrade} size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
                <CreditCard className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            ) : (
              <Button onClick={handleCreateClient} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Client
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No clients found. Create your first client to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div 
                  key={client.id} 
                  className="flex items-center justify-between p-3 rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  <div>
                    <h3 className="font-medium">{client.name}</h3>
                    {client.billingContactName && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {client.billingContactName}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDetails(client.id)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700" 
                      onClick={() => handleDeleteClient(client.id, client.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasReachedClientLimit && (
            <div className="mt-4 p-3 bg-muted rounded-md border border-border">
              <p className="text-sm text-center">
                You've reached the limit of 5 clients on the free plan.
                <br />
                <span className="font-medium">Upgrade to Pro for unlimited clients.</span>
              </p>
              <div className="mt-2 flex justify-center">
                <Button 
                  onClick={handleUpgrade}
                  variant="default" 
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details/Edit Panel */}
      <ClientDetailsPanel
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        clientId={selectedClientId}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone and may affect related engagements and invoices."
      />

      {/* Create Client Modal */}
      <ClientFormModal
        open={isCreateOpen}
        onOpenChange={handleCloseCreateModal}
        onClientCreated={handleClientCreated}
      />
    </>
  );
} 