import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import InvoiceFilters from './invoice-filters';
import InvoiceSummary from './invoice-summary';
import InvoiceTable from './invoice-table';
import InvoiceModal from '@/components/modals/invoice-modal';
import EmailInvoiceModal from '@/components/modals/email-invoice-modal';
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
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'all'
  });

  const [invoices, setInvoices] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all unique client names once on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAllClients();
  }, []);

  // Fetch filtered invoices whenever filters change
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.client !== 'all') queryParams.append('client', filters.client);
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          queryParams.append('startDate', filters.startDate);
          queryParams.append('endDate', filters.endDate);
        } else {
          queryParams.append('dateRange', filters.dateRange);
        }

        const response = await fetch(`/api/invoices?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const data = await response.json();
        
        // Map snake_case properties to camelCase for consistency
        const mappedData = data.map((invoice: any) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          clientName: invoice.client_name,
          projectName: invoice.project_name,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          amount: invoice.amount,
          status: invoice.status,
          engagementId: invoice.engagement_id,
          lineItems: invoice.line_items || []
        }));
        
        setInvoices(mappedData);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [filters]);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleViewInvoice = async (invoice: any) => {
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
      
      // Check if line items exist
      if (!completeInvoice.lineItems && !completeInvoice.line_items) {
        console.error('Invoice has no line items:', completeInvoice);
        throw new Error('This invoice has no line items and cannot be downloaded');
      }
      
      // Map snake_case properties to camelCase for consistency
      const formattedInvoice = {
        id: completeInvoice.id,
        invoiceNumber: completeInvoice.invoice_number || completeInvoice.invoiceNumber,
        clientName: completeInvoice.client_name || completeInvoice.clientName,
        projectName: completeInvoice.project_name || completeInvoice.projectName,
        issueDate: completeInvoice.issue_date || completeInvoice.issueDate,
        dueDate: completeInvoice.due_date || completeInvoice.dueDate,
        amount: completeInvoice.amount,
        status: completeInvoice.status,
        notes: completeInvoice.notes,
        periodStart: completeInvoice.period_start || completeInvoice.periodStart,
        periodEnd: completeInvoice.period_end || completeInvoice.periodEnd,
        engagementId: completeInvoice.engagement_id || completeInvoice.engagementId,
        lineItems: completeInvoice.lineItems || completeInvoice.line_items || [],
        totalHours: completeInvoice.totalHours || completeInvoice.total_hours || 
          (completeInvoice.lineItems || completeInvoice.line_items || [])
            .reduce((total: number, item: any) => total + Number(item.hours), 0)
      };
      
      console.log('Formatted invoice data for PDF:', formattedInvoice);
      
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

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setCurrentInvoice(null);
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

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };
  
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setInvoiceToDelete(null);
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

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice status',
        variant: 'destructive',
      });
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    
    // Refresh the client list in case a new client was added
    fetchAllClients();
  };
  
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

  // Use the separately fetched client list for the dropdown
  const clientOptions: string[] = allClients;

  // Calculate summary stats
  const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const paidInvoices = invoices
    .filter((invoice: any) => invoice.status === 'paid')
    .reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const outstandingInvoices = invoices
    .filter((invoice: any) => invoice.status === 'pending' || invoice.status === 'overdue')
    .reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
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

      {/* Summary Stats */}
      <InvoiceSummary
        totalInvoiced={totalInvoiced}
        paidInvoices={paidInvoices}
        outstandingInvoices={outstandingInvoices}
        year={new Date().getFullYear()}
      />

      {/* Invoices Table */}
      <InvoiceTable
        invoices={invoices}
        isLoading={loading}
        onView={handleViewInvoice}
        onEmail={handleEmailInvoice}
        onUpdateStatus={handleUpdateInvoiceStatus}
        onDelete={handleDeleteInvoice}
      />

      {/* Create Modal */}
      <InvoiceModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleSuccess}
      />

      {/* Email Modal */}
      <EmailInvoiceModal
        isOpen={isEmailModalOpen}
        onClose={handleCloseEmailModal}
        invoice={currentInvoice}
        onSuccess={handleSuccess}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone and will permanently remove the invoice from your records."
      />
    </div>
  );
};

export default Invoices;
