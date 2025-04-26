import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller, FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertEngagementSchema, calculateEngagementStatus, engagementTypeEnum } from '@shared/schema';
import { getISODate } from '@/lib/date-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

// Client interface
interface Client {
  id: number;
  name: string;
}

// Schema for new client creation
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

// Extend the engagement schema with additional validation
const formSchema: z.ZodType<any> = z.object({
  clientId: z.number(),
  clientName: z.string().optional(),
  projectName: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  hourlyRate: z.number().positive('Hourly rate must be positive').optional(),
  totalCost: z.number().positive('Total cost must be positive').optional(),
  type: engagementTypeEnum.default('hourly'),
  description: z.string().optional(),
  status: z.string().default('active')
}).refine((data) => {
  // Parse dates for comparison
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  // Validate that both dates are valid before comparing
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  
  // Return true if start date is before or equal to end date
  return startDate <= endDate;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
}).refine((data) => {
  if (data.type === 'hourly') {
    return data.hourlyRate !== undefined;
  }
  if (data.type === 'project') {
    return data.totalCost !== undefined;
  }
  return true;
}, {
  message: "Hourly rate is required for hourly engagements. Total cost is required for project engagements.",
  path: ['type'],
});

type FormValues = z.infer<typeof formSchema>;

interface EngagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement?: any; // For editing existing engagement
  onSuccess: () => void;
}

const EngagementModal = ({
  open,
  onOpenChange,
  engagement,
  onSuccess,
}: EngagementModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to track the selected engagement type
  const [engagementType, setEngagementType] = useState<string>(engagement?.type || 'hourly');
  // State for new client creation modal
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  // State for new client form
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Setup client creation form
  const clientForm = useForm<ClientFormValues>({
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
    },
  });

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: open, // Only fetch when modal is open
  });

  // Debug log to see what data is being passed to the modal
  console.log('EngagementModal received engagement data:', engagement);

  const isEditMode = !!engagement;

  // Initialize form with default values or existing engagement
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: engagement
      ? {
          ...engagement,
          clientId: engagement.clientId || 0,
          startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
          endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
          hourlyRate: engagement.hourlyRate,
          totalCost: engagement.totalCost,
          type: engagement.type || 'hourly',
        }
      : {
          clientId: 0,
          clientName: '',
          projectName: '',
          startDate: getISODate(),
          endDate: '',
          hourlyRate: 0,
          totalCost: 0,
          type: 'hourly',
          description: '',
        },
  });
  
  // Watch the engagement type to conditionally display fields
  const selectedType = watch('type');
  
  // Effect to update the engagement type state when it changes
  useEffect(() => {
    setEngagementType(selectedType);
  }, [selectedType]);
  
  // Debug - Log the form's defaultValues
  console.log('Form defaultValues:', engagement ? {
    ...engagement,
    startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
    endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
  } : 'using empty defaults');

  // Effect to update form when engagement data changes
  useEffect(() => {
    if (engagement && open) {
      console.log('Resetting form with engagement data', engagement);
      reset({
        ...engagement,
        clientId: engagement.clientId || 0,
        startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
        endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
        hourlyRate: engagement.hourlyRate,
        totalCost: engagement.totalCost,
        type: engagement.type || 'hourly',
      });
      setEngagementType(engagement.type || 'hourly');
    }
  }, [engagement, reset, open]);
  
  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Function to handle client selection and set client name
  const handleClientChange = (clientId: string, onChange: (value: number) => void) => {
    // Check if user selected "Create New Client" option
    if (clientId === 'new') {
      setNewClientModalOpen(true);
      return;
    }
    
    const id = parseInt(clientId);
    onChange(id);
    
    // Find the selected client to get its name
    const selectedClient = clients.find(client => client.id === id);
    if (selectedClient) {
      // Update client name field
      const clientNameEvent = {
        target: { value: selectedClient.name }
      } as React.ChangeEvent<HTMLInputElement>;
      
      // Simulate an input event to update the clientName field
      register('clientName').onChange(clientNameEvent);
    }
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log('Starting engagement submission with data:', data);

      // Convert values to appropriate types
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      // Automatically calculate status based on dates
      const status = calculateEngagementStatus(startDate, endDate);
      
      const formattedData = {
        ...data,
        startDate,
        endDate,
        status,
      };

      console.log('Sending formatted data to server:', formattedData);

      // Create or update engagement
      const response = await apiRequest(
        isEditMode ? 'PUT' : 'POST',
        isEditMode ? `/api/engagements/${engagement.id}` : '/api/engagements',
        formattedData
      );

      // Get the response data
      const responseData = await response.json().catch(e => ({ error: 'Failed to parse response' }));
      console.log('Server response:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to save engagement');
      }

      // Success toast
      toast({
        title: `Engagement ${isEditMode ? 'updated' : 'created'} successfully`,
        description: `${formattedData.clientName} - ${formattedData.projectName}`,
      });

      // Close modal and reset form
      handleClose();
      
      // Trigger success callback to refresh data
      onSuccess();
    } catch (error) {
      console.error('Error saving engagement:', error);
      // More descriptive error message
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save engagement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new client
  const handleCreateClient = async (data: ClientFormValues) => {
    try {
      setIsCreatingClient(true);
      console.log('Creating new client with data:', data);

      // Submit the client data to the API
      const response = await apiRequest('POST', '/api/clients', data);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create client' }));
        throw new Error(errorData.message || 'Failed to create client');
      }
      
      // Get the newly created client
      const newClient = await response.json();
      
      toast({
        title: 'Client created successfully',
        description: `${newClient.name} has been added to your clients`,
      });
      
      // Refresh clients list
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Select the new client in the dropdown
      setValue('clientId', newClient.id);
      setValue('clientName', newClient.name);
      
      // Close the new client modal
      setNewClientModalOpen(false);
      clientForm.reset();
      
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Engagement' : 'New Engagement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="clientId" className="text-sm font-medium text-slate-700">
                  Client
                </Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      disabled={isLoadingClients}
                      value={field.value?.toString() || ''}
                      onValueChange={(value) => handleClientChange(value, field.onChange)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new" className="text-green-600 font-medium">
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Client
                          </div>
                        </SelectItem>
                        <div className="my-1 border-t border-slate-200"></div>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.clientId && (
                  <span className="text-xs text-red-500">{errors.clientId.message?.toString()}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="projectName" className="text-sm font-medium text-slate-700">
                  Project Name
                </Label>
                <Input
                  id="projectName"
                  placeholder="Enter project name"
                  {...register('projectName')}
                  className={errors.projectName ? 'border-red-500' : ''}
                />
                {errors.projectName && (
                  <span className="text-xs text-red-500">{errors.projectName.message?.toString()}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="type" className="text-sm font-medium text-slate-700">
                  Engagement Type
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset the other cost field when switching types
                        if (value === 'hourly') {
                          setValue('totalCost', undefined);
                        } else {
                          setValue('hourlyRate', undefined);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <span className="text-xs text-red-500">{errors.type.message?.toString()}</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  {errors.startDate && (
                    <span className="text-xs text-red-500">{errors.startDate.message?.toString()}</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && (
                    <span className="text-xs text-red-500">{errors.endDate.message?.toString()}</span>
                  )}
                </div>
              </div>
              
              {selectedType === 'hourly' && (
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="hourlyRate" className="text-sm font-medium text-slate-700">
                    Hourly Rate ($)
                  </Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('hourlyRate', { valueAsNumber: true })}
                    className={errors.hourlyRate ? 'border-red-500' : ''}
                  />
                  {errors.hourlyRate && (
                    <span className="text-xs text-red-500">{errors.hourlyRate.message?.toString()}</span>
                  )}
                </div>
              )}
              
              {selectedType === 'project' && (
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="totalCost" className="text-sm font-medium text-slate-700">
                    Total Project Cost ($)
                  </Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('totalCost', { valueAsNumber: true })}
                    className={errors.totalCost ? 'border-red-500' : ''}
                  />
                  {errors.totalCost && (
                    <span className="text-xs text-red-500">{errors.totalCost.message?.toString()}</span>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter a brief description"
                  rows={3}
                  {...register('description')}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <span className="text-xs text-red-500">{errors.description.message?.toString()}</span>
                )}
              </div>
              
              {/* Hidden client name field that gets populated by client selection */}
              <input type="hidden" {...register('clientName')} />
            </div>
            
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Engagement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Client Modal */}
      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={clientForm.handleSubmit(handleCreateClient)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Client Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Enter client name"
                  {...clientForm.register('name')}
                  className={clientForm.formState.errors.name ? 'border-red-500' : ''}
                />
                {clientForm.formState.errors.name && (
                  <span className="text-xs text-red-500">{clientForm.formState.errors.name.message?.toString()}</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="billingContactName" className="text-sm font-medium text-slate-700">
                  Billing Contact Name
                </Label>
                <Input
                  id="billingContactName"
                  placeholder="Enter billing contact name"
                  {...clientForm.register('billingContactName')}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="billingContactEmail" className="text-sm font-medium text-slate-700">
                  Billing Contact Email
                </Label>
                <Input
                  id="billingContactEmail"
                  type="email"
                  placeholder="Enter billing contact email"
                  {...clientForm.register('billingContactEmail')}
                  className={clientForm.formState.errors.billingContactEmail ? 'border-red-500' : ''}
                />
                {clientForm.formState.errors.billingContactEmail && (
                  <span className="text-xs text-red-500">{clientForm.formState.errors.billingContactEmail.message?.toString()}</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="billingAddress" className="text-sm font-medium text-slate-700">
                  Billing Address
                </Label>
                <Input
                  id="billingAddress"
                  placeholder="Enter billing address"
                  {...clientForm.register('billingAddress')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingCity" className="text-sm font-medium text-slate-700">
                    City
                  </Label>
                  <Input
                    id="billingCity"
                    placeholder="City"
                    {...clientForm.register('billingCity')}
                  />
                </div>
                <div>
                  <Label htmlFor="billingState" className="text-sm font-medium text-slate-700">
                    State/Province
                  </Label>
                  <Input
                    id="billingState"
                    placeholder="State/Province"
                    {...clientForm.register('billingState')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingZip" className="text-sm font-medium text-slate-700">
                    Postal/ZIP Code
                  </Label>
                  <Input
                    id="billingZip"
                    placeholder="Postal/ZIP"
                    {...clientForm.register('billingZip')}
                  />
                </div>
                <div>
                  <Label htmlFor="billingCountry" className="text-sm font-medium text-slate-700">
                    Country
                  </Label>
                  <Input
                    id="billingCountry"
                    placeholder="Country"
                    {...clientForm.register('billingCountry')}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClientModalOpen(false)}
                disabled={isCreatingClient}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingClient}
              >
                {isCreatingClient ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EngagementModal;
