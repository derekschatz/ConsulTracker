import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@shared/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatCurrency,
  formatHours,
  generateInvoiceNumber,
} from "@/lib/format-utils";
import {
  formatDate,
  toLocalDate,
  toStorageDate,
  addDays,
} from "@/lib/date-utils";
import { formatDateForDisplay } from "@/lib/date-utils";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useRouter } from "wouter";

interface Engagement {
  id: number;
  clientName: string;
  projectName: string;
  hourlyRate: string;
  startDate: string;
  endDate: string;
  status: string;
  userId: number;
}

// Extend the invoice schema with additional validation
const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  engagementId: z
    .string()
    .or(z.number())
    .refine((val) => Number(val) > 0, {
      message: "Engagement is required",
    }),
  periodStart: z.string().min(1, "Billing start is required"),
  periodEnd: z.string().min(1, "Billing end is required"),
  notes: z.string().optional(),
  netTerms: z.string().min(1, "Net terms are required"),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  engagementId?: string | null;
}

interface TimeLog {
  id: number;
  userId: number;
  engagementId: number;
  date: string;
  hours: number;
  description: string;
  createdAt: string;
  engagement: {
    id: number;
    clientName: string;
    projectName: string;
    hourlyRate: string;
    startDate: string;
    endDate: string;
    status: string;
    userId: number;
  };
  billableAmount: number;
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
  onOpenChange,
  onSuccess,
  periodStart,
  periodEnd,
  engagementId,
}: InvoiceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all active engagements
  const { data: engagements = [], isLoading: isLoadingEngagements } = useQuery<
    Engagement[]
  >({
    queryKey: ["/api/engagements/active"],
    enabled: open,
  });

  // Get unique clients from active engagements
  const uniqueClients = engagements
    .reduce((clients: string[], engagement: Engagement) => {
      if (!clients.includes(engagement.clientName)) {
        clients.push(engagement.clientName);
      }
      return clients;
    }, [])
    .sort();

  // Filter active engagements by selected client
  const filteredEngagements = engagements.filter(
    (engagement: Engagement) =>
      engagement.clientName === selectedClientName &&
      engagement.status === "active",
  );

  // Get the next invoice number (in a real app this would come from the server)
  const nextInvoiceNumber = generateInvoiceNumber("INV", 25);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      engagementId: engagementId || "",
      periodStart: periodStart ? toStorageDate(periodStart) : "",
      periodEnd: periodEnd ? toStorageDate(periodEnd) : "",
      netTerms: "30",
      notes: "",
    },
  });

  const {
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = form;

  // Watch for changes to form values
  const watchClientName = watch("clientName");
  const watchEngagementId = watch("engagementId");
  const watchPeriodStart = watch("periodStart");
  const watchPeriodEnd = watch("periodEnd");

  // Update selectedClientName when client changes in form
  useEffect(() => {
    if (watchClientName) {
      setSelectedClientName(watchClientName);
    }
  }, [watchClientName]);

  // Reset engagement if client changes
  useEffect(() => {
    // Reset engagement when client changes
    if (selectedClientName && watchEngagementId) {
      // Check if the selected engagement is valid for this client
      const validEngagement = filteredEngagements.some(
        (e: any) => e.id.toString() === watchEngagementId.toString(),
      );

      if (!validEngagement) {
        // Reset engagement if it doesn't belong to the selected client
        form.setValue("engagementId", "");
      }
    }
  }, [selectedClientName, watchEngagementId, filteredEngagements, form]);

  // Calculate total from time logs
  const calculateTotal = (logs: TimeLog[]): number => {
    return logs.reduce(
      (sum: number, log: TimeLog) => sum + log.billableAmount,
      0,
    );
  };

  useEffect(() => {
    if (watchEngagementId && open) {
      const fetchTimeLogs = async () => {
        try {
          const response = await fetch(
            `/api/time-logs?engagementId=${watchEngagementId}&startDate=${watchPeriodStart}&endDate=${watchPeriodEnd}`,
            { credentials: "include" },
          );

          if (!response.ok) throw new Error("Failed to fetch time logs");

          const logs: TimeLog[] = await response.json();
          setTimeLogs(logs);
          setInvoiceTotal(calculateTotal(logs));
          setTotalHours(
            logs.reduce((sum: number, log: TimeLog) => sum + log.hours, 0),
          );
        } catch (error) {
          console.error("Error fetching time logs:", error);
          setTimeLogs([]);
          setInvoiceTotal(0);
          setTotalHours(0);
        }
      };
      fetchTimeLogs();
    }
  }, [watchEngagementId, watchPeriodStart, watchPeriodEnd, open]);

  // Add formatLocalDate helper function
  const formatLocalDate = (date: Date): string => {
    // Add timezone offset to prevent date shift
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    return localDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  function formatAmount(amount: number): string {
    return formatCurrency(amount);
  }

  // Define close handler
  const handleClose = () => {
    form.reset();
    setSelectedClientName("");
    setTimeLogs([]);
    setInvoiceTotal(0);
    setTotalHours(0);
    onOpenChange(false);
  };

  // Convert time logs to line items
  const lineItems: LineItem[] = timeLogs.map((log) => ({
    id: log.id.toString(),
    date: log.date,
    description: log.description,
    hours: log.hours,
    hourlyRate: parseFloat(log.engagement.hourlyRate),
    billableAmount: log.billableAmount,
  }));

  // Format dates for API request
  const formattedStartDate = watchPeriodStart
    ? new Date(watchPeriodStart).toISOString()
    : null;
  const formattedEndDate = watchPeriodEnd
    ? new Date(watchPeriodEnd).toISOString()
    : null;

  // Calculate invoice summary
  const summary = useMemo(() => {
    return lineItems.reduce(
      (sum: Summary, item) => ({
        hours: sum.hours + item.hours,
        amount: sum.amount + item.billableAmount,
      }),
      { hours: 0, amount: 0 },
    );
  }, [lineItems]);

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Starting invoice submission...", data);
      setIsSubmitting(true);
      setError(null);

      if (!selectedClientName || !watchEngagementId) {
        toast({
          title: "Error",
          description: "Please select a client and engagement",
          variant: "destructive",
        });
        return;
      }

      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId,
      );
      if (!selectedEngagement) {
        toast({
          title: "Error",
          description: "Selected engagement is not valid",
          variant: "destructive",
        });
        return;
      }

      const lineItems = timeLogs.map((log) => ({
        description: log.description,
        hours: log.hours,
        rate: parseFloat(selectedEngagement.hourlyRate),
        amount: log.hours * parseFloat(selectedEngagement.hourlyRate),
      }));

      const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const issueDate = new Date();
      const dueDate = addDays(issueDate, parseInt(data.netTerms));

      const submission = {
        engagementId: selectedEngagement.id,
        userId: selectedEngagement.userId,
        clientName: selectedEngagement.clientName,
        projectName: selectedEngagement.projectName,
        invoiceNumber: nextInvoiceNumber,
        issueDate: toStorageDate(issueDate),
        dueDate: toStorageDate(dueDate),
        totalAmount: invoiceTotal,
        totalHours: totalHours,
        status: "submitted" as const,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        notes: data.notes || undefined,
      };

      console.log("Prepared invoice data:", submission);

      // Make the API call
      try {
        console.log("Making API call to create invoice...");
        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submission),
        });

        console.log("Received API response:", {
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error details:", errorData);
          throw new Error(errorData.error || "Failed to create invoice");
        }

        const result = await response.json();
        console.log("Successfully created invoice:", result);

        // Invalidate and refetch relevant queries
        await queryClient.refetchQueries({
          predicate: (query) => {
            const queryKey = query.queryKey[0];
            return (
              typeof queryKey === "string" &&
              (queryKey.startsWith("/api/invoices") ||
                queryKey.startsWith("/api/dashboard"))
            );
          },
          type: "active",
        });

        toast({
          title: "Success",
          description: "Invoice created successfully",
        });

        onOpenChange(false);
        if (onSuccess) onSuccess();
      } catch (apiError) {
        console.error("API call failed:", apiError);
        setError(
          apiError instanceof Error
            ? apiError.message
            : "Failed to create invoice",
        );
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for billable hours
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
                            {filteredEngagements.map(
                              (engagement: Engagement) => (
                                <SelectItem
                                  key={engagement.id}
                                  value={engagement.id.toString()}
                                >
                                  {engagement.projectName}
                                </SelectItem>
                              ),
                            )}
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
                              value={field.value || ""}
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
                              value={field.value || ""}
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
                  <p className="text-gray-500 italic">
                    No time logs found for the selected period.
                  </p>
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
                            <td className="px-4 py-2">
                              {formatLocalDate(new Date(log.date))}
                            </td>
                            <td className="px-4 py-2">{log.description}</td>
                            <td className="px-4 py-2 text-right">
                              {formatHours(log.hours)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(
                                Number(log.engagement.hourlyRate),
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(log.billableAmount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t font-semibold">
                          <td colSpan={2} className="px-4 py-2 text-right">
                            Total:
                          </td>
                          <td className="px-4 py-2 text-right">
                            {formatHours(totalHours)}
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(invoiceTotal)}
                          </td>
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
                  {...form.register("notes")}
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
                {isSubmitting ? "Generating..." : "Generate Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
