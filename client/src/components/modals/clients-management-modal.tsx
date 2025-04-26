import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Users, X } from 'lucide-react';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';

// Interface for client object
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

// Create a schema for client form validation
const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  billingContactName: z.string().optional(),
  billingContactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientsManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ClientsManagementModal = ({
  open,
  onOpenChange,
  onSuccess,
}: ClientsManagementModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all-clients');
  const [isLoading, setIsLoading] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch clients
  const { data: clients = [], isLoading: isClientsLoading, refetch: refetchClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: open, // Only fetch when modal is open
  });

  // Initialize form for creating/editing clients
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      billingContactName: '',
      billingContactEmail: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
      billingCountry: '',
    }
  });

  // Set form values when editing a client
  useEffect(() => {
    if (clientToEdit) {
      form.reset({
        name: clientToEdit.name,
        billingContactName: clientToEdit.billingContactName || '',
        billingContactEmail: clientToEdit.billingContactEmail || '',
        billingAddress: clientToEdit.billingAddress || '',
        billingCity: clientToEdit.billingCity || '',
        billingState: clientToEdit.billingState || '',
        billingZip: clientToEdit.billingZip || '',
        billingCountry: clientToEdit.billingCountry || '',
      });
      setActiveTab('add-client');
    }
  }, [clientToEdit, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setClientToEdit(null);
      setActiveTab('all-clients');
    }
  }, [open, form]);

  // Handle client form submission (create or update)
  const onSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    try {
      if (clientToEdit) {
        // Update existing client
        const response = await apiRequest(
          'PUT',
          `/api/clients/${clientToEdit.id}`,
          data
        );

        if (!response.ok) {
          throw new Error('Failed to update client');
        }

        toast({
          title: 'Success',
          description: `Client "${data.name}" has been updated.`,
        });
      } else {
        // Create new client
        const response = await apiRequest(
          'POST',
          '/api/clients',
          data
        );

        if (!response.ok) {
          throw new Error('Failed to create client');
        }

        toast({
          title: 'Success',
          description: `Client "${data.name}" has been created.`,
        });
      }

      // Refresh client data
      await refetchClients();
      
      // Reset form and return to client list
      form.reset();
      setClientToEdit(null);
      setActiveTab('all-clients');
      
      // Call onSuccess to update parent components
      onSuccess();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while saving the client.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle client deletion
  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  // Confirm client deletion
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      const response = await apiRequest(
        'DELETE',
        `/api/clients/${clientToDelete.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast({
        title: 'Success',
        description: `Client "${clientToDelete.name}" has been deleted.`,
      });

      // Refresh client data
      await refetchClients();
      
      // Call onSuccess to update parent components
      onSuccess();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while deleting the client.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    form.reset();
    setClientToEdit(null);
    setActiveTab('all-clients');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Client Management
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all-clients">All Clients</TabsTrigger>
              <TabsTrigger value="add-client">
                {clientToEdit ? 'Edit Client' : 'Add New Client'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-clients" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client List</CardTitle>
                  <CardDescription>Manage your clients and their billing information.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isClientsLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No clients found. Add your first client to get started.</p>
                      <Button 
                        onClick={() => setActiveTab('add-client')} 
                        className="mt-4"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Client
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableCaption>List of all your clients</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Billing Contact</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                              {client.billingContactName ? (
                                <div>
                                  <div>{client.billingContactName}</div>
                                  {client.billingContactEmail && (
                                    <div className="text-xs text-muted-foreground">{client.billingContactEmail}</div>
                                  )}
                                </div>
                              ) : 'No contact info'}
                            </TableCell>
                            <TableCell>
                              {client.billingCity || client.billingState ? (
                                <div>
                                  {[client.billingCity, client.billingState]
                                    .filter(Boolean)
                                    .join(', ')}
                                  {client.billingCountry && (
                                    <div className="text-xs text-muted-foreground">{client.billingCountry}</div>
                                  )}
                                </div>
                              ) : 'No location info'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setClientToEdit(client)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-500 hover:bg-red-100 hover:text-red-700"
                                  onClick={() => handleDeleteClient(client)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                  <Button onClick={() => setActiveTab('add-client')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Client
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="add-client" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{clientToEdit ? 'Edit Client' : 'Add New Client'}</CardTitle>
                  <CardDescription>
                    {clientToEdit 
                      ? 'Update client information and billing details' 
                      : 'Enter client information to create a new client record'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium">
                            Client Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter client name"
                            {...form.register('name')}
                            className={form.formState.errors.name ? 'border-red-500' : ''}
                          />
                          {form.formState.errors.name && (
                            <span className="text-xs text-red-500">{form.formState.errors.name.message?.toString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="billingContactName">
                            Billing Contact Name
                          </Label>
                          <Input
                            id="billingContactName"
                            placeholder="Contact name"
                            {...form.register('billingContactName')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingContactEmail">
                            Billing Contact Email
                          </Label>
                          <Input
                            id="billingContactEmail"
                            placeholder="Contact email"
                            type="email"
                            {...form.register('billingContactEmail')}
                            className={form.formState.errors.billingContactEmail ? 'border-red-500' : ''}
                          />
                          {form.formState.errors.billingContactEmail && (
                            <span className="text-xs text-red-500">
                              {form.formState.errors.billingContactEmail.message?.toString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="billingAddress">
                          Billing Address
                        </Label>
                        <Input
                          id="billingAddress"
                          placeholder="Street address"
                          {...form.register('billingAddress')}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="billingCity">
                            City
                          </Label>
                          <Input
                            id="billingCity"
                            placeholder="City"
                            {...form.register('billingCity')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingState">
                            State/Province
                          </Label>
                          <Input
                            id="billingState"
                            placeholder="State/Province"
                            {...form.register('billingState')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingZip">
                            Postal/ZIP Code
                          </Label>
                          <Input
                            id="billingZip"
                            placeholder="Postal/ZIP"
                            {...form.register('billingZip')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingCountry">
                            Country
                          </Label>
                          <Input
                            id="billingCountry"
                            placeholder="Country"
                            {...form.register('billingCountry')}
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {clientToEdit ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>{clientToEdit ? 'Update Client' : 'Create Client'}</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={confirmDeleteClient}
        title="Delete Client"
        description={`Are you sure you want to delete ${clientToDelete?.name}? This action cannot be undone and may affect any engagements associated with this client.`}
      />
    </>
  );
};

export default ClientsManagementModal; 