import { useState, useEffect, useMemo, useReducer } from "react";
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
  parseLocalDate,
  fromStorageDate,
  startOfDay,
  endOfDay,
  toStorageDate,
  addDays,
  formatDateNoTZ,
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

// Update the form schema to match the Controller components
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
  notes: z.string().optional().default(""),
  invoiceAmount: z.number().nonnegative("Amount must be 0 or greater").optional().default(0),
}).superRefine((data, ctx) => {
  // For project invoices, require amount
  if (data.invoiceAmount > 0) {
    // This is a project invoice, dates are optional
    if (data.invoiceAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Project amount must be greater than 0",
        path: ["invoiceAmount"],
      });
    }
  } else {
    // This is an hourly invoice, require dates
    if (!data.periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is required for hourly invoices",
        path: ["periodStart"],
      });
    }
    if (!data.periodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is required for hourly invoices",
        path: ["periodEnd"],
      });
    }
  }
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
  description: string | null;
  billableAmount: number;
  engagement: {
    id: number;
    clientName: string;
    projectName: string;
    hourlyRate: string;
  };
}

interface LineItem {
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface Summary {
  hours: number;
  amount: number;
}

// Update the InvoiceModalState type
type InvoiceModalState = {
  isLoading: boolean;
  isEditMode: boolean;
  selectedClientName: string;
  invoice_type: 'hourly' | 'project' | null;
  timeLogs: TimeLog[];
  invoiceTotal: number;
  totalHours: number;
  invoiceAmount: number;
  exceedsProjectAmount: boolean;
  error: string | null;
  isLoadingTimeLogs: boolean;
};

type InvoiceModalAction =
  | { type: 'INIT_EDIT_MODE'; payload: any }
  | { type: 'SET_CLIENT'; payload: string }
  | { type: 'SET_ENGAGEMENT'; payload: { engagement: Engagement; type: 'hourly' | 'project'; amount?: number } }
  | { type: 'SET_TIME_LOGS'; payload: { logs: TimeLog[]; total: number; hours: number } }
  | { type: 'SET_INVOICE_AMOUNT'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING_TIME_LOGS'; payload: boolean }
  | { type: 'RESET' };

// Update the reducer to handle type safety
function invoiceModalReducer(state: InvoiceModalState, action: InvoiceModalAction): InvoiceModalState {
  switch (action.type) {
    case 'INIT_EDIT_MODE': {
      const invoice = action.payload;
      return {
        ...state,
        isEditMode: true,
        selectedClientName: invoice.clientName || invoice.client_name || "",
        invoice_type: invoice.invoice_type,
        invoiceTotal: invoice.totalAmount || invoice.total_amount || 0,
        totalHours: invoice.totalHours || invoice.total_hours || 0,
        invoiceAmount: invoice.totalAmount || invoice.total_amount || 0,
        isLoading: false,
        isLoadingTimeLogs: false
      };
    }
    
    case 'SET_CLIENT':
      return {
        ...state,
        selectedClientName: action.payload,
        invoice_type: null,
        timeLogs: [],
        invoiceTotal: 0,
        totalHours: 0,
        invoiceAmount: 0,
        exceedsProjectAmount: false,
        isLoadingTimeLogs: false
      };
      
    case 'SET_ENGAGEMENT': {
      const { engagement, type } = action.payload;
      const projectAmount = type === 'project' 
        ? Number(engagement.projectAmount || engagement.project_amount || 0)
        : 0;
      
      return {
        ...state,
        invoice_type: type,
        invoiceAmount: projectAmount,
        invoiceTotal: projectAmount,
        timeLogs: type === 'project' ? [] : state.timeLogs,
        isLoadingTimeLogs: false
      };
    }
    
    case 'SET_TIME_LOGS':
      return {
        ...state,
        timeLogs: action.payload.logs,
        invoiceTotal: action.payload.total,
        totalHours: action.payload.hours,
        isLoading: false,
        isLoadingTimeLogs: false
      };
      
    case 'SET_INVOICE_AMOUNT':
      return {
        ...state,
        invoiceAmount: action.payload,
        invoiceTotal: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case 'SET_LOADING_TIME_LOGS':
      return {
        ...state,
        isLoadingTimeLogs: action.payload
      };
      
    case 'RESET':
      return {
        isLoading: false,
        isEditMode: false,
        selectedClientName: "",
        invoice_type: "hourly",
        timeLogs: [],
        invoiceTotal: 0,
        totalHours: 0,
        invoiceAmount: 0,
        exceedsProjectAmount: false,
        error: null,
        isLoadingTimeLogs: false
      };
      
    default:
      return state;
  }
}

// Update the initial state
const initialState: InvoiceModalState = {
  isLoading: false,
  isEditMode: false,
  selectedClientName: "",
  invoice_type: "hourly",
  timeLogs: [],
  invoiceTotal: 0,
  totalHours: 0,
  invoiceAmount: 0,
  exceedsProjectAmount: false,
  error: null,
  isLoadingTimeLogs: false
};

// Add this interface after the existing interfaces
interface InvoiceSubmission {
  engagementId: number;
  userId: number;
  clientName: string;
  projectName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  totalHours: number;
  lineItems: LineItem[];
  status: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  invoice_type: 'hourly' | 'project';
  billingContactName?: string;
  billingContactEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
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
  
  // Replace multiple useState calls with useReducer
  const [state, dispatch] = useReducer(invoiceModalReducer, initialState);

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
        engagement.clientName === state.selectedClientName &&
        engagement.status === "active"
    );
    
    return filtered;
  }, [engagements, state.selectedClientName]);

  // Get the next invoice number (in a real app this would come from the server)
  const nextInvoiceNumber = generateInvoiceNumber("INV", 25);

  // Add debug logging to form handlers
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
    mode: "onSubmit",
    reValidateMode: "onChange"
  });

  // Destructure handleSubmit from form
  const { handleSubmit, watch, control, setValue, formState: { errors, isValid } } = form;

  // Add debug wrapper around handleSubmit
  const onFormSubmit = handleSubmit((data) => {
    console.log("Form handleSubmit called", { data });
    onSubmit(data);
  }, (errors) => {
    console.error("Form validation failed:", errors);
    return false;
  });

  // Watch form values
  const watchClientName = watch("clientName");
  const watchEngagementId = watch("engagementId");
  const watchPeriodStart = watch("periodStart");
  const watchPeriodEnd = watch("periodEnd");
  const watchInvoiceAmount = watch("invoiceAmount");

  // Update selectedClientName when client changes in form
  useEffect(() => {
    if (watchClientName) {
      dispatch({ type: 'SET_CLIENT', payload: watchClientName });
    }
  }, [watchClientName]);

  // Reset engagement if client changes
  useEffect(() => {
    // Reset engagement when client changes
    if (state.selectedClientName && watchEngagementId) {
      // Check if the selected engagement is valid for this client
      const validEngagement = filteredEngagements.some(
        (e: any) => e.id.toString() === watchEngagementId.toString(),
      );

      if (!validEngagement) {
        // Reset engagement if it doesn't belong to the selected client
        form.setValue("engagementId", "");
      }
    }
  }, [state.selectedClientName, watchEngagementId, filteredEngagements, form]);

  // Update the useEffect for engagement type changes
  useEffect(() => {
    if (watchEngagementId) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement) {
        const engagementType = selectedEngagement.engagementType || selectedEngagement.engagement_type;
        
        if (!engagementType || !['hourly', 'project'].includes(engagementType)) {
          console.error("Invalid engagement type:", engagementType);
          return;
        }
        
        dispatch({ 
          type: 'SET_ENGAGEMENT', 
          payload: { 
            engagement: selectedEngagement,
            type: engagementType
          }
        });
      }
    }
  }, [watchEngagementId, filteredEngagements]);

  // Check if invoice amount exceeds project amount
  useEffect(() => {
    if (state.invoice_type === 'project' && watchEngagementId) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement && selectedEngagement.projectAmount) {
        const projectAmount = typeof selectedEngagement.projectAmount === 'string' 
          ? parseFloat(selectedEngagement.projectAmount) 
          : Number(selectedEngagement.projectAmount);
        
        // Ensure watchInvoiceAmount is treated as a number
        const currentInvoiceAmount = typeof watchInvoiceAmount === 'number' ? watchInvoiceAmount : 0;
        
        dispatch({ 
          type: 'SET_INVOICE_AMOUNT', 
          payload: currentInvoiceAmount > projectAmount ? projectAmount : currentInvoiceAmount
        });
      }
    }
  }, [watchInvoiceAmount, watchEngagementId, filteredEngagements, state.invoice_type]);

  // Fetch client billing details when engagement is selected
  useEffect(() => {
    if (watchEngagementId && state.selectedClientName && !state.isEditMode) {
      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === watchEngagementId.toString()
      );
      
      if (selectedEngagement) {
        const fetchClientDetails = async () => {
          try {
            const clientId = Number(selectedEngagement.clientId || selectedEngagement.client_id);
            if (isNaN(clientId) || clientId <= 0) {
              console.error("Valid client ID not found in engagement:", selectedEngagement);
              return;
            }
            
            const response = await apiRequest('GET', `/api/clients/${clientId}`);
            const result = await response.json();
            
            console.log("Retrieved client billing details:", result);
            
            // Get the engagement type with type assertion
            const engagementType = (selectedEngagement.engagementType || selectedEngagement.engagement_type) as 'hourly' | 'project' | undefined;
            if (!engagementType || (engagementType !== 'hourly' && engagementType !== 'project')) {
              console.error("Invalid engagement type:", engagementType);
              return;
            }
            
            dispatch({ 
              type: 'SET_ENGAGEMENT', 
              payload: { 
                engagement: result,
                type: engagementType,
                amount: engagementType === 'project' ? Number(result.projectAmount || result.project_amount || 0) : undefined
              }
            });
          } catch (error) {
            console.error("Error fetching client details:", error);
          }
        };
        
        fetchClientDetails();
      }
    }
  }, [watchEngagementId, state.selectedClientName, filteredEngagements, state.isEditMode]);

  // Simplify the fetchTimeLogs function to be more direct
  const fetchTimeLogs = async (engagementId: string | number, startDate: string, endDate: string) => {
    if (!engagementId || !startDate || !endDate) {
      console.log("Missing required parameters for time log fetch");
      return;
    }

    try {
      // Convert dates to start/end of day and format as ISO strings
      const parsedStart = parseLocalDate(startDate);
      const parsedEnd = parseLocalDate(endDate);
      
      if (!parsedStart || !parsedEnd) {
        console.error("Invalid date format");
        return;
      }

      const start = startOfDay(parsedStart);
      const end = endOfDay(parsedEnd);
      
      const queryParams = new URLSearchParams({
        engagementId: String(engagementId),
        startDate: toStorageDate(start),
        endDate: toStorageDate(end)
      });

      console.log("Fetching time logs with params:", {
        engagementId: String(engagementId),
        startDate: toStorageDate(start),
        endDate: toStorageDate(end)
      });

      const response = await apiRequest(
        'GET',
        `/api/time-logs?${queryParams.toString()}`
      );

      const timeLogsData = await response.json() as TimeLog[];
      
      // Calculate totals
      const total = timeLogsData.reduce((sum, log) => sum + log.billableAmount, 0);
      const hours = timeLogsData.reduce((sum, log) => sum + log.hours, 0);

      dispatch({ 
        type: 'SET_TIME_LOGS', 
        payload: { 
          logs: timeLogsData,
          total,
          hours
        }
      });

      return timeLogsData;
    } catch (error) {
      console.error("Error fetching time logs:", error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: "Failed to load time logs for this period." 
      });
      return [];
    }
  };

  // Simplify the period change effect
  useEffect(() => {
    // Skip if we're missing required data or if it's a project-based engagement
    if (!watchEngagementId || !watchPeriodStart || !watchPeriodEnd || state.invoice_type === 'project') {
      return;
    }

    // Skip fetching time logs for project-based engagements
    const selectedEngagement = filteredEngagements.find(
      (e) => e.id.toString() === watchEngagementId.toString()
    );

    if (!selectedEngagement) return;

    const engagementType = selectedEngagement.engagementType || selectedEngagement.engagement_type;
    if (engagementType === 'project') {
      dispatch({ 
        type: 'SET_TIME_LOGS', 
        payload: { 
          logs: [],
          total: 0,
          hours: 0
        }
      });
      return;
    }

    // Fetch time logs using the raw form values
    fetchTimeLogs(watchEngagementId, watchPeriodStart, watchPeriodEnd);
  }, [watchEngagementId, watchPeriodStart, watchPeriodEnd]);

  // Format hours for display
  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  // Define close handler
  const handleClose = () => {
    console.log("handleClose called");
    
    // Only reset the form and close if we're not in the middle of a submission
    if (!isSubmitting) {
      // Reset form first to avoid state validation errors
      form.reset({
        clientName: "",
        engagementId: "",
        periodStart: "",
        periodEnd: "",
        notes: "",
        invoiceAmount: 0
      });
      
      // Clear out all state completely
      dispatch({ type: 'RESET' });
      
      // Finally close the modal with a callback for success
      if (onSuccess) {
        onSuccess();
      }
      
      // Close the modal last
      onOpenChange(false);
    } else {
      console.log("handleClose ignored because form is submitting");
    }
  };

  // This is a dependency-free effect that will only run once when the component mounts
  useEffect(() => {
    // Initialization logic for the modal
    console.log("Invoice modal initialized");
    
    // Cleanup function
    return () => {
      console.log("Invoice modal cleanup");
    };
  }, []); // Empty dependency array means this only runs once
  
  // Reset form when modal opens/closes
  useEffect(() => {
    function extractDatePart(dateStr: string | undefined | null): string {
      if (!dateStr) return "";
      // If already YYYY-MM-DD, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // If ISO string, extract date part
      if (typeof dateStr === "string" && dateStr.includes("T")) return dateStr.split("T")[0];
      // Fallback: try to parse and format
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return toStorageDate(d);
      return "";
    }

    if (open && invoice && !state.isEditMode) {
      console.log("Setting up edit mode with invoice:", invoice);
      
      dispatch({ type: 'INIT_EDIT_MODE', payload: invoice });
      
      // Handle both camelCase and snake_case property names
      const periodStartValue = invoice.periodStart || invoice.period_start;
      const periodEndValue = invoice.periodEnd || invoice.period_end;
      const clientNameValue = invoice.clientName || invoice.client_name;
      const engagementIdValue = invoice.engagementId || invoice.engagement_id;
      const notesValue = invoice.notes;
      const totalAmountValue = invoice.totalAmount || invoice.total_amount || 0;
      const totalHoursValue = invoice.totalHours || invoice.total_hours || 0;
      
      console.log("Edit mode - Client name:", clientNameValue);
      console.log("Edit mode - Engagement ID:", engagementIdValue);
      console.log("Total amount from invoice:", totalAmountValue);
      console.log("Total hours from invoice:", totalHoursValue);

      // Use robust date extraction
      const formattedStartDate = extractDatePart(periodStartValue);
      const formattedEndDate = extractDatePart(periodEndValue);
      
      console.log("Formatted date values for form:", { formattedStartDate, formattedEndDate });
      
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
        
        dispatch({ 
          type: 'SET_INVOICE_AMOUNT', 
          payload: totalAmountValue
        });
        
        // For hourly invoices, fetch time logs to display in the modal
        // Fix the fetch guard condition
        if (state.invoice_type === 'hourly' && engagementIdValue && formattedStartDate && formattedEndDate) {
          console.log("Fetching time logs for invoice in edit mode");
          fetchTimeLogs(engagementIdValue, formattedStartDate, formattedEndDate);
        }
      }, 100);
    } else if (!open) {
      // Reset state when modal closes
      if (state.isEditMode) {
        dispatch({ type: 'RESET' });
      }
    }
  }, [open, invoice]);

  // Update the time logs to line items conversion with proper type conversion
  const convertTimeLogsToLineItems = (logs: TimeLog[]): LineItem[] => {
    return logs.map((log) => ({
      description: log.description || '',
      hours: log.hours,
      rate: parseFloat(log.engagement.hourlyRate),
      amount: log.billableAmount
    }));
  };

  // Use the conversion function
  const lineItems = convertTimeLogsToLineItems(state.timeLogs);

  // Update the summary calculation
  const summary = useMemo(() => {
    return lineItems.reduce(
      (sum: Summary, item: LineItem) => ({
        hours: sum.hours + item.hours,
        amount: sum.amount + item.amount,
      }),
      { hours: 0, amount: 0 }
    );
  }, [lineItems]);

  // Handle invoice amount change
  const handleInvoiceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input
    if (value === '') {
      dispatch({ 
        type: 'SET_INVOICE_AMOUNT', 
        payload: 0
      });
      setValue('invoiceAmount', 0);
      return;
    }
    
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      dispatch({ 
        type: 'SET_INVOICE_AMOUNT', 
        payload: amount
      });
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

  // Add debug logging to onSubmit
  const onSubmit = async (data: FormValues) => {
    console.log("onSubmit called", { data });
    try {
      if (isSubmitting) {
        console.log("Already submitting, ignoring");
        return;
      }
      setIsSubmitting(true);
      console.log("Set isSubmitting to true");

      const selectedEngagement = filteredEngagements.find(
        (e) => e.id.toString() === data.engagementId.toString()
      );

      if (!selectedEngagement) {
        console.error("No engagement selected");
        throw new Error("No engagement selected");
      }

      // Ensure we have valid dates
      const startDate = data.periodStart ? new Date(data.periodStart) : new Date();
      const endDate = data.periodEnd ? new Date(data.periodEnd) : new Date();
      const netTerms = selectedEngagement.netTerms || 30;

      // Create submission data
      const submission = {
        engagementId: selectedEngagement.id,
        userId: selectedEngagement.userId,
        clientName: selectedEngagement.clientName,
        projectName: selectedEngagement.projectName,
        invoiceNumber: state.isEditMode ? invoice.invoiceNumber : nextInvoiceNumber,
        issueDate: state.isEditMode ? invoice.issueDate : new Date().toISOString().split('T')[0],
        dueDate: state.isEditMode ? invoice.dueDate : addDays(new Date(), netTerms).toISOString().split('T')[0],
        totalAmount: state.invoice_type === 'project' ? data.invoiceAmount : state.invoiceTotal,
        totalHours: state.invoice_type === 'project' ? 0 : state.totalHours,
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: endDate.toISOString().split('T')[0],
        notes: data.notes || "",
        status: state.isEditMode ? invoice.status : "submitted",
        invoice_type: state.invoice_type || 'hourly', // Ensure invoice_type is never null
        lineItems: state.invoice_type === 'project' 
          ? [{
              description: `Project fee for ${selectedEngagement.projectName}`,
              amount: data.invoiceAmount || 0,
              hours: 0,
              rate: data.invoiceAmount || 0
            }]
          : state.timeLogs.map(log => ({
              description: log.description || '',
              hours: log.hours,
              rate: parseFloat(selectedEngagement.hourlyRate),
              amount: log.billableAmount
            }))
      };

      console.log("Submitting invoice data", JSON.stringify(submission, null, 2));

      // Make API call using apiRequest utility
      const url = state.isEditMode ? `/api/invoices/${invoice.id}` : "/api/invoices";
      const method = state.isEditMode ? "PUT" : "POST";
      
      console.log("Making API request", { url, method });
      
      try {
        const response = await apiRequest(method, url, submission);
        console.log("API response received", { status: response.status, statusText: response.statusText });
        
        // Debug: Log actual response body
        try {
          const responseText = await response.text();
          console.log("API response body:", responseText);
          
          // After logging, we need to handle the response now
          if (!response.ok) {
            throw new Error(responseText || "Failed to save invoice");
          }
        } catch (textError) {
          console.error("Error reading response text:", textError);
          if (!response.ok) {
            throw new Error("Failed to save invoice: " + response.statusText);
          }
        }

        // Success handling
        console.log("API request successful");
        await queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        
        toast({
          title: "Success",
          description: `Invoice ${state.isEditMode ? 'updated' : 'created'} successfully`
        });

        // Close modal and cleanup
        console.log("Closing modal");
        handleClose();
      } catch (error) {
        console.error("Error making API request:", error);
        throw error;
      }
      
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save invoice"
      });
    } finally {
      console.log("Setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && open && !isSubmitting) {
        handleClose();
      } else if (isOpen !== open) {
        onOpenChange(isOpen);
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{state.isEditMode ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          <DialogDescription>
            {state.invoice_type === 'hourly' 
              ? "Generate an invoice for billable hours" 
              : "Generate a project invoice"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submit event triggered");
              console.log("Form valid state:", form.formState.isValid);
              console.log("Form values:", form.getValues());
              console.log("Form errors:", form.formState.errors);
              onFormSubmit();
            }} 
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Controller
                      name="clientName"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            console.log("Client name changed:", value);
                            field.onChange(value);
                            dispatch({ type: 'SET_CLIENT', payload: value });
                          }}
                        >
                          <SelectTrigger className={errors.clientName ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueClients.map((client) => (
                              <SelectItem key={client} value={client}>
                                {client}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.clientName && (
                      <p className="text-sm text-red-500">{errors.clientName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engagementId">Project/Engagement</Label>
                    <Controller
                      name="engagementId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => {
                            console.log("Engagement changed:", value);
                            field.onChange(value);
                          }}
                          disabled={!watchClientName}
                        >
                          <SelectTrigger className={errors.engagementId ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select an engagement" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredEngagements.map((engagement) => (
                              <SelectItem
                                key={engagement.id}
                                value={engagement.id.toString()}
                              >
                                {engagement.projectName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.engagementId && (
                      <p className="text-sm text-red-500">{errors.engagementId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodStart">Billing Start</Label>
                    <Input
                      type="date"
                      {...form.register("periodStart")}
                      className={errors.periodStart ? "border-red-500" : ""}
                    />
                    {errors.periodStart && (
                      <p className="text-sm text-red-500">{errors.periodStart.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodEnd">Billing End</Label>
                    <Input
                      type="date"
                      {...form.register("periodEnd")}
                      className={errors.periodEnd ? "border-red-500" : ""}
                    />
                    {errors.periodEnd && (
                      <p className="text-sm text-red-500">{errors.periodEnd.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {state.invoice_type === 'project' && (
                <div className="space-y-2">
                  <Label htmlFor="invoiceAmount">Project Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("invoiceAmount", {
                      valueAsNumber: true,
                      min: { value: 0.01, message: "Amount must be greater than 0" }
                    })}
                    className={errors.invoiceAmount ? "border-red-500" : ""}
                  />
                  {errors.invoiceAmount && (
                    <p className="text-sm text-red-500">{errors.invoiceAmount.message}</p>
                  )}
                </div>
              )}

              {watchEngagementId && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Add any additional notes to appear on the invoice"
                    rows={2}
                    className={errors.notes ? "border-red-500" : ""}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500">{errors.notes.message}</p>
                  )}
                </div>
              )}

              {state.invoice_type === 'hourly' && watchEngagementId && watchPeriodStart && watchPeriodEnd && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Time Logs</h3>
                  {state.timeLogs.length === 0 ? (
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
                          {state.timeLogs.map((log) => (
                            <tr key={log.id} className="border-t">
                              <td className="px-4 py-2">
                                {formatDateNoTZ(log.date)}
                              </td>
                              <td className="px-4 py-2">{log.description}</td>
                              <td className="px-4 py-2 text-right">
                                {formatHours(log.hours)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatCurrency(Number(log.engagement.hourlyRate))}
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
                              {formatHours(state.totalHours)}
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(state.invoiceTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {state.invoice_type === 'project' && watchEngagementId && (
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
                            {formatCurrency(state.invoiceAmount || 0)}
                          </td>
                        </tr>
                        <tr className="border-t font-semibold">
                          <td className="px-4 py-2 text-right">
                            Total:
                          </td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(state.invoiceAmount || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
              <Button 
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  console.log("Direct submit button clicked");
                  // Get current form values manually
                  const formValues = form.getValues();
                  console.log("Form values for direct submission:", formValues);
                  
                  // Call onSubmit directly with current values
                  onSubmit(formValues);
                }}
              >
                {isSubmitting 
                  ? (state.isEditMode ? "Saving..." : "Creating...") 
                  : (state.isEditMode ? "Save Changes" : "Create Invoice")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
