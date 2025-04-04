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
  AlertCircle
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
}

const InvoiceTable = ({ 
  invoices, 
  isLoading, 
  onView, 
  onEmail, 
  onUpdateStatus,
  onDelete 
}: InvoiceTableProps) => {
  const isMobile = useMobile();
  
  const columns: Column<any>[] = [
    {
      accessor: 'invoiceNumber',
      header: 'Invoice #',
      cell: (invoice) => (
        <span className="font-medium text-slate-900">{invoice.invoiceNumber}</span>
      ),
    },
    {
      accessor: 'clientName',
      header: 'Client',
      cell: (invoice) => (
        <div>
          <div className="font-medium text-slate-900">{invoice.clientName}</div>
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
        <span className="font-medium text-slate-900">{formatCurrency(invoice.amount)}</span>
      ),
    },
    {
      accessor: 'status',
      header: 'Status',
      cell: (invoice) => {
        const { bg, text } = getStatusClasses(invoice.status);
        return (
          <span className={`inline-flex rounded-full ${bg} ${text} px-2 py-1 text-xs font-medium`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        );
      },
    },
    {
      accessor: 'actions',
      header: 'Actions',
      cell: (invoice) => (
        <div className="flex justify-end items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onView(invoice)} className="h-8 w-8 text-slate-600 hover:text-blue-600">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEmail(invoice)} className="h-8 w-8 text-slate-600 hover:text-blue-600">
            <Mail className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(invoice)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              {invoice.status !== 'paid' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'paid')}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {invoice.status !== 'pending' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(invoice.id, 'pending')}>
                  <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                  Mark as Pending
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
