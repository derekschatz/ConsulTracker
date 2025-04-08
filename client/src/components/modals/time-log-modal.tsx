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
  .omit({
    userId: true // We'll add this on the server
  })
  .extend({
    engagementId: z.number().min(1, 'Please select an engagement'),
    date: z.string(), // Change date to string type to match server expectations
  });

type FormValues = z.infer<typeof formSchema>;

interface TimeLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLog?: any; // For editing existing time log
  onSuccess: () => void;
  preselectedEngagementId?: number;
}

interface TimeLogEntry {
  date: string;
  hours: number;
  description: string;
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
  const [multipleEntries, setMultipleEntries] = useState(false);
  const [createdLogs, setCreatedLogs] = useState<TimeLogEntry[]>([]);

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
          date: new Date(timeLog.date).toISOString().split('T')[0],
          hours: timeLog.hours ? Number(timeLog.hours) : 0,
          description: timeLog.description || '',
          engagementId: getEngagementId(),
        }
      : {
          engagementId: preselectedEngagementId || undefined,
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          description: '',
        },
  });
  
  // Debug log the form initialization
  console.log('Form initialized with:', {
    timeLog,
    defaultValues: timeLog
      ? {
          date: new Date(timeLog.date).toISOString().split('T')[0],
          hours: timeLog.hours ? Number(timeLog.hours) : 0,
          description: timeLog.description || '',
          engagementId: getEngagementId(),
        }
      : {
          engagementId: preselectedEngagementId || undefined,
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          description: '',
        },
  });
  
  // Watch engagementId for debugging
  const engagementIdValue = watch('engagementId');
  console.log('Watched engagementId value:', engagementIdValue);

  // Update form fields when modal opens with timeLog data
  useEffect(() => {
    if (open && timeLog) {
      // Reset form with time log data
      reset({
        date: new Date(timeLog.date).toISOString().split('T')[0],
        hours: timeLog.hours ? Number(timeLog.hours) : 0,
        description: timeLog.description || '',
        engagementId: getEngagementId(),
      });
    }
  }, [open, timeLog, reset]);
  
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

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Format the data
      const formattedData = {
        ...data,
        engagementId: Number(data.engagementId),
        hours: Number(data.hours),
      };

      // Create time log
      const response = await apiRequest(
        isEditMode ? 'PUT' : 'POST',
        isEditMode ? `/api/time-logs/${timeLog.id}` : '/api/time-logs',
        formattedData
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server validation errors:', errorData);
        throw new Error(errorData.message || 'Failed to save time log');
      }

      const savedTimeLog = await response.json();

      // Success toast
      toast({
        title: `Time log ${isEditMode ? 'updated' : 'created'} successfully`,
        description: `${formattedData.hours} hours logged for ${formattedData.date}`,
      });

      if (multipleEntries && !isEditMode) {
        // Add the created log to our list
        setCreatedLogs(prev => [...prev, {
          date: formattedData.date,
          hours: formattedData.hours,
          description: formattedData.description
        }]);

        // Reset form fields except engagement
        reset({
          engagementId: data.engagementId,
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          description: ''
        });

        // Properly invalidate queries to ensure data is refreshed
        await queryClient.invalidateQueries({
          queryKey: ['/api/time-logs']
        });
        await queryClient.invalidateQueries({
          queryKey: ['/api/dashboard']
        });
      } else {
        handleClose();
        // Properly invalidate queries to ensure data is refreshed
        await queryClient.invalidateQueries({
          queryKey: ['/api/time-logs']
        });
        await queryClient.invalidateQueries({
          queryKey: ['/api/dashboard']
        });
      }
      
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

  const handleClose = () => {
    setMultipleEntries(false);
    setCreatedLogs([]);
    reset();
    onOpenChange(false);
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
                  {...register('hours', { valueAsNumber: true })}
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
            {!isEditMode && (
              <div className="flex items-center gap-2 mr-auto">
                <input
                  type="checkbox"
                  id="multipleEntries"
                  checked={multipleEntries}
                  onChange={(e) => {
                    setMultipleEntries(e.target.checked);
                    if (!e.target.checked) {
                      setCreatedLogs([]);
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="multipleEntries" className="text-sm">
                  Add multiple entries
                </Label>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {multipleEntries ? 'Done' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingEngagements}
            >
              {isSubmitting 
                ? 'Saving...' 
                : multipleEntries
                  ? 'Add Entry'
                  : isEditMode 
                    ? 'Save Changes' 
                    : 'Save'}
            </Button>
          </DialogFooter>
        </form>

        {multipleEntries && createdLogs.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">
              Added Entries ({createdLogs.length}):
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {createdLogs.map((log, index) => (
                <div 
                  key={`${log.date}-${log.hours}-${index}`}
                  className="text-sm bg-slate-50 p-2 rounded-md"
                >
                  <span className="font-medium">{log.hours} hours</span>
                  <span className="mx-1">on</span>
                  <span className="font-medium">{log.date}</span>
                  {log.description && (
                    <span className="ml-2 text-gray-500">- {log.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TimeLogModal;
