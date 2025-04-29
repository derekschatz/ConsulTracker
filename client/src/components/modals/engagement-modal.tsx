import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { calculateEngagementStatus, engagementTypeEnum } from '@shared/schema';
import { getISODate } from '@/lib/date-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

// Client interface
interface Client {
  id: number;
  name: string;
}

// Create a new schema for the form
const formSchema = z.object({
  clientId: z.number(),
  clientName: z.string(),
  projectName: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  engagementType: engagementTypeEnum.default('hourly'),
  hourlyRate: z.number().positive('Hourly rate must be positive').optional().nullable(),
  projectAmount: z.number().positive('Project amount must be positive').optional().nullable(),
  description: z.string().optional(),
  status: z.string().default('active'),
  netTerms: z.number().int().min(1, 'Net terms must be at least 1 day').default(30),
})
.refine(data => {
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
})
.refine(
  (data) => {
    if (data.engagementType === 'hourly') {
      return data.hourlyRate !== undefined && data.hourlyRate !== null;
    } else if (data.engagementType === 'project') {
      return data.projectAmount !== undefined && data.projectAmount !== null;
    }
    return false;
  },
  {
    message: "Hourly rate is required for hourly engagements, or project amount is required for project engagements",
    path: ['engagementType'],
  }
);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detect engagement type
  const [engagementType, setEngagementType] = useState<'hourly' | 'project'>(() => {
    // Check for both camelCase and snake_case properties
    if (engagement) {
      // Try to determine the engagement type from various possible properties
      if (engagement.engagementType === 'project' || 
          engagement.engagement_type === 'project' ||
          // Also infer from project amount existence
          (engagement.projectAmount !== undefined && engagement.projectAmount !== null) ||
          (engagement.project_amount !== undefined && engagement.project_amount !== null)) {
        return 'project';
      }
    }
    return 'hourly'; // Default to hourly if no project indicators
  });

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: open, // Only fetch when modal is open
  });

  const isEditMode = !!engagement;
  
  // Extract project amount from various possible sources
  const getProjectAmount = (eng: any) => {
    if (!eng) return null;
    
    const projectAmount = 
      typeof eng.projectAmount === 'string' 
        ? parseFloat(eng.projectAmount) 
        : typeof eng.projectAmount === 'number' 
          ? eng.projectAmount 
          : typeof eng.project_amount === 'string' 
            ? parseFloat(eng.project_amount) 
            : typeof eng.project_amount === 'number'
              ? eng.project_amount
              : null;
              
    return projectAmount;
  };

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
          clientId: engagement.clientId || engagement.client_id || 0,
          startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
          endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
          engagementType: (engagement.engagementType === 'project' || 
                          engagement.engagement_type === 'project' ||
                          (engagement.projectAmount !== undefined && engagement.projectAmount !== null) ||
                          (engagement.project_amount !== undefined && engagement.project_amount !== null))
                          ? 'project' : 'hourly',
          hourlyRate: engagement.hourlyRate || engagement.hourly_rate || null,
          projectAmount: getProjectAmount(engagement),
          netTerms: engagement.netTerms || engagement.net_terms || 30,
        }
      : {
          clientId: 0,
          clientName: '',
          projectName: '',
          startDate: getISODate(),
          endDate: '',
          engagementType: 'hourly',
          hourlyRate: null,
          projectAmount: null,
          description: '',
          netTerms: 30,
        },
  });
  
  // Watch for engagement type changes
  const currentEngagementType = watch('engagementType');
  
  // Update local state when form engagement type changes
  useEffect(() => {
    if (currentEngagementType) {
      setEngagementType(currentEngagementType as 'hourly' | 'project');
    }
  }, [currentEngagementType]);

  // Effect to update form when engagement data changes
  useEffect(() => {
    if (engagement && open) {
      const projectAmount = getProjectAmount(engagement);
      
      reset({
        ...engagement,
        clientId: engagement.clientId || engagement.client_id || 0,
        startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
        endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
        engagementType: (engagement.engagementType === 'project' || 
                        engagement.engagement_type === 'project' ||
                        (engagement.projectAmount !== undefined && engagement.projectAmount !== null) ||
                        (engagement.project_amount !== undefined && engagement.project_amount !== null))
                        ? 'project' : 'hourly',
        hourlyRate: engagement.hourlyRate || engagement.hourly_rate || null,
        projectAmount: projectAmount,
        netTerms: engagement.netTerms || engagement.net_terms || 30,
      });

      // Update local state with the detected type
      setEngagementType(engagement.engagementType === 'project' || 
                      engagement.engagement_type === 'project' ||
                      (engagement.projectAmount !== undefined && engagement.projectAmount !== null) ||
                      (engagement.project_amount !== undefined && engagement.project_amount !== null) ? 'project' : 'hourly');
      
      // If it's a project engagement, explicitly set the project amount again after reset
      if (engagement.engagementType === 'project' && projectAmount !== null) {
        setTimeout(() => {
          setValue('projectAmount', projectAmount);
        }, 0);
      }
    }
  }, [engagement, reset, open, setValue]);
  
  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Function to handle client selection and set client name
  const handleClientChange = (clientId: string, onChange: (value: number) => void) => {
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

  // Handle engagement type change
  const handleEngagementTypeChange = (value: string) => {
    const newType = value as 'hourly' | 'project';
    setEngagementType(newType);
    setValue('engagementType', newType);
    
    // Reset the opposite value field
    if (newType === 'hourly') {
      setValue('projectAmount', null);
    } else {
      setValue('hourlyRate', null);
    }
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

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

      // Create or update engagement
      const response = await apiRequest(
        isEditMode ? 'PUT' : 'POST',
        isEditMode ? `/api/engagements/${engagement.id}` : '/api/engagements',
        formattedData
      );

      // Get the response data
      const responseData = await response.json().catch(e => ({ error: 'Failed to parse response' }));

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
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Engagement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => handleClientChange(value, field.onChange)}
                  disabled={isLoadingClients}
                >
                  <SelectTrigger className="w-full" id="clientId">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && <p className="text-red-500 text-sm">{errors.clientId.message}</p>}
            <input type="hidden" {...register('clientName')} />
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input id="projectName" {...register('projectName')} />
            {errors.projectName && <p className="text-red-500 text-sm">{errors.projectName.message}</p>}
          </div>
          
          {/* Engagement Type */}
          <div className="space-y-2">
            <Label htmlFor="engagementType">Engagement Type</Label>
            <Controller
              control={control}
              name="engagementType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={handleEngagementTypeChange}
                >
                  <SelectTrigger className="w-full" id="engagementType">
                    <SelectValue placeholder="Select engagement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="project">Project-Based</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.engagementType && (
              <p className="text-red-500 text-sm">{errors.engagementType.message}</p>
            )}
          </div>

          {/* Rate Input - show conditionally based on engagement type */}
          {engagementType === 'hourly' ? (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input 
                id="hourlyRate" 
                type="number" 
                step="0.01"
                min="0"
                {...register('hourlyRate', { 
                  valueAsNumber: true,
                  required: engagementType === 'hourly' ? 'Hourly rate is required' : false 
                })} 
              />
              {errors.hourlyRate && <p className="text-red-500 text-sm">{errors.hourlyRate.message}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="projectAmount">Project Amount ($)</Label>
              <Input 
                id="projectAmount" 
                type="number" 
                step="0.01"
                min="0"
                {...register('projectAmount', { 
                  valueAsNumber: true,
                  required: engagementType === 'project' ? 'Project amount is required' : false 
                })} 
              />
              {errors.projectAmount && <p className="text-red-500 text-sm">{errors.projectAmount.message}</p>}
            </div>
          )}

          {/* Date Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Net Terms */}
          <div className="space-y-2">
            <Label htmlFor="netTerms">Payment Terms (days)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Net</span>
              <Input 
                id="netTerms" 
                type="number" 
                className="w-24"
                min="1"
                step="1"
                {...register('netTerms', { 
                  valueAsNumber: true,
                  required: 'Net terms are required'
                })} 
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
            <p className="text-sm text-gray-500">Invoice due date will be this many days after issuing</p>
            {errors.netTerms && <p className="text-red-500 text-sm">{errors.netTerms.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
            {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EngagementModal;
