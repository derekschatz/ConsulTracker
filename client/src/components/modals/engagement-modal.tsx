import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertEngagementSchema } from '@shared/schema';
import { getISODate } from '@/lib/date-utils';

// Extend the engagement schema with additional validation
const formSchema = insertEngagementSchema
  .extend({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    hourlyRate: z.string().or(z.number()).refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Hourly rate must be a positive number',
    }),
  })
  .refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof formSchema>;

// Define a proper type for the engagement prop
interface Engagement {
  id: number;
  clientName: string;
  projectName: string;
  startDate: string | Date;
  endDate: string | Date;
  hourlyRate: number;
  description?: string;
  status: string;
}

interface EngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  engagement?: Engagement;
  onSuccess: () => void;
}

const EngagementModal = ({
  isOpen,
  onClose,
  engagement,
  onSuccess,
}: EngagementModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!engagement;

  // Initialize form with default values or existing engagement
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      projectName: '',
      startDate: getISODate(), // Uses default 2025 date
      endDate: '',
      hourlyRate: '',
      description: '',
      status: 'active',
    },
  });
  
  // Update form values when engagement data changes or modal opens/closes
  useEffect(() => {
    if (isOpen && engagement) {
      // Format dates properly for edit mode
      const formattedEngagement = {
        ...engagement,
        startDate: engagement.startDate ? getISODate(new Date(engagement.startDate)) : getISODate(),
        endDate: engagement.endDate ? getISODate(new Date(engagement.endDate)) : '',
        hourlyRate: String(engagement.hourlyRate),
      };
      reset(formattedEngagement);
    } else if (isOpen && !engagement) {
      // Reset to default values in create mode
      reset({
        clientName: '',
        projectName: '',
        startDate: getISODate(),
        endDate: '',
        hourlyRate: '',
        description: '',
        status: 'active',
      });
    }
  }, [engagement, isOpen, reset]);

  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    onClose();
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Convert values to appropriate types
      const formattedData = {
        ...data,
        hourlyRate: Number(data.hourlyRate),
        // Send ISO string format directly without creating Date objects
        startDate: data.startDate,
        endDate: data.endDate,
      };

      console.log('Submitting engagement data:', formattedData);
      
      // Create or update engagement
      const response = await apiRequest(
        isEditMode ? 'PUT' : 'POST',
        isEditMode ? `/api/engagements/${engagement.id}` : '/api/engagements',
        formattedData
      );

      if (!response.ok) {
        throw new Error('Failed to save engagement');
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
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} engagement`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Engagement' : 'New Engagement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="clientName" className="text-sm font-medium text-slate-700">
                Client Name
              </Label>
              <Input
                id="clientName"
                placeholder="Enter client name"
                {...register('clientName')}
                className={errors.clientName ? 'border-red-500' : ''}
              />
              {errors.clientName && (
                <span className="text-xs text-red-500">{errors.clientName.message}</span>
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
                <span className="text-xs text-red-500">{errors.projectName.message}</span>
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
                  <span className="text-xs text-red-500">{errors.startDate.message}</span>
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
                  <span className="text-xs text-red-500">{errors.endDate.message}</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="hourlyRate" className="text-sm font-medium text-slate-700">
                Hourly Rate ($)
              </Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('hourlyRate')}
                className={errors.hourlyRate ? 'border-red-500' : ''}
              />
              {errors.hourlyRate && (
                <span className="text-xs text-red-500">{errors.hourlyRate.message}</span>
              )}
            </div>
            
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
                <span className="text-xs text-red-500">{errors.description.message}</span>
              )}
            </div>
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
  );
};

export default EngagementModal;
