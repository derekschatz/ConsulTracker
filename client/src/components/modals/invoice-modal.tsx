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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
import axios from "axios";

interface Engagement {
  id: number;
  clientName: string;
  clientId: number;
  projectName: string;
  hourlyRate: string;
  projectAmount?: string | number | null;
  project_amount?: string | number | null;
  startDate: string;
  endDate: string;
  status: string;
  userId: number;
  engagementType?: 'hourly' | 'project';
  engagement_type?: 'hourly' | 'project';
  client_id?: number;
  netTerms?: number;
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
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  notes: z.string().optional(),
  invoiceAmount: z.number().nonnegative().optional().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  engagementId?: string | null;
  invoice?: any; // The invoice to edit (if in edit mode)
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
  invoice,
}: InvoiceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [totalHours, setTotalHours] = useState(0);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clientBillingDetails, setClientBillingDetails] = useState<any>(null);
  const [selectedEngagementType, setSelectedEngagementType] = useState<'hourly' | 'project'>('hourly');
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [exceedsProjectAmount, setExceedsProjectAmount] = useState<boolean>(false);
  const router = useRouter();

  // Fetch all active engagements using the direct endpoint
  const { data: rawEngagements = [], isLoading: isLoadingEngagements } = useQuery<
    Engagement[]
  >({
    queryKey: ["/api/direct/engagements/active"],
    enabled: open,
  });
  
  // Normalize engagement data to ensure it has consistent properties
  const normalizeEngagement = (engagement: Engagement) => {
    const normalized = { ...engagement };
    
    // Handle different naming conventions between API responses
    if ('project_name' in engagement) {
      normalized.projectName = engagement.project_name as string;
    }
    if ('engagement_type' in engagement) {
      normalized.engagementType = engagement.engagement_type as 'hourly' | 'project';
    }
    if ('hourly_rate' in engagement) {
      normalized.hourlyRate = engagement.hourly_rate as string;
    }
    
    return normalized;
  };
  
  // Apply normalization to all engagements
  const engagements = useMemo(() => {
    const normalized = rawEngagements.map(normalizeEngagement);
    return normalized;
  }, [rawEngagements]);

  // Get unique clients from active engagements
  const uniqueClients = useMemo(() => {
    const clients = engagements
      .filter((engagement: Engagement) => 
        // Only include engagements that have a clientName
        engagement.clientName && typeof engagement.clientName === 'string' && 
        engagement.clientName.trim() !== ''
      )
      .map((engagement: Engagement) => engagement.clientName)
      .filter((name, index, array) => array.indexOf(name) === index)
      .sort();
    
    return clients;
  }, [engagements]);

  // Filter active engagements by selected client
  const filteredEngagements = useMemo(() => {
    const filtered = engagements.filter(
      (engagement: Engagement) =>
        engagement.clientName === selectedClientName &&
        engagement.status === "active"
    );
    
    return filtered;
  }, [engagements, selectedClientName]);

  // Get the next invoice number (in a real app this would come from the server)
  const nextInvoiceNumber = generateInvoiceNumber("INV", 25);

  // Initialize form with default values or edit values if provided
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: invoice?.clientName || "",
      engagementId: invoice?.engagementId?.toString() || engagementId || "",
      periodStart: invoice?.periodStart ? toStorageDate(new Date(invoice.periodStart)) : (periodStart ? toStorageDate(periodStart) : ""),
      periodEnd: invoice?.periodEnd ? toStorageDate(new Date(invoice.periodEnd)) : (periodEnd ? toStorageDate(periodEnd) : ""),
      notes: invoice?.notes || "",
      invoiceAmount: invoice?.totalAmount || 0,
    },
  });

  const {
    handleSubmit,
    watch,
    control,
    formState: { errors },
    setValue,
    register,
  } = form;

  // Watch for changes to form values
  const watchClientName = watch("clientName");
  const watchEngagementId = watch("engagementId");
  const watchPeriodStart = watch("periodStart");
  const watchPeriodEnd = watch("periodEnd");
  const watchInvoiceAmount = watch("invoiceAmount");

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

  // Update engagement type when engagement changes
  useEffect(() => {
    if (watchEngagementId) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement) {
        // Determine engagement type consistently (prioritize the database column name)
        const engagementType = selectedEngagement.engagement_type || selectedEngagement.engagementType || 'hourly';
        setSelectedEngagementType(engagementType as 'hourly' | 'project');
        
        // For project-based engagements, set default invoice amount to project amount
        if (engagementType === 'project') {
          const rawAmount = selectedEngagement.project_amount || selectedEngagement.projectAmount || 0;
          let projectAmount = 0; // Default
          
          if (rawAmount !== undefined && rawAmount !== null) {
            try {
              const parsed = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);
              if (!isNaN(parsed)) {
                projectAmount = parsed;
              }
            } catch (e) {
              console.error("Error parsing project amount:", e);
            }
          }
          
          setValue('invoiceAmount', projectAmount);
          setInvoiceAmount(projectAmount);
          setInvoiceTotal(projectAmount);
        }
      }
    }
  }, [watchEngagementId, filteredEngagements, setValue]);

  // Check if invoice amount exceeds project amount
  useEffect(() => {
    if (selectedEngagementType === 'project' && watchEngagementId) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement && selectedEngagement.projectAmount) {
        const projectAmount = typeof selectedEngagement.projectAmount === 'string' 
          ? parseFloat(selectedEngagement.projectAmount) 
          : Number(selectedEngagement.projectAmount);
        
        // Ensure watchInvoiceAmount is treated as a number
        const currentInvoiceAmount = typeof watchInvoiceAmount === 'number' ? watchInvoiceAmount : 0;
        
        setExceedsProjectAmount(currentInvoiceAmount > projectAmount);
        setInvoiceTotal(currentInvoiceAmount);
      }
    }
  }, [watchInvoiceAmount, watchEngagementId, filteredEngagements, selectedEngagementType]);

  // Fetch client billing details when engagement is selected
  useEffect(() => {
    if (watchEngagementId && selectedClientName && !isEditMode) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement) {
        // Fetch detailed engagement with client information
        const fetchClientDetails = async () => {
          try {
            // Access the clientId ensuring it's a number
            const clientId = Number(selectedEngagement.clientId || selectedEngagement.client_id);
            if (isNaN(clientId) || clientId <= 0) {
              console.error("Valid client ID not found in engagement:", selectedEngagement);
              return;
            }
            
            // The correct signature is apiRequest(method, url, data?, options?)
            const response = await apiRequest('GET', `/api/clients/${clientId}`);
            const result = await response.json();
            
            console.log("Retrieved client billing details:", result);
            setClientBillingDetails(result);
          } catch (error) {
            console.error("Error fetching client details:", error);
          }
        };
        
        fetchClientDetails();
      }
    }
  }, [watchEngagementId, selectedClientName, filteredEngagements, isEditMode]);

  // Fetch time logs based on selectedDateRange and selected engagement
  useEffect(() => {
    if (!watchEngagementId || !watchPeriodStart || !watchPeriodEnd) return;
    
    const selectedEngagement = filteredEngagements.find(
      (e) => e.id.toString() === watchEngagementId.toString()
    );
    
    if (!selectedEngagement) return;
    
    // Skip fetching time logs for project-based engagements
    if (selectedEngagementType === 'project') {
      setTimeLogs([]);
      return;
    }
    
    // Format dates for the API request
    const startDate = new Date(watchPeriodStart);
    const endDate = new Date(watchPeriodEnd);
    
    const fetchTimeLogsData = async () => {
      try {
        setIsSubmitting(true);
        
        // Fetch time logs for the selected date range and engagement
        const response = await apiRequest('GET', '/api/time-logs', {
          engagement_id: selectedEngagement.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });
        
        const timeLogsData = await response.json();
        setTimeLogs(timeLogsData);
        
        // Calculate totals
        const total = timeLogsData.reduce((sum: number, log: TimeLog) => sum + log.billableAmount, 0);
        const hours = timeLogsData.reduce((sum: number, log: TimeLog) => sum + log.hours, 0);
        
        setInvoiceTotal(total);
        setTotalHours(hours);
      } catch (error) {
        console.error('Error fetching time logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch time logs",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    
    fetchTimeLogsData();
  }, [watchEngagementId, watchPeriodStart, watchPeriodEnd, filteredEngagements, selectedEngagementType, toast]);

  // Calculate total billable amount from time logs
  const calculateTotal = (logs: TimeLog[]): number => {
    return logs.reduce((sum: number, log: TimeLog) => sum + log.billableAmount, 0);
  };

  // Format date for display
  const formatLocalDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format hours for display
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
    setIsEditMode(false);
    setSelectedEngagementType('hourly');
    setInvoiceAmount(0);
    setExceedsProjectAmount(false);
    onOpenChange(false);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open && invoice) {
      console.log("Setting up edit mode with invoice:", invoice);
      setIsEditMode(true);
      
      // Handle both camelCase and snake_case property names
      const periodStartValue = invoice.periodStart || invoice.period_start;
      const periodEndValue = invoice.periodEnd || invoice.period_end;
      const clientNameValue = invoice.clientName || invoice.client_name;
      const engagementIdValue = invoice.engagementId || invoice.engagement_id;
      const notesValue = invoice.notes;
      const totalAmountValue = invoice.totalAmount || invoice.total_amount || 0;
      
      // Set clientName first to trigger filteredEngagements update
      setSelectedClientName(clientNameValue || "");
      
      console.log("Edit mode - Client name:", clientNameValue);
      console.log("Edit mode - Engagement ID:", engagementIdValue);
      // Explicitly log the total amount value to ensure it's being properly retrieved
      console.log("Total amount from invoice:", totalAmountValue);
      
      const periodStartDate = periodStartValue ? new Date(periodStartValue) : null;
      const periodEndDate = periodEndValue ? new Date(periodEndValue) : null;
      
      const formattedStartDate = periodStartDate ? toStorageDate(periodStartDate) : "";
      const formattedEndDate = periodEndDate ? toStorageDate(periodEndDate) : "";
      
      // Wait a brief moment to ensure engagements are loaded and filtered
      setTimeout(() => {
      const formValues = {
        clientName: clientNameValue || "",
        engagementId: engagementIdValue?.toString() || "",
        periodStart: formattedStartDate,
        periodEnd: formattedEndDate,
        notes: notesValue || "",
        invoiceAmount: totalAmountValue
      };
      
      // Reset form with invoice values
      form.reset(formValues);
        
        // Determine if this is a project-based invoice
        // First check explicit engagement type
        let isProjectType = 
          (invoice.engagementType === 'project') || 
          (invoice.engagement_type === 'project') ||
          // Some invoices may have an isProjectBased field
          (invoice.isProjectBased === true);
        
        // If we couldn't determine from explicit fields, check for project indicators
        if (!isProjectType) {
          // If there's a single line item with hours=1, it's likely a project invoice
          const hasProjectLineItem = Array.isArray(invoice.lineItems) && 
            invoice.lineItems.length === 1 && 
            invoice.lineItems[0].hours === 1;
          
          // Also check if there are no time logs but there is a total amount
          const hasAmountNoTimeLogs = !invoice.timeLogs && totalAmountValue > 0;
          
          isProjectType = hasProjectLineItem || hasAmountNoTimeLogs;
        }
        
        // Force project engagement type for this invoice
        setSelectedEngagementType(isProjectType ? 'project' : 'hourly');
      setInvoiceAmount(totalAmountValue);
      setInvoiceTotal(totalAmountValue);
        
        console.log("Set engagement type for edit mode:", isProjectType ? 'project' : 'hourly');
      }, 100);
    } else if (!open) {
      // Reset everything when modal closes
      setSelectedClientName("");
      setTimeLogs([]);
      setInvoiceTotal(0);
      setTotalHours(0);
      setIsEditMode(false);
      setClientBillingDetails(null);
      setSelectedEngagementType('hourly');
      setInvoiceAmount(0);
      setExceedsProjectAmount(false);
    }
  }, [open, invoice, form]);

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

  // Handle invoice amount change
  const handleInvoiceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input
    if (value === '') {
      setInvoiceAmount(0);
      setValue('invoiceAmount', 0);
      return;
    }
    
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      setInvoiceAmount(amount);
      setValue('invoiceAmount', amount);
    }
  };

  // Calculate due date using engagement's netTerms
  const calculateDueDate = (issueDate: Date, engagement: Engagement): Date => {
    const dueDate = new Date(issueDate);
    // Get net terms from engagement, default to 30 days if not available
    const netTerms = engagement.netTerms || 30;
    dueDate.setDate(dueDate.getDate() + netTerms);
    return dueDate;
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Get the selected engagement from the filtered engagements
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === data.engagementId.toString()
      );

      if (!selectedEngagement) {
        throw new Error("No engagement selected");
      }

      // Determine issue date based on edit mode
      const issueDate = isEditMode ? new Date(invoice.issueDate) : new Date();
      
      // Calculate due date based on engagement's net terms
      const dueDate = calculateDueDate(issueDate, selectedEngagement);

      // Prepare all the data differently based on engagement type
      let submission;

      // Create completely different submission objects based on engagement type
      if (selectedEngagementType === 'project') {
        // For project-based engagements, create a specialized submission
        const projectAmount = (typeof data.invoiceAmount === 'number' && !isNaN(data.invoiceAmount)) 
          ? data.invoiceAmount 
          : 0;
        
        // Create base object with totalHours set to 1 for project engagements
        submission = {
          engagementId: selectedEngagement.id,
          userId: selectedEngagement.userId,
          clientName: selectedEngagement.clientName,
          projectName: selectedEngagement.projectName,
          invoiceNumber: isEditMode ? invoice.invoiceNumber : nextInvoiceNumber,
          issueDate: toStorageDate(issueDate),
          dueDate: toStorageDate(dueDate),
          totalAmount: projectAmount,
          totalHours: 1, // Set to 1 for project-based engagements
          lineItems: [{
            description: `Project fee for ${selectedEngagement.projectName}`,
            amount: projectAmount,
            hours: 1, // Set hours to 1 to match totalHours
            rate: projectAmount // Rate is set to the project amount to make the math work
          }],
          status: isEditMode ? invoice.status : "submitted" as const,
          periodStart: data.periodStart || "",
          periodEnd: data.periodEnd || "",
          notes: data.notes || "",
          engagementType: 'project',  // Explicitly mark as project
          isProjectBased: true,  // Add an extra flag to be absolutely clear
        };
        
        // Use the baseSubmission without totalHours
        submission = submission;

        // Include client billing details if available
        if (clientBillingDetails) {
          Object.assign(submission, {
            billingContactName: clientBillingDetails.billingContactName || "",
            billingContactEmail: clientBillingDetails.billingContactEmail || "",
            billingAddress: clientBillingDetails.billingAddress || "",
            billingCity: clientBillingDetails.billingCity || "",
            billingState: clientBillingDetails.billingState || "",
            billingZip: clientBillingDetails.billingZip || "",
            billingCountry: clientBillingDetails.billingCountry || "",
          });
        }
      } else {
        // For hourly engagements, continue with the previous approach
        const lineItems = timeLogs.map((log) => ({
          description: log.description,
          hours: log.hours,
          rate: parseFloat(selectedEngagement.hourlyRate),
          amount: log.hours * parseFloat(selectedEngagement.hourlyRate),
        }));
        
        const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const hours = timeLogs.reduce((sum, log) => sum + log.hours, 0);
        
        submission = {
        engagementId: selectedEngagement.id,
        userId: selectedEngagement.userId,
        clientName: selectedEngagement.clientName,
        projectName: selectedEngagement.projectName,
        invoiceNumber: isEditMode ? invoice.invoiceNumber : nextInvoiceNumber,
        issueDate: toStorageDate(issueDate),
        dueDate: toStorageDate(dueDate),
          totalAmount: (typeof invoiceTotal === 'number' ? invoiceTotal : 0) || total,
        totalHours: hours,
          lineItems: lineItems,
        status: isEditMode ? invoice.status : "submitted" as const,
          periodStart: data.periodStart || "",
          periodEnd: data.periodEnd || "",
          notes: data.notes || "",
          engagementType: 'hourly',  // Explicitly mark as hourly
        };
        
        // Include client billing details if available
        if (clientBillingDetails) {
          Object.assign(submission, {
            billingContactName: clientBillingDetails.billingContactName || "",
            billingContactEmail: clientBillingDetails.billingContactEmail || "",
            billingAddress: clientBillingDetails.billingAddress || "",
            billingCity: clientBillingDetails.billingCity || "",
            billingState: clientBillingDetails.billingState || "",
            billingZip: clientBillingDetails.billingZip || "",
            billingCountry: clientBillingDetails.billingCountry || "",
          });
        }
      }

      console.log(`Prepared invoice data for ${isEditMode ? 'update' : 'creation'}:`, submission);
      console.log("Submission JSON:", JSON.stringify(submission, null, 2));

      // Make the API call
      try {
        console.log(`Making API call to ${isEditMode ? 'update' : 'create'} invoice...`);
        const url = isEditMode ? `/api/invoices/${invoice.id}` : "/api/invoices";
        const method = isEditMode ? "PUT" : "POST";
        
        // Create a JSON replacer function to eliminate null or undefined values
        const jsonReplacer = (key: string, value: any) => {
          // Return undefined to eliminate keys with null or undefined values
          return value === null || value === undefined ? undefined : value;
        };
        
        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          // Use the replacer function to eliminate null/undefined values
          body: JSON.stringify(submission, jsonReplacer),
        });

        console.log("Received API response:", {
          status: response.status,
          statusText: response.statusText,
        });

        // For debugging: log the raw response text before parsing
        const responseText = await response.text();
        console.log("Raw response body:", responseText);

        if (!response.ok) {
          let errorData;
          try {
            // Try to parse the response as JSON
            errorData = JSON.parse(responseText);
          } catch (e) {
            console.error("Failed to parse error response as JSON:", e);
            errorData = { error: responseText || `Failed to ${isEditMode ? 'update' : 'create'} invoice` };
          }
          console.error("API error details:", errorData);
          throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} invoice`);
        }

        let result;
        try {
          // Try to parse the response as JSON
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse success response as JSON:", e);
          result = { message: "Operation completed, but couldn't parse response" };
        }
        console.log(`Successfully ${isEditMode ? 'updated' : 'created'} invoice:`, result);

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
          description: `Invoice ${isEditMode ? 'updated' : 'created'} successfully`,
        });

        onOpenChange(false);
        if (onSuccess) onSuccess();
      } catch (apiError) {
        console.error("API call failed:", apiError);
        setError(
          apiError instanceof Error
            ? apiError.message
            : `Failed to ${isEditMode ? 'update' : 'create'} invoice`,
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
          <DialogTitle>{isEditMode ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update invoice details" 
              : selectedEngagementType === 'hourly' 
                ? "Generate an invoice for billable hours" 
                : "Generate a project invoice"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Client and Engagement Selection - Always visible */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="clientName">Client</Label>
                    <Controller
                      name="clientName"
                      control={form.control}
                      render={({ field }) => (
                        <>
                          {isEditMode ? (
                            // For edit mode, show a disabled input with the client name
                            <Input
                              value={field.value || invoice?.clientName || ""}
                              disabled={true}
                              className="bg-gray-50"
                            />
                          ) : (
                            // For create mode, use the dropdown as before
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
                        </>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="engagementId">Engagement</Label>
                    <Controller
                      name="engagementId"
                      control={form.control}
                      render={({ field }) => (
                        <>
                          {isEditMode ? (
                            // For edit mode, show a disabled input with the project name
                            <Input
                              value={
                                // Find the project name from filteredEngagements or all engagements
                                engagements.find(e => e.id.toString() === field.value?.toString())?.projectName ||
                                invoice?.projectName || 
                                "Selected Engagement"
                              }
                              disabled={true}
                              className="bg-gray-50"
                            />
                          ) : (
                            // For create mode, use the dropdown as before
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
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Only show after engagement is selected */}
                {watchEngagementId && (
                  <>
                    {/* Date fields - For all engagement types */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-1 gap-2">
                        <Label htmlFor="periodStart">From</Label>
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
                        <Label htmlFor="periodEnd">To</Label>
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

                    {/* Project-based engagement invoice amount */}
                    {selectedEngagementType === 'project' && (
                      <div className="space-y-2 p-4 rounded-md bg-blue-50">
                            <Label htmlFor="invoiceAmount" className="text-lg font-semibold">Invoice Amount</Label>
                          <Input
                            id="invoiceAmount"
                            type="number"
                            step="0.01"
                          min="0"
                          value={invoiceAmount === 0 ? '0' : invoiceAmount}
                            onChange={handleInvoiceAmountChange}
                            placeholder="Enter invoice amount"
                            className="text-lg font-medium"
                          />
                          {exceedsProjectAmount && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                              Warning: The invoice amount exceeds the total project amount.
                              </AlertDescription>
                            </Alert>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Time Logs Table - Only show for hourly engagements with selected date range */}
              {selectedEngagementType === 'hourly' && watchEngagementId && watchPeriodStart && watchPeriodEnd && (
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
                                {/* Use the original date string directly to avoid timezone issues */}
                                {log.date ? 
                                  new Date(log.date).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    timeZone: 'UTC' // Force UTC to prevent date shifting
                                  }) : 
                                  ''
                                }
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
              )}

              {/* Invoice Summary - Show for project-based engagements */}
              {selectedEngagementType === 'project' && watchEngagementId && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Invoice Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2">
                            {`Project fee for ${filteredEngagements.find(e => e.id.toString() === watchEngagementId.toString())?.projectName || 'Project'}`}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(invoiceAmount || 0)}
                          </td>
                        </tr>
                        <tr className="border-t font-semibold">
                          <td className="px-4 py-2 text-right">
                            Total:
                          </td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(invoiceAmount || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Notes - Only show after engagement is selected */}
              {watchEngagementId && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes to appear on the invoice"
                    rows={2}
                    {...form.register("notes")}
                  />
                </div>
              )}
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
                {isSubmitting 
                  ? (isEditMode ? "Saving..." : "Generating...") 
                  : (isEditMode ? "Save Changes" : "Generate Invoice")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
