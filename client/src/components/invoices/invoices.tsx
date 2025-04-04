import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import InvoiceFilters from './invoice-filters';
import InvoiceSummary from './invoice-summary';
import InvoiceTable from './invoice-table';
import InvoiceModal from '@/components/modals/invoice-modal';
import EmailInvoiceModal from '@/components/modals/email-invoice-modal';
import DeleteConfirmationModal from '@/components/modals/delete-confirmation-modal';
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
  const [invoiceToDelete, setInvoiceToDelete] = useState<{id: number, invoiceNumber?: string}|null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    client: 'all',
    dateRange: 'current'
  });

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        setInvoices(data);
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

  const handleOpenDeleteModal = (invoice: any) => {
    setInvoiceToDelete({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    });
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/invoices/${invoiceToDelete.id}`);
      
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
      
      // Close the modal
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
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

  // Extract unique client names for filter dropdown
  const clientOptions: string[] = Array.from(
    new Set(invoices.map((invoice: any) => invoice.clientName))
  );

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
        onDelete={handleOpenDeleteModal}
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
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        itemName={invoiceToDelete?.invoiceNumber || "this invoice"}
        itemType="invoice"
      />
    </div>
  );
};

export default Invoices;
