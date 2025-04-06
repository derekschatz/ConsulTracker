import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/format-utils';

interface InvoiceSummaryProps {
  totalInvoiced: number;
  paidInvoices: number;
  outstandingInvoices: number;
  dateRange: string;
  startDate?: string;
  endDate?: string;
}

const InvoiceSummary = ({
  totalInvoiced,
  paidInvoices,
  outstandingInvoices,
  dateRange,
  startDate,
  endDate
}: InvoiceSummaryProps) => {
  // Calculate percentages
  const paidPercentage = totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0;
  const outstandingPercentage = totalInvoiced > 0 ? (outstandingInvoices / totalInvoiced) * 100 : 0;

  // Determine the summary label based on date range
  const getSummaryLabel = () => {
    const currentYear = new Date().getFullYear();
    
    switch(dateRange) {
      case 'all':
        return 'All Time';
      case 'current':
        return `${currentYear} Year-to-Date`;
      case 'last':
        return `${currentYear - 1} Year`;
      case 'month':
        return `${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}`;
      case 'custom':
        if (startDate && endDate) {
          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          };
          return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
        return 'Custom Range';
      default:
        return 'Selected Period';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Invoiced</div>
          <div className="text-2xl font-semibold text-slate-900">{formatCurrency(totalInvoiced)}</div>
          <div className="text-xs text-slate-500 mt-1">{getSummaryLabel()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Paid Invoices</div>
          <div className="text-2xl font-semibold text-green-600">{formatCurrency(paidInvoices)}</div>
          <div className="text-xs text-slate-500 mt-1">{formatPercentage(paidPercentage)} of total</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Outstanding Invoices</div>
          <div className="text-2xl font-semibold text-amber-600">{formatCurrency(outstandingInvoices)}</div>
          <div className="text-xs text-slate-500 mt-1">{formatPercentage(outstandingPercentage)} of total</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceSummary;
