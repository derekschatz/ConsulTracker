import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertTimeLogSchema } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getISODate } from '@/lib/date-utils';

// Define engagement interface
interface Engagement {
  id: number;
  clientName: string;
  projectName: string;
  hourlyRate: string;
  startDate: string;
  endDate: string;
  status: string;
}

// Extend the time log schema with additional validation
const formSchema = insertTimeLogSchema
  .extend({
    date: z.string().min(1, 'Date is required'),
    hours: z.string().or(z.number()).refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Hours must be a positive number',
    })
    .refine(val => Number(val) <= 8, {
      message: 'Hours cannot exceed 8 per entry',
    }),
  });

type FormValues = z.infer<typeof formSchema>;

interface TimeLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLog?: any; // For editing existing time log
  onSuccess: () => void;
  preselectedEngagementId?: number;
}

const TimeLogModal = ({
  open,
  onOpenChange,
  timeLog,
  onSuccess,
  preselectedEngagementId,
}: TimeLogModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEngagementRate, setSelectedEngagementRate] = useState<string | null>(null);

  const isEditMode = !!timeLog;

  // Fetch only active engagements
  const { data: engagements = [], isLoading: isLoadingEngagements } = useQuery<Engagement[]>({
    queryKey: ['/api/engagements/active'],
    enabled: open,
  });

  // Get engagement ID from either direct property or nested engagement object
  const getEngagementId = () => {
    if (!timeLog) return preselectedEngagementId || 0;
    
    // Handle both data structures: flat or nested engagement
    if (timeLog.engagementId !== undefined) {
      return timeLog.engagementId;
    } else if (timeLog.engagement && timeLog.engagement.id !== undefined) {
      return timeLog.engagement.id;
    }
    
    return 0;
  };
  
  // Debug log to check what's happening with engagement ID
  console.log('TimeLog data:', timeLog);
  console.log('Engagement ID from getEngagementId():', getEngagementId());
  
  // Initialize form with default values or existing time log
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: timeLog
      ? {
          date: timeLog.date ? getISODate(new Date(timeLog.date)) : getISODate(),
          hours: String(timeLog.hours),
          description: timeLog.description || '',
          engagementId: getEngagementId(),
        }
      : {
          engagementId: preselectedEngagementId || 0,
          date: getISODate(), // Uses default 2025 date
          hours: '',
          description: '',
        },
  });
  
  // Watch engagementId for debugging
  const engagementIdValue = watch('engagementId');
  console.log('Watched engagementId value:', engagementIdValue);

  // Update form fields when modal opens with timeLog data
  useEffect(() => {
    if (open) {
      // If editing, set the engagement ID explicitly
      if (isEditMode && timeLog) {
        const engagementId = getEngagementId();
        console.log('Setting engagementId in useEffect:', engagementId);
        setValue('engagementId', engagementId);
      } 
      // If creating a new timeLog with preselected engagement
      else if (preselectedEngagementId && !isEditMode) {
        setValue('engagementId', preselectedEngagementId);
      }
    }
  }, [open, timeLog, isEditMode, preselectedEngagementId, setValue]);
  
  // Find and set the rate when an engagement is selected
  useEffect(() => {
    if (open && engagements && engagements.length > 0) {
      // Get engagementId from either direct property or nested engagement object
      let currentEngagementId;
      if (timeLog) {
        if (timeLog.engagementId !== undefined) {
          currentEngagementId = timeLog.engagementId;
        } else if (timeLog.engagement && timeLog.engagement.id !== undefined) {
          currentEngagementId = timeLog.engagement.id;
        }
      } else {
        currentEngagementId = preselectedEngagementId;
      }
      
      if (currentEngagementId) {
        const engagement = engagements.find(e => e.id === currentEngagementId);
        if (engagement) {
          setSelectedEngagementRate(engagement.hourlyRate);
        }
      }
    }
  }, [open, engagements, timeLog, preselectedEngagementId]);
  
  // Handle engagement change
  const handleEngagementChange = (engagementId: string) => {
    setValue('engagementId', Number(engagementId));
    if (engagements) {
      const selectedEngagement = engagements.find(e => e.id === Number(engagementId));
      if (selectedEngagement) {
        setSelectedEngagementRate(selectedEngagement.hourlyRate);
      }
    }
  };

  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Convert values to appropriate types
      const formattedData = {
        ...data,
        engagementId: Number(data.engagementId),
        hours: Number(data.hours),
        date: new Date(data.date),
      };

      // Create or update time log
      const response = await apiRequest(
        isEditMode ? 'PUT' : 'POST',
        isEditMode ? `/api/time-logs/${timeLog.id}` : '/api/time-logs',
        formattedData
      );

      if (!response.ok) {
        throw new Error('Failed to save time log');
      }

      // Success toast
      toast({
        title: `Time log ${isEditMode ? 'updated' : 'created'} successfully`,
        description: `${formattedData.hours} hours logged for ${data.date}`,
      });

      // Close modal and reset form
      handleClose();
      
      // Force a refresh of all time log queries to ensure UI is updated
      console.log('Force refreshing data after time log operation');
      
      // First force refresh all queries that might show this time log
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === 'string' && (
            queryKey.startsWith('/api/time-logs') || 
            queryKey.startsWith('/api/dashboard')
          );
        },
        type: 'active'
      });
      
      // Trigger success callback
      onSuccess();
    } catch (error) {
      console.error('Error saving time log:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} time log`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Time Log' : 'New Time Log'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="engagementId" className="text-sm font-medium text-slate-700">
                Engagement
              </Label>
              <Controller
                name="engagementId"
                control={control}
                render={({ field }) => {
                  // Add additional debugging
                  console.log('Field value in Select:', field.value);
                  
                  // Convert to string for Select component, handling null/undefined case
                  const fieldValue = field.value ? field.value.toString() : '';
                  
                  return (
                    <Select
                      disabled={isLoadingEngagements}
                      value={fieldValue}
                      defaultValue={fieldValue}
                      onValueChange={handleEngagementChange}
                    >
                      <SelectTrigger className={errors.engagementId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select an engagement" />
                      </SelectTrigger>
                      <SelectContent>
                        {engagements.map((engagement) => (
                          <SelectItem key={engagement.id} value={engagement.id.toString()}>
                            {engagement.clientName} - {engagement.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.engagementId && (
                <span className="text-xs text-red-500">{errors.engagementId.message}</span>
              )}
              {selectedEngagementRate && (
                <span className="text-xs text-slate-500">
                  Rate: ${selectedEngagementRate}/hour
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="date" className="text-sm font-medium text-slate-700">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <span className="text-xs text-red-500">{errors.date.message}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="hours" className="text-sm font-medium text-slate-700">
                  Hours (max 8)
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.25"
                  max="8"
                  step="0.25"
                  placeholder="0.00"
                  {...register('hours', {
                    onChange: (e) => {
                      // Real-time validation as user types
                      const value = e.target.value;
                      if (value && Number(value) > 8) {
                        e.target.setCustomValidity('Hours cannot exceed 8');
                      } else {
                        e.target.setCustomValidity('');
                      }
                    }
                  })}
                  className={errors.hours ? 'border-red-500' : ''}
                />
                {errors.hours && (
                  <span className="text-xs text-red-500">{errors.hours.message}</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the work you did"
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
              disabled={isSubmitting || isLoadingEngagements}
            >
              {isSubmitting 
                ? 'Saving...' 
                : isEditMode 
                  ? 'Save Changes' 
                  : 'Save Time Log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeLogModal;
