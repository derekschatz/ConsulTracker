import { formatDateForDisplay } from './date-utils';
import { Invoice } from '../../shared/schema';

export function generateDefaultMessage(invoice: Invoice): string {
  return `Invoice #${invoice.invoiceNumber} for ${invoice.clientName}
Issue Date: ${formatDateForDisplay(invoice.issueDate)}
Due Date: ${formatDateForDisplay(invoice.dueDate)}
Amount: $${Number(invoice.amount).toFixed(2)}`;
} 