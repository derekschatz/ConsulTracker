import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
import { formatDate, toLocalDate, toStorageDate, addDays } from '@/lib/date-utils';
import { generateInvoiceNumber } from '@/lib/format-utils';
import { formatDateForDisplay } from '@/lib/date-utils';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

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
  onClose: () => void;
  periodStart: Date | null;
  periodEnd: Date | null;
  engagementId: string | null;
}

interface TimeLog {
  id: string;
  description: string;
  hours: number;
  date: string;
  billableAmount: number;
  engagement: {
    hourlyRate: string;
  };
}

interface LineItem {
  id: string;
  date: string;
  description: string;
  hours: number;
  hourlyRate: number;
  billableAmount: number;
}

interface Summary {
  hours: number;
  amount: number;
}

const InvoiceModal = ({
  open,
  onClose,
  periodStart,
  periodEnd,
  engagementId,
}: InvoiceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to track form fields and submission
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: selectedClientName || '',
      engagementId: engagementId || '',
      periodStart: periodStart ? new Date(periodStart).toISOString().split('T')[0] : '',
      periodEnd: periodEnd ? new Date(periodEnd).toISOString().split('T')[0] : '',
      netTerms: '30', // Default to Net-30
      notes: '',
    },
  });

  const { handleSubmit, watch, setValue } = form;
  
  // Set initial selectedClientName based on preselectedClientName if available
  useEffect(() => {
    if (open && selectedClientName) {
      setSelectedClientName(selectedClientName);
    }
  }, [open, selectedClientName]);

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

  // Calculate total from time logs
  const calculateTotal = (logs: TimeLog[]): number => {
    return logs.reduce((sum: number, log: TimeLog) => sum + log.billableAmount, 0);
  };

  useEffect(() => {
    if (watchEngagementId && open) {
      const fetchTimeLogs = async () => {
        try {
          const response = await fetch(
            `/api/time-logs?engagementId=${watchEngagementId}&startDate=${watchPeriodStart}&endDate=${watchPeriodEnd}`,
            { credentials: 'include' }
          );
          
          if (!response.ok) throw new Error('Failed to fetch time logs');
          
          const logs: TimeLog[] = await response.json();
          setTimeLogs(logs);
          setInvoiceTotal(calculateTotal(logs));
          setTotalHours(logs.reduce((sum: number, log: TimeLog) => sum + log.hours, 0));
        } catch (error) {
          console.error('Error fetching time logs:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch time logs',
            variant: 'destructive'
          });
          setTimeLogs([]);
          setInvoiceTotal(0);
          setTotalHours(0);
        }
      };
      fetchTimeLogs();
    }
  }, [watchEngagementId, watchPeriodStart, watchPeriodEnd, open]);

  // Add formatLocalDate helper function
  const formatLocalDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Define close handler
  const handleClose = () => {
    form.reset();
    setSelectedClientName('');
    setTimeLogs([]);
    setInvoiceTotal(0);
    setTotalHours(0);
    onClose();
  };

  // Convert time logs to line items
  const lineItems = timeLogs.map((log) => {
    const hourlyRate = parseFloat(log.engagement.hourlyRate);
    return {
      id: log.id,
      date: log.date,
      description: log.description,
      hours: log.hours,
      hourlyRate,
      billableAmount: log.billableAmount
    };
  }) satisfies LineItem[];

  // Format dates for API request
  const formattedStartDate = watchPeriodStart ? new Date(watchPeriodStart).toISOString() : null;
  const formattedEndDate = watchPeriodEnd ? new Date(watchPeriodEnd).toISOString() : null;

  // Calculate invoice summary
  const summary = useMemo(() => {
    return lineItems.reduce((sum: Summary, item) => ({
      hours: sum.hours + item.hours,
      amount: sum.amount + item.billableAmount
    }), { hours: 0, amount: 0 });
  }, [lineItems]);

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Calculate due date based on net terms
      const today = new Date();
      const dueDate = addDays(today, parseInt(data.netTerms));

      const invoiceData = {
        ...data,
        invoiceNumber: nextInvoiceNumber,
        issueDate: toStorageDate(today).toISOString().split('T')[0],
        dueDate: toStorageDate(dueDate).toISOString().split('T')[0],
        amount: invoiceTotal.toString(), // Convert to string for storage
        status: 'submitted' as const,
        timeLogs: timeLogs.map(log => ({
          id: log.id,
          description: log.description,
          hours: log.hours,
          hourlyRate: parseFloat(log.engagement.hourlyRate),
          billableAmount: log.billableAmount,
          date: toStorageDate(new Date(log.date)).toISOString().split('T')[0]
        }))
      };

      const response = await apiRequest('POST', '/api/invoices', invoiceData);

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      handleClose();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice for the selected time period and engagement.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Client and Engagement Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="clientName">Client</Label>
                    <Controller
                      name="clientName"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          disabled={isLoadingEngagements}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
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
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="engagementId">Engagement</Label>
                    <Controller
                      name="engagementId"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          disabled={!selectedClientName || isLoadingEngagements}
                          value={field.value?.toString()}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an engagement" />
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="periodStart">Start Date</Label>
                    <Controller
                      name="periodStart"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="periodEnd">End Date</Label>
                    <Controller
                      name="periodEnd"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Time Logs Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Time Logs</h3>
                {timeLogs.length === 0 ? (
                  <p className="text-gray-500 italic">No time logs found for the selected period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Hours</th>
                          <th className="px-4 py-2 text-right">Rate</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeLogs.map((log) => (
                          <tr key={log.id} className="border-t">
                            <td className="px-4 py-2">{formatLocalDate(log.date)}</td>
                            <td className="px-4 py-2">{log.description}</td>
                            <td className="px-4 py-2 text-right">{formatHours(log.hours)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(parseFloat(log.engagement.hourlyRate))}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(log.billableAmount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t font-semibold">
                          <td colSpan={2} className="px-4 py-2 text-right">Total:</td>
                          <td className="px-4 py-2 text-right">{formatHours(totalHours)}</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right">{formatCurrency(invoiceTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes to appear on the invoice"
                  rows={2}
                  {...form.register('notes')}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
