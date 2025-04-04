import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import InvoiceFilters from './invoice-filters';
import InvoiceSummary from './invoice-summary';
import InvoiceTable from './invoice-table';
import InvoiceModal from '@/components/modals/invoice-modal';
import EmailInvoiceModal from '@/components/modals/email-invoice-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { downloadInvoice } from '@/lib/pdf-generator';

const Invoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    dateRange: 'current',
  });

  // Build query params
  let queryParams = new URLSearchParams();
  
  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    queryParams.append('status', filters.status);
  }
  
  // Apply client filter
  if (filters.client && filters.client !== 'all') {
    queryParams.append('client', filters.client);
  }
  
  // Apply date range filter
  if (filters.dateRange && filters.dateRange !== 'all') {
    queryParams.append('dateRange', filters.dateRange);
  }

  // Fetch invoices with filters
  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/invoices', queryParams.toString()],
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleViewInvoice = (invoice: any) => {
    // Download the invoice as PDF
    downloadInvoice(invoice);
  };

  const handleEmailInvoice = (invoice: any) => {
    setCurrentInvoice(invoice);
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setCurrentInvoice(null);
  };

  const handleDeleteInvoice = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        const response = await apiRequest('DELETE', `/api/invoices/${id}`);
        
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
  };

  // Apply client filter
  const filteredInvoices = (filters.client && filters.client !== 'all')
    ? invoices.filter((invoice: any) => invoice.clientName === filters.client)
    : invoices;

  // Extract unique client names for filter dropdown
  const clientOptions: string[] = Array.from(
    new Set(invoices.map((invoice: any) => invoice.clientName))
  );

  // Calculate summary stats
  const totalInvoiced = filteredInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const paidInvoices = filteredInvoices
    .filter((invoice: any) => invoice.status === 'paid')
    .reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);
  const outstandingInvoices = filteredInvoices
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
        invoices={filteredInvoices}
        isLoading={isLoading}
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
    </div>
  );
};

export default Invoices;
