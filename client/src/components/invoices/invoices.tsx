import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import InvoiceFilters from './invoice-filters';
import InvoiceSummary from './invoice-summary';
import InvoiceTable from './invoice-table';
import InvoiceModal from '@/components/modals/invoice-modal';
import EmailInvoiceModal from '@/components/modals/email-invoice-modal';
import InvoicePreviewModal from '@/components/modals/invoice-preview-modal';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { downloadInvoice } from '@/lib/pdf-generator';

interface Filters {
  status: string;
  client: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
}

const Invoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'all'
  });

  const [allClients, setAllClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Build query params for invoice fetch
  const queryParams = new URLSearchParams();
  if (filters.status !== 'all') queryParams.append('status', filters.status);
  if (filters.client !== 'all') queryParams.append('client', filters.client);
  if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
  } else {
    queryParams.append('dateRange', filters.dateRange);
  }

  // Fetch invoices using React Query instead of useEffect
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<any[]>({
    queryKey: ['/api/invoices', queryParams.toString()],
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0]}?${queryKey[1]}`;
      console.log('Fetching invoices with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      
      console.log('Raw invoice data from API:', data);
      
      // Map snake_case properties to camelCase for consistency
      return data.map((invoice: any) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client_name,
        projectName: invoice.project_name,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        amount: Number(invoice.total_amount),
        totalAmount: Number(invoice.total_amount),
        totalHours: Number(invoice.total_hours),
        status: invoice.status,
        engagementId: invoice.engagement_id,
        lineItems: invoice.line_items || [],
        userId: invoice.user_id
      }));
    },
    // Ensure the query is always fresh
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0, // Don't keep old data in cache - always fetch fresh
  });

  // Fetch all unique client names once on component mount
  useEffect(() => {
    fetchAllClients();
  }, []);
  
  // Add event listener for opening email modal from preview modal
  useEffect(() => {
    const handleOpenEmailModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const invoiceId = customEvent.detail?.invoiceId;
      
      if (invoiceId) {
        console.log(`Email modal requested for invoice ID: ${invoiceId}`);
        // Find the invoice by ID
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          setCurrentInvoice(invoice);
          setIsEmailModalOpen(true);
        }
      }
    };
    
    window.addEventListener('openEmailModal', handleOpenEmailModal);
    
    return () => {
      window.removeEventListener('openEmailModal', handleOpenEmailModal);
    };
  }, [invoices]);

  // Function to fetch all clients
  const fetchAllClients = async () => {
    try {
      // Request all invoices with no filters to get all client names
      const response = await fetch(`/api/invoices?dateRange=all`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      
      // Extract unique client names
      const clientNames: string[] = [];
      
      // Extract client names with proper type checking
      data.forEach((invoice: any) => {
        if (typeof invoice.client_name === 'string' && invoice.client_name) {
          clientNames.push(invoice.client_name);
        }
      });
      
      // Remove duplicates
      const uniqueClients = Array.from(new Set(clientNames));
      
      setAllClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching client names:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = (open: boolean) => {
    setIsCreateModalOpen(open);
  };

  const handleEditInvoice = async (invoice: any) => {
    console.log("Edit requested for invoice:", invoice);
    
    try {
      // Fetch the complete invoice data with line items to ensure we have all fields
      const response = await fetch(`/api/invoices/${invoice.id}`);
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch invoice details: ${response.status} ${response.statusText}`);
      }
      
      const completeInvoice = await response.json();
      console.log('Received complete invoice data for editing:', completeInvoice);
      
      // Map any snake_case properties to camelCase for consistency
      const formattedInvoice = {
        id: completeInvoice.id,
        invoiceNumber: completeInvoice.invoice_number || completeInvoice.invoiceNumber,
        clientName: completeInvoice.client_name || completeInvoice.clientName,
        projectName: completeInvoice.project_name || completeInvoice.projectName,
        issueDate: completeInvoice.issue_date || completeInvoice.issueDate,
        dueDate: completeInvoice.due_date || completeInvoice.dueDate,
        totalAmount: completeInvoice.total_amount || completeInvoice.totalAmount,
        status: completeInvoice.status,
        notes: completeInvoice.notes,
        periodStart: completeInvoice.period_start || completeInvoice.periodStart,
        periodEnd: completeInvoice.period_end || completeInvoice.periodEnd,
        engagementId: completeInvoice.engagement_id || completeInvoice.engagementId,
        lineItems: completeInvoice.lineItems || completeInvoice.line_items || [],
        totalHours: completeInvoice.total_hours || completeInvoice.totalHours,
        userId: completeInvoice.user_id || completeInvoice.userId,
        invoice_type: completeInvoice.invoice_type || completeInvoice.invoiceType,
      };
      
      console.log("Setting formatted invoice for edit mode:", formattedInvoice);
      setCurrentInvoice(formattedInvoice);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error preparing invoice for editing:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice for editing. Please try again.',
        variant: 'destructive',
      });
      // Fallback to basic editing if fetch fails
      setCurrentInvoice(invoice);
      setIsEditModalOpen(true);
    }
  };

  const handleCloseEditModal = (open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setCurrentInvoice(null);
    }
  };

  const handleViewInvoice = async (invoice: any) => {
    try {
      setLoading(true);
      console.log(`Attempting to preview invoice ID ${invoice.id} (${invoice.invoiceNumber})`);
      
      // Fetch the complete invoice data with line items
      const response = await fetch(`/api/invoices/${invoice.id}`);
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch invoice details: ${response.status} ${response.statusText}`);
      }
      
      const completeInvoice = await response.json();
      console.log('Received invoice data:', completeInvoice);
      
      if (!completeInvoice || !completeInvoice.id) {
        console.error('Invalid invoice data received:', completeInvoice);
        throw new Error('Invalid invoice data received from server');
      }
      
      // Ensure lineItems exists (even if empty)
      if (!completeInvoice.lineItems && !completeInvoice.line_items) {
        console.warn('Invoice has no line items. Using empty line items array.');
        completeInvoice.lineItems = [];
      }
      
      setCurrentInvoice(completeInvoice);
      setIsPreviewModalOpen(true);
    } catch (error: any) {
      console.error('Error previewing invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to preview invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoice: any) => {
    try {
      setLoading(true);
      console.log(`Attempting to download invoice ID ${invoice.id} (${invoice.invoiceNumber})`);
      
      // Fetch the complete invoice data with line items
      const response = await fetch(`/api/invoices/${invoice.id}`);
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch invoice details: ${response.status} ${response.statusText}`);
      }
      
      const completeInvoice = await response.json();
      console.log('Received invoice data:', completeInvoice);
      
      if (!completeInvoice || !completeInvoice.id) {
        console.error('Invalid invoice data received:', completeInvoice);
        throw new Error('Invalid invoice data received from server');
      }
      
      // Ensure lineItems exists (even if empty)
      if (!completeInvoice.lineItems && !completeInvoice.line_items) {
        console.warn('Invoice has no line items. Using empty line items array.');
        completeInvoice.lineItems = [];
      }
      
      // Map snake_case properties to camelCase for consistency
      const formattedInvoice = {
        id: completeInvoice.id,
        invoiceNumber: completeInvoice.invoice_number || completeInvoice.invoiceNumber,
        clientName: completeInvoice.client_name || completeInvoice.clientName,
        projectName: completeInvoice.project_name || completeInvoice.projectName,
        issueDate: completeInvoice.issue_date || completeInvoice.issueDate,
        dueDate: completeInvoice.due_date || completeInvoice.dueDate,
        amount: Number(completeInvoice.total_amount || completeInvoice.totalAmount || 0),
        totalAmount: completeInvoice.total_amount || completeInvoice.totalAmount || "0", // Keep as original type
        status: completeInvoice.status,
        notes: completeInvoice.notes,
        periodStart: completeInvoice.period_start || completeInvoice.periodStart,
        periodEnd: completeInvoice.period_end || completeInvoice.periodEnd,
        engagementId: completeInvoice.engagement_id || completeInvoice.engagementId,
        lineItems: completeInvoice.lineItems || completeInvoice.line_items || [],
        totalHours: Number(completeInvoice.total_hours || completeInvoice.totalHours || 0),
        userId: completeInvoice.user_id || completeInvoice.userId,
        invoice_type: completeInvoice.invoice_type || completeInvoice.invoiceType,
        // Add billing details
        billingContactName: completeInvoice.billing_contact_name || completeInvoice.billingContactName,
        billingContactEmail: completeInvoice.billing_contact_email || completeInvoice.billingContactEmail,
        billingAddress: completeInvoice.billing_address || completeInvoice.billingAddress,
        billingCity: completeInvoice.billing_city || completeInvoice.billingCity,
        billingState: completeInvoice.billing_state || completeInvoice.billingState,
        billingZip: completeInvoice.billing_zip || completeInvoice.billingZip,
        billingCountry: completeInvoice.billing_country || completeInvoice.billingCountry
      };
      
      console.log('Formatted invoice data for download:', formattedInvoice);
      
      // Download the invoice as PDF
      downloadInvoice(formattedInvoice);
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailInvoice = (invoice: any) => {
    setCurrentInvoice(invoice);
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = (open: boolean) => {
    setIsEmailModalOpen(open);
    if (!open) {
      setCurrentInvoice(null);
    }
  };

  const handleDeleteInvoice = (id: number) => {
    setInvoiceToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/invoices/${invoiceToDelete}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }

      toast({
        title: 'Invoice deleted',
        description: 'The invoice has been deleted successfully.',
      });

      // Refresh data - force a fresh refetch to update the UI immediately
      console.log('Force refreshing invoice data after deletion');
      await queryClient.refetchQueries({ 
        queryKey: ['/api/invoices', queryParams.toString()],
        exact: true, 
        type: 'active'
      });
      
      // Also invalidate other invoice queries and dashboard stats
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === 'string' && 
            (queryKey.startsWith('/api/invoices') || queryKey.startsWith('/api/dashboard'));
        }
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };
  
  const handleCloseDeleteModal = (open: boolean) => {
    setIsDeleteModalOpen(open);
    if (!open) {
      setInvoiceToDelete(null);
    }
  };

  const handleUpdateInvoiceStatus = async (id: number, status: string) => {
    try {
      const response = await apiRequest('PUT', `/api/invoices/${id}/status`, { status });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice status');
      }

      toast({
        title: 'Invoice status updated',
        description: `Invoice status changed to ${status}.`,
      });

      // Refresh data - force a fresh refetch to update the UI immediately
      console.log('Force refreshing invoice data after status update');
      await queryClient.refetchQueries({ 
        queryKey: ['/api/invoices', queryParams.toString()],
        exact: true, 
        type: 'active'
      });
      
      // Also invalidate other invoice queries and dashboard stats
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === 'string' && 
            (queryKey.startsWith('/api/invoices') || queryKey.startsWith('/api/dashboard'));
        }
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice status',
        variant: 'destructive',
      });
    }
  };

  const handleSuccess = async () => {
    // Force a fresh refetch to update the UI immediately
    console.log('Force refreshing invoice data after operation');
    await queryClient.refetchQueries({ 
      queryKey: ['/api/invoices', queryParams.toString()],
      exact: true, 
      type: 'active'
    });
    
    // Also invalidate other invoice queries and dashboard stats
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        return typeof queryKey === 'string' && 
          (queryKey.startsWith('/api/invoices') || queryKey.startsWith('/api/dashboard'));
      }
    });
    
    // Refresh the client list in case a new client was added
    fetchAllClients();
  };
  
  // Use the separately fetched client list for the dropdown
  const clientOptions: string[] = allClients;

  // Calculate summary stats based on react-query data (using invoices from the query)
  const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const paidInvoices = invoices
    .filter((invoice: any) => invoice.status === 'paid')
    .reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const outstandingInvoices = invoices
    .filter((invoice: any) => invoice.status === 'pending' || invoice.status === 'overdue')
    .reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);

  const handleClosePreviewModal = (open: boolean) => {
    setIsPreviewModalOpen(open);
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <Button 
            onClick={handleOpenCreateModal} 
            className="mt-3 sm:mt-0"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
        </div>
      </header>

      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        setFilters={setFilters}
        clientOptions={clientOptions}
      />

      {/* Summary Stats - ensured to use latest state from query */}
      <InvoiceSummary
        totalInvoiced={totalInvoiced}
        paidInvoices={paidInvoices}
        outstandingInvoices={outstandingInvoices}
        dateRange={filters.dateRange}
        startDate={filters.startDate}
        endDate={filters.endDate}
      />

      {/* Invoices Table */}
      <InvoiceTable
        invoices={invoices}
        isLoading={isLoadingInvoices || loading}
        onView={handleViewInvoice}
        onEmail={handleEmailInvoice}
        onUpdateStatus={handleUpdateInvoiceStatus}
        onDelete={handleDeleteInvoice}
        onDownload={handleDownloadInvoice}
        onEdit={handleEditInvoice}
      />

      {/* Create Modal */}
      <InvoiceModal
        open={isCreateModalOpen}
        onOpenChange={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <InvoiceModal
        open={isEditModalOpen}
        onOpenChange={handleCloseEditModal}
        onSuccess={handleSuccess}
        invoice={currentInvoice}
      />

      {/* Email Modal */}
      <EmailInvoiceModal
        open={isEmailModalOpen}
        onOpenChange={handleCloseEmailModal}
        invoice={currentInvoice}
        onSuccess={handleSuccess}
      />
      
      {/* Preview Modal */}
      <InvoicePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={handleClosePreviewModal}
        invoice={currentInvoice}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone and will permanently remove the invoice from your records."
      />
    </div>
  );
};

export default Invoices;
