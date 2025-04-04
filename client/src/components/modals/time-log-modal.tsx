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

// Extend the time log schema with additional validation
const formSchema = insertTimeLogSchema
  .extend({
    date: z.string().min(1, 'Date is required'),
    hours: z.string().or(z.number()).refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Hours must be a positive number',
    }),
  });

type FormValues = z.infer<typeof formSchema>;

interface TimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeLog?: any; // For editing existing time log
  onSuccess: () => void;
  preselectedEngagementId?: number;
}

const TimeLogModal = ({
  isOpen,
  onClose,
  timeLog,
  onSuccess,
  preselectedEngagementId,
}: TimeLogModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!timeLog;

  // Fetch engagements
  const { data: engagements = [], isLoading: isLoadingEngagements } = useQuery({
    queryKey: ['/api/engagements'],
    enabled: isOpen,
  });

  // Initialize form with default values or existing time log
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: timeLog
      ? {
          ...timeLog,
          date: timeLog.date ? getISODate(new Date(timeLog.date)) : getISODate(),
          hours: String(timeLog.hours),
        }
      : {
          engagementId: preselectedEngagementId || '',
          date: getISODate(), // Uses default 2025 date
          hours: '',
          description: '',
        },
  });

  // Update form if preselectedEngagementId changes
  useEffect(() => {
    if (preselectedEngagementId && !isEditMode) {
      setValue('engagementId', preselectedEngagementId);
    }
  }, [preselectedEngagementId, isEditMode, setValue]);

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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
                render={({ field }) => (
                  <Select
                    disabled={isLoadingEngagements || isEditMode}
                    value={field.value.toString()}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className={errors.engagementId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select an engagement" />
                    </SelectTrigger>
                    <SelectContent>
                      {engagements.map((engagement: any) => (
                        <SelectItem key={engagement.id} value={engagement.id.toString()}>
                          {engagement.clientName} - {engagement.projectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.engagementId && (
                <span className="text-xs text-red-500">{errors.engagementId.message}</span>
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
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  placeholder="0.00"
                  {...register('hours')}
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
