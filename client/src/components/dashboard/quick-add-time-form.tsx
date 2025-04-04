import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

const formSchema = z.object({
  engagementId: z.string().min(1, 'Please select an engagement'),
  date: z.string().min(1, 'Date is required'),
  hours: z.string().min(1, 'Hours are required')
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Hours must be a positive number',
    }),
  description: z.string().min(1, 'Description is required'),
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      engagementId: '',
      date: getISODate(new Date(2025, 3, 3)), // Use current reference date
      hours: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Convert values to appropriate types
      const formattedData = {
        engagementId: Number(data.engagementId),
        date: new Date(data.date),
        hours: Number(data.hours),
        description: data.description,
      };

      // Submit time log
      const response = await apiRequest('POST', '/api/time-logs', formattedData);

      if (!response.ok) {
        throw new Error('Failed to add time log');
      }

      // Success toast
      toast({
        title: 'Time log added',
        description: `${data.hours} hours logged for ${new Date(data.date).toLocaleDateString()}`,
      });

      // Reset form
      reset({
        engagementId: '',
        date: getISODate(new Date(2025, 3, 3)), // Use current reference date
        hours: '',
        description: '',
      });

      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error) {
      console.error('Error adding time log:', error);
      toast({
        title: 'Error',
        description: 'Failed to add time log',
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
        <div>
          <Input
            type="hidden"
            {...register('engagementId')}
            id="engagement-id-input"
          />
          <Select 
            onValueChange={(value) => {
              const input = document.getElementById('engagement-id-input') as HTMLInputElement;
              if (input) {
                input.value = value;
                // Trigger a change event to notify react-hook-form
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
              }
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
        </div>
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
            Hours
          </Label>
          <Input
            id="hoursInput"
            type="number"
            step="0.25"
            min="0.25"
            placeholder="0.00"
            {...register('hours')}
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
