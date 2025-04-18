import { formatDateForDisplay } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/format-utils';
import { Invoice } from '../../../shared/schema';

interface InvoiceSummaryProps {
  invoice: Invoice;
}

export function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h3>
          <div className="text-sm text-gray-600">
            {formatDateForDisplay(invoice.issueDate)}
          </div>
        </div>
        <div className="text-xl font-bold">
          {formatCurrency(invoice.amount)}
        </div>
      </div>
      <div className="text-sm text-gray-600">
        Due: {formatDateForDisplay(invoice.dueDate)}
      </div>
      <div className="text-sm">
        Status: <span className="font-medium">{invoice.status}</span>
      </div>
    </div>
  );
} 