import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getISODate } from '@/lib/date-utils';
import { insertTimeLogSchema } from '@shared/schema';

// Interface for Engagement
interface Engagement {
  id: number;
  clientName: string;
  projectName: string;
  startDate: string;
  endDate: string;
  hourlyRate: string;
  description: string;
  status: string;
}

// Extend the time log schema with additional validation
const formSchema = insertTimeLogSchema
  .omit({
    userId: true // We'll add this on the server
  })
  .extend({
    engagementId: z.number().min(1, 'Please select an engagement'),
    date: z.string(), // Change date to string type to match form input
  });

type FormValues = z.infer<typeof formSchema>;

const QuickAddTimeForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch engagements for dropdown
  const { data: engagements = [] } = useQuery<Engagement[]>({
    queryKey: ['/api/engagements/active'],
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      engagementId: undefined,
      date: getISODate(), // Uses default 2025 date
      hours: undefined,
      description: '',
    },
  });

  // Debug: Watch all form values
  const formValues = watch();
  console.log('Current form values:', formValues);
  console.log('Form errors:', errors);

  const onSubmit = async (data: FormValues) => {
    try {
      console.log('Form submitted with data:', data);
      setIsSubmitting(true);

      // Process the data before validation
      const processedData = {
        ...data,
        date: new Date(data.date + 'T00:00:00Z'), // Ensure proper date parsing
        hours: Number(data.hours),
        engagementId: Number(data.engagementId)
      };

      console.log('Sending processed data to server:', processedData);

      // Submit time log
      const response = await apiRequest('POST', '/api/time-logs', processedData);
      console.log('Server response:', response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Failed to add time log');
      }

      const responseData = await response.json();
      console.log('Time log created successfully:', responseData);

      // Success toast
      toast({
        title: 'Time log added',
        description: `${data.hours} hours logged for ${new Date(data.date).toLocaleDateString()}`,
      });

      // Refresh relevant queries
      await queryClient.invalidateQueries({
        queryKey: ['/api/time-logs'],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({
        queryKey: ['/api/dashboard'],
        refetchType: 'all'
      });
      await queryClient.refetchQueries({
        type: 'active'
      });

      // Force refresh workaround
      setTimeout(() => {
        window.location.reload();
      }, 100);

      // Reset form
      reset({
        engagementId: undefined,
        date: getISODate(), // Uses default 2025 date
        hours: undefined,
        description: '',
      });
    } catch (error) {
      console.error('Error adding time log:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add time log',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="engagementSelect" className="block text-sm font-medium text-slate-700 mb-1">
          Engagement
        </Label>
        <Controller
          name="engagementId"
          control={control}
          render={({ field }) => {
            console.log('Engagement field value:', field.value);
            return (
              <Select
                value={field.value?.toString()}
                onValueChange={(value) => {
                  console.log('Engagement selected:', value);
                  field.onChange(Number(value));
                }}
              >
                <SelectTrigger className={errors.engagementId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an engagement" />
                </SelectTrigger>
                <SelectContent>
                  {engagements.map((engagement: Engagement) => (
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="datePicker" className="block text-sm font-medium text-slate-700 mb-1">
            Date
          </Label>
          <Input
            id="datePicker"
            type="date"
            {...register('date')}
            className={errors.date ? 'border-red-500' : ''}
          />
          {errors.date && (
            <span className="text-xs text-red-500">{errors.date.message}</span>
          )}
        </div>
        <div>
          <Label htmlFor="hoursInput" className="block text-sm font-medium text-slate-700 mb-1">
            Hours (max 8)
          </Label>
          <Input
            id="hoursInput"
            type="number"
            step="0.25"
            min="0.25"
            max="8"
            placeholder="0.00"
            {...register('hours', {
              valueAsNumber: true,
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

      <div>
        <Label htmlFor="descriptionInput" className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </Label>
        <Textarea
          id="descriptionInput"
          rows={2}
          placeholder="What did you work on?"
          {...register('description')}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <span className="text-xs text-red-500">{errors.description.message}</span>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Time'}
      </Button>
    </form>
  );
};

export default QuickAddTimeForm;
