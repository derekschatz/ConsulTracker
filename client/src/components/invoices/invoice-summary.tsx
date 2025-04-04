import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/format-utils';

interface InvoiceSummaryProps {
  totalInvoiced: number;
  paidInvoices: number;
  outstandingInvoices: number;
  year: number;
}

const InvoiceSummary = ({
  totalInvoiced,
  paidInvoices,
  outstandingInvoices,
  year
}: InvoiceSummaryProps) => {
  // Calculate percentages
  const paidPercentage = totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0;
  const outstandingPercentage = totalInvoiced > 0 ? (outstandingInvoices / totalInvoiced) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Invoiced</div>
          <div className="text-2xl font-semibold text-slate-900">{formatCurrency(totalInvoiced)}</div>
          <div className="text-xs text-slate-500 mt-1">{year} Year-to-Date</div>
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
