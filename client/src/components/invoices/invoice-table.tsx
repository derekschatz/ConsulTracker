import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Download, 
  Mail, 
  MoreHorizontal,
  CheckCircle, 
  Clock,
  AlertCircle,
  Edit
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency, getStatusClasses } from '@/lib/format-utils';
import { useMobile } from '@/hooks/use-mobile';

interface InvoiceTableProps {
  invoices: any[];
  isLoading: boolean;
  onView: (invoice: any) => void;
  onEmail: (invoice: any) => void;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onDownload?: (invoice: any) => void;
  onEdit?: (invoice: any) => void;
}

const InvoiceTable = ({ 
  invoices, 
  isLoading, 
  onView, 
  onEmail, 
  onUpdateStatus,
  onDelete,
  onDownload,
  onEdit 
}: InvoiceTableProps) => {
  const isMobile = useMobile();
  
  const columns: Column<any>[] = [
    {
      accessor: 'invoiceNumber',
      header: 'Invoice #',
      cell: (invoice) => (
        <span className="font-medium text-white">{invoice.invoiceNumber}</span>
      ),
    },
    {
      accessor: 'clientName',
      header: 'Client',
      cell: (invoice) => (
        <div>
          <div className="font-medium text-white">{invoice.clientName}</div>
          <div className="text-xs text-slate-500 mt-1 sm:hidden">{formatDate(invoice.issueDate)}</div>
        </div>
      ),
    },
    {
      accessor: 'issueDate',
      header: 'Issue Date',
      cell: (invoice) => formatDate(invoice.issueDate),
      hidden: () => isMobile,
    },
    {
      accessor: 'dueDate',
      header: 'Due Date',
      cell: (invoice) => formatDate(invoice.dueDate),
      hidden: () => isMobile,
    },
    {
      accessor: 'amount',
      header: 'Amount',
      cell: (invoice) => (
        <span className="font-medium text-white">{formatCurrency(invoice.amount)}</span>
      ),
    },
    {
      accessor: 'status',
      header: 'Status',
      cell: (invoice) => {
        const { bg, text } = getStatusClasses(invoice.status);
        const displayStatus = invoice.status.toLowerCase() === 'pending' 
          ? 'Not Submitted' 
          : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
        
        return (
          <span className={`inline-flex rounded-full ${bg} ${text} px-2 py-1 text-xs font-medium`}>
            {displayStatus}
          </span>
        );
      },
    },
    {
      accessor: 'actions',
      header: 'Actions',
      cell: (invoice) => (
        <div className="flex justify-end items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onView(invoice)} className="action-icon">
            <Eye className="h-4 w-4" />
          </Button>
          {onDownload && (
            <Button variant="ghost" size="icon" onClick={() => onDownload(invoice)} className="action-icon">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(invoice)} className="action-icon">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEmail(invoice)} className="action-icon">
            <Mail className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="action-icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(invoice)}>
                  <Edit className="h-4 w-4 mr-2 text-blue-600" />
                  Edit Invoice
                </DropdownMenuItem>
              )}
              {invoice.status !== 'paid' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'paid')}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {invoice.status !== 'submitted' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'submitted')}>
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  Mark as Submitted
                </DropdownMenuItem>
              )}
              {invoice.status !== 'pending' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'pending')}>
                  <Clock className="h-4 w-4 mr-2 text-slate-400" />
                  Mark as Not Submitted
                </DropdownMenuItem>
              )}
              {invoice.status !== 'overdue' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'overdue')}>
                  <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                  Mark as Overdue
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(invoice.id)}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <Card className="mb-6 border shadow-sm">
      <DataTable
        data={invoices}
        columns={columns}
        pagination={true}
        pageSize={10}
        emptyMessage={isLoading ? "Loading invoices..." : "No invoices found"}
      />
    </Card>
  );
};

export default InvoiceTable;
