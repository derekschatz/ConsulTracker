import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formLabelStyles } from '@/components/ui/form-styles';

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
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: engagement
      ? {
          ...engagement,
          clientId: Number(engagement.clientId || engagement.client_id || 0),
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
    mode: 'onChange',
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
    // Completely reset all state
    reset();
    onOpenChange(false);
  };

  // Function to handle client selection and set client name
  const handleClientChange = (clientId: string, onChange: (value: number) => void) => {
    console.log("Client selected:", clientId);
    const id = parseInt(clientId);
    
    if (isNaN(id) || id <= 0) {
      console.error("Invalid client ID:", clientId);
      return;
    }
    
    onChange(id);
    
    // Find the selected client to get its name
    const selectedClient = clients.find(client => client.id === id);
    console.log("Selected client:", selectedClient);
    
    if (selectedClient) {
      // Update client name field using setValue for more reliability
      setValue('clientName', selectedClient.name);
      console.log("Set client name to:", selectedClient.name);
    } else {
      console.error("Client not found for ID:", id);
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

  // Called when form is submitted
  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Form submitted with data:", data);
      
      // Check for validation errors
      if (Object.keys(errors).length > 0) {
        console.error("Form validation errors:", errors);
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please fix the errors in the form before submitting."
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // Convert dates to Date objects
      const startDate = new Date(data.startDate);
      const endDate = data.endDate ? new Date(data.endDate) : null;
      
      // Calculate status (draft, active, completed) based on dates
      const currentDate = new Date();
      let status = 'draft';
      
      if (currentDate >= startDate) {
        status = 'active';
        if (endDate && currentDate > endDate) {
          status = 'completed';
        }
      }
      
      // Format data for submission
      const formData = {
        clientId: data.clientId,
        clientName: data.clientName,
        projectName: data.projectName,
        engagementType: data.engagementType,
        ...(data.engagementType === 'hourly' ? { hourlyRate: data.hourlyRate } : {}),
        ...(data.engagementType === 'project' ? { projectAmount: data.projectAmount } : {}),
        startDate: getISODate(startDate),
        ...(endDate ? { endDate: getISODate(endDate) } : {}),
        netTerms: data.netTerms,
        status,
        ...(data.description ? { description: data.description } : {}),
      };
      
      console.log("Sending formatted data to API:", formData);
      
      // Make API request (POST for create, PUT for edit)
      const response = await apiRequest(
        engagement ? 'PUT' : 'POST',
        engagement ? `/api/engagements/${engagement.id}` : '/api/engagements',
        formData
      );
      
      // Handle successful response
      console.log("API response:", response);
      
      // Show success toast
      toast({
        title: `Engagement ${engagement ? 'updated' : 'created'} successfully`,
        description: `The engagement "${data.projectName}" has been ${engagement ? 'updated' : 'created'}.`,
      });
      
      // Call the success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset the form
      console.log("Resetting form with defaults:", {
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
      });
      
      // Close the modal - close it first, then reset form state
      onOpenChange(false);
      
      // Reset form after modal is closed
      setTimeout(() => {
        reset();
      }, 100);
    } catch (error) {
      console.error("Error submitting engagement form:", error);
      
      let errorMessage = "An unexpected error occurred.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Failed to save engagement",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Engagement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId" className={formLabelStyles}>Client</Label>
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
            <Label htmlFor="projectName" className={formLabelStyles}>Name</Label>
            <Input id="projectName" {...register('projectName')} />
            {errors.projectName && <p className="text-red-500 text-sm">{errors.projectName.message}</p>}
          </div>
          
          {/* Engagement Type */}
          <div className="space-y-2">
            <Label htmlFor="engagementType" className={formLabelStyles}>Type</Label>
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
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
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
              <Label htmlFor="hourlyRate" className={formLabelStyles}>Rate ($)</Label>
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
              <Label htmlFor="projectAmount" className={formLabelStyles}>Amount ($)</Label>
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
              <Label htmlFor="startDate" className={formLabelStyles}>Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className={formLabelStyles}>End Date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Net Terms */}
          <div className="space-y-2">
            <Label htmlFor="netTerms" className={formLabelStyles}>Payment Terms (days)</Label>
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
            <Label htmlFor="description" className={formLabelStyles}>Description</Label>
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
