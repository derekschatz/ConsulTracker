import { type InvoiceWithLineItems } from '@shared/schema';
import { apiRequest } from './queryClient';

/**
 * Service for sending invoices via email
 */
export const emailService = {
  /**
   * Send an invoice to a specified email address
   * 
   * @param invoice The invoice to send
   * @param to The recipient's email address
   * @param subject Optional custom subject line
   * @param message Optional custom message
   * @returns Promise resolving to the API response
   */
  async sendInvoice(
    invoice: InvoiceWithLineItems,
    to: string,
    subject?: string,
    message?: string
  ): Promise<Response> {
    return apiRequest('POST', `/api/invoices/${invoice.id}/email`, {
      to,
      subject,
      message
    });
  },

  /**
   * Generate a default email subject for an invoice
   * 
   * @param invoice The invoice
   * @returns A formatted subject line
   */
  generateDefaultSubject(invoice: InvoiceWithLineItems): string {
    return `Invoice #${invoice.invoiceNumber} from Your Consulting Service`;
  },

  /**
   * Generate a default email message for an invoice
   * 
   * @param invoice The invoice
   * @returns A formatted message
   */
  generateDefaultMessage(invoice: InvoiceWithLineItems): string {
    const issueDate = new Date(invoice.issueDate).toLocaleDateString();
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    return `Dear ${invoice.clientName},

Please find attached invoice #${invoice.invoiceNumber} in the amount of $${invoice.amount}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${issueDate}
- Due Date: ${dueDate}
- Amount Due: $${invoice.amount}

If you have any questions about this invoice, please don't hesitate to contact me.

Thank you for your business!

Best regards,
Your Consulting Service`;
  }
};
