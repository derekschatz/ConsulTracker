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
import { insertInvoiceSchema } from '@shared/schema';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatHours } from '@/lib/format-utils';
import { getISODate } from '@/lib/date-utils';
import { generateInvoiceNumber } from '@/lib/format-utils';

// Extend the invoice schema with additional validation
const formSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  engagementId: z.string().or(z.number()).refine(val => Number(val) > 0, {
    message: 'Engagement is required',
  }),
  periodStart: z.string().min(1, 'Billing start is required'),
  periodEnd: z.string().min(1, 'Billing end is required'),
  notes: z.string().optional(),
  netTerms: z.string().min(1, 'Net terms are required'),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedClientName?: string;
  preselectedEngagementId?: number;
}

const InvoiceModal = ({
  open,
  onOpenChange,
  onSuccess,
  preselectedClientName,
  preselectedEngagementId,
}: InvoiceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to track form fields and submission
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  
  // Fetch all active engagements
  const { data: allEngagements = [], isLoading: isLoadingEngagements } = useQuery<any[], any[], any[]>({
    queryKey: ['/api/engagements/active'],
    enabled: open,
  });
  
  // Get unique clients from active engagements
  const uniqueClients = allEngagements.reduce((clients: string[], engagement: any) => {
    if (!clients.includes(engagement.clientName)) {
      clients.push(engagement.clientName);
    }
    return clients;
  }, []).sort();
  
  // Filter active engagements by selected client
  const filteredEngagements = allEngagements.filter((engagement: any) => 
    engagement.clientName === selectedClientName && engagement.status === 'active'
  );

  // Get the next invoice number (in a real app this would come from the server)
  const nextInvoiceNumber = generateInvoiceNumber('INV', 25);
  
  // Initialize form with default values
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
    defaultValues: {
      clientName: preselectedClientName || '',
      engagementId: preselectedEngagementId?.toString() || '',
      periodStart: getISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), // First day of current month
      periodEnd: getISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)), // Last day of current month
      netTerms: '30', // Default to Net-30
      notes: '',
    },
  });
  
  // Set initial selectedClientName based on preselectedClientName if available
  useEffect(() => {
    if (open && preselectedClientName) {
      setSelectedClientName(preselectedClientName);
    }
  }, [open, preselectedClientName]);

  // Watch for changes to form values
  const watchEngagementId = watch('engagementId');
  const watchPeriodStart = watch('periodStart');
  const watchPeriodEnd = watch('periodEnd');

  // Reset engagement if client changes
  useEffect(() => {
    // Reset engagement when client changes
    if (selectedClientName && watchEngagementId) {
      // Check if the selected engagement is valid for this client
      const validEngagement = filteredEngagements.some(
        (e: any) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (!validEngagement) {
        // Reset engagement if it doesn't belong to the selected client
        setValue('engagementId', '');
      }
    }
  }, [selectedClientName, watchEngagementId, filteredEngagements, setValue]);

  // Fetch time logs when engagement, period start, or period end changes
  useEffect(() => {
    const fetchTimeLogs = async () => {
      if (!watchEngagementId || !watchPeriodStart || !watchPeriodEnd) {
        setTimeLogs([]);
        setInvoiceTotal(0);
        setTotalHours(0);
        return;
      }

      try {
        const response = await fetch(
          `/api/time-logs?engagementId=${watchEngagementId}&startDate=${watchPeriodStart}&endDate=${watchPeriodEnd}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch time logs');
        }

        const data = await response.json();
        setTimeLogs(data);

        // Calculate totals
        const total = data.reduce((sum: number, log: any) => sum + log.billableAmount, 0);
        const hours = data.reduce((sum: number, log: any) => sum + log.hours, 0);
        setInvoiceTotal(total);
        setTotalHours(hours);
      } catch (error) {
        console.error('Error fetching time logs:', error);
        setTimeLogs([]);
        setInvoiceTotal(0);
        setTotalHours(0);
      }
    };

    fetchTimeLogs();
  }, [watchEngagementId, watchPeriodStart, watchPeriodEnd]);

  // Add helper function for consistent date handling
  const formatLocalDate = (dateInput: string | Date) => {
    try {
      const dateObj = new Date(dateInput);
      // Create a new date with just the year, month, and day values
      // This forces the date to be interpreted in the local timezone
      const localDate = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate() + 1  // Add one day to compensate for timezone shift
      );
      return localDate;
    } catch (e) {
      console.error("Error formatting date:", e, dateInput);
      return new Date(dateInput);
    }
  };

  // Define close handler
  const handleClose = () => {
    reset();
    setSelectedClientName('');
    setTimeLogs([]);
    setInvoiceTotal(0);
    setTotalHours(0);
    onOpenChange(false);
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    if (timeLogs.length === 0) {
      toast({
        title: 'No time logs to invoice',
        description: 'There are no time logs for the selected period.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare line items
      const lineItems = timeLogs.map((log: any) => ({
        timeLogId: log.id,
        description: `${log.description} (Date: ${formatLocalDate(log.date).toLocaleDateString()})`,
        hours: log.hours,
        rate: log.engagement.hourlyRate,
        amount: log.billableAmount,
      }));

      // Calculate due date based on billing end date and net terms
      const periodEndDate = new Date(data.periodEnd);
      const dueDate = new Date(periodEndDate);
      dueDate.setDate(periodEndDate.getDate() + Number(data.netTerms));

      // Convert values to appropriate types
      const formattedData = {
        invoiceNumber: nextInvoiceNumber,
        clientName: data.clientName,
        engagementId: Number(data.engagementId),
        issueDate: new Date(),
        dueDate: dueDate,
        amount: invoiceTotal,
        status: 'submitted',
        notes: data.notes,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        lineItems,
      };

      // Create invoice
      const response = await apiRequest(
        'POST',
        '/api/invoices',
        formattedData
      );

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      // Success toast
      toast({
        title: 'Invoice created successfully',
        description: `Invoice #${nextInvoiceNumber} for ${formatCurrency(invoiceTotal)}`,
      });

      // Close modal and reset form
      handleClose();
      
      // Force a refresh of all invoice queries to ensure UI is updated
      console.log('Force refreshing data after creating invoice');
      
      // First force refresh all queries that might show this invoice
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === 'string' && (
            queryKey.startsWith('/api/invoices') || 
            queryKey.startsWith('/api/dashboard')
          );
        },
        type: 'active'
      });
      
      // Trigger success callback
      onSuccess();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="clientName" className="text-sm font-medium text-slate-700">
                  Client
                </Label>
                <Controller
                  name="clientName"
                  control={control}
                  render={({ field }) => (
                    <Select
                      disabled={isLoadingEngagements}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedClientName(value);
                      }}
                    >
                      <SelectTrigger className={errors.clientName ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueClients.map((clientName: string) => (
                          <SelectItem key={clientName} value={clientName}>
                            {clientName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.clientName && (
                  <span className="text-xs text-red-500">{errors.clientName.message}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="engagementId" className="text-sm font-medium text-slate-700">
                  Engagement
                </Label>
                <Controller
                  name="engagementId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      disabled={isLoadingEngagements || !selectedClientName}
                      value={field.value.toString()}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className={errors.engagementId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select an active engagement" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEngagements.map((engagement: any) => (
                          <SelectItem key={engagement.id} value={engagement.id.toString()}>
                            {engagement.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.engagementId && (
                  <span className="text-xs text-red-500">{errors.engagementId.message}</span>
                )}
                {selectedClientName && filteredEngagements.length === 0 && (
                  <span className="text-xs text-amber-500">No active engagements found for {selectedClientName}</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="periodStart" className="text-sm font-medium text-slate-700">
                  Billing Start
                </Label>
                <Input
                  id="periodStart"
                  type="date"
                  {...register('periodStart')}
                  className={errors.periodStart ? 'border-red-500' : ''}
                />
                {errors.periodStart && (
                  <span className="text-xs text-red-500">{errors.periodStart.message}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="periodEnd" className="text-sm font-medium text-slate-700">
                  Billing End
                </Label>
                <Input
                  id="periodEnd"
                  type="date"
                  {...register('periodEnd')}
                  className={errors.periodEnd ? 'border-red-500' : ''}
                />
                {errors.periodEnd && (
                  <span className="text-xs text-red-500">{errors.periodEnd.message}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="netTerms" className="text-sm font-medium text-slate-700">
                  Net Terms (Days)
                </Label>
                <Input
                  id="netTerms"
                  type="number"
                  min="0"
                  {...register('netTerms')}
                  className={errors.netTerms ? 'border-red-500' : ''}
                />
                {errors.netTerms && (
                  <span className="text-xs text-red-500">{errors.netTerms.message}</span>
                )}
              </div>
            </div>

            {/* Time Log Preview */}
            <div className="grid grid-cols-1 gap-2 mt-2">
              <Label className="text-sm font-medium text-slate-700">
                Time Logs to be Invoiced
              </Label>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 text-left border-b border-slate-200">
                        <th className="py-2 px-3 text-xs font-medium text-slate-500">Date</th>
                        <th className="py-2 px-3 text-xs font-medium text-slate-500">Description</th>
                        <th className="py-2 px-3 text-xs font-medium text-slate-500 text-right">Hours</th>
                        <th className="py-2 px-3 text-xs font-medium text-slate-500 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                            No time logs found for the selected period
                          </td>
                        </tr>
                      ) : (
                        timeLogs.map((log: any) => (
                          <tr key={log.id} className="border-b border-slate-100 text-sm">
                            <td className="py-2 px-3 text-slate-700">
                              {formatLocalDate(log.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{log.description}</td>
                            <td className="py-2 px-3 text-slate-700 text-right">{formatHours(log.hours)}</td>
                            <td className="py-2 px-3 text-slate-900 font-medium text-right">
                              {formatCurrency(log.billableAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 text-sm font-medium">
                        <td className="py-2 px-3" colSpan={2}>Total</td>
                        <td className="py-2 px-3 text-right">{formatHours(totalHours)}</td>
                        <td className="py-2 px-3 text-slate-900 text-right">{formatCurrency(invoiceTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                Invoice Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes to appear on the invoice"
                rows={2}
                {...register('notes')}
              />
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
              disabled={isSubmitting || timeLogs.length === 0}
            >
              {isSubmitting ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
