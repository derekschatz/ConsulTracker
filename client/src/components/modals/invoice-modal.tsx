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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedClientName?: string;
  preselectedEngagementId?: number;
}

const InvoiceModal = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedClientName,
  preselectedEngagementId,
}: InvoiceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string>('');
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

  // Fetch engagements
  const { data: engagements = [], isLoading: isLoadingEngagements } = useQuery({
    queryKey: ['/api/engagements'],
    enabled: isOpen,
  });

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

  // Watch for changes to form values
  const watchEngagementId = watch('engagementId');
  const watchPeriodStart = watch('periodStart');
  const watchPeriodEnd = watch('periodEnd');

  // Update client name when engagement changes
  useEffect(() => {
    if (watchEngagementId) {
      const selectedEngagement = engagements.find((e: any) => e.id.toString() === watchEngagementId.toString());
      if (selectedEngagement) {
        setValue('clientName', selectedEngagement.clientName);
        setSelectedEngagementId(watchEngagementId.toString());
      }
    }
  }, [watchEngagementId, engagements, setValue]);

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

  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    setTimeLogs([]);
    setInvoiceTotal(0);
    setTotalHours(0);
    onClose();
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
        description: `${log.description} (Date: ${new Date(log.date).toLocaleDateString()})`,
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                <Input
                  id="clientName"
                  placeholder="Client name"
                  {...register('clientName')}
                  className={errors.clientName ? 'border-red-500' : ''}
                  readOnly
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
                      disabled={isLoadingEngagements}
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
                  className={`h-10 ${errors.periodStart ? 'border-red-500' : ''}`}
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
                  className={`h-10 ${errors.periodEnd ? 'border-red-500' : ''}`}
                />
                {errors.periodEnd && (
                  <span className="text-xs text-red-500">{errors.periodEnd.message}</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="netTerms" className="text-sm font-medium text-slate-700">
                    Net Terms
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-xs bg-slate-200 text-slate-700 cursor-help">i</div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-2 text-xs">
                        <p>Due date will be calculated from the billing end date. Invoices will be marked as "overdue" after this date.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Controller
                  name="netTerms"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className={`h-10 ${errors.netTerms ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select net terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Net 30</SelectItem>
                        <SelectItem value="60">Net 60</SelectItem>
                        <SelectItem value="90">Net 90</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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
                              {new Date(log.date).toLocaleDateString()}
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
