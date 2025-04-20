import { type InvoiceWithLineItems } from '@shared/schema';
import { apiRequest } from './queryClient';
import { formatDateForDisplay, adjustDateForTimezone } from './date-utils';
import { formatCurrency } from './format-utils';

/**
 * Service for handling invoice emails
 */
export const emailService = {
  /**
   * Generate a PDF for an invoice and open the system email client
   * 
   * @param invoice The invoice to send
   * @param to Optional recipient email address
   * @returns Promise resolving when the system email client is opened
   */
  async openEmailWithInvoice(
    invoice: InvoiceWithLineItems,
    to?: string
  ): Promise<void> {
    console.log(`Generating PDF for invoice ${invoice.invoiceNumber}`);
    
    try {
      const response = await apiRequest('POST', `/api/invoices/${invoice.id}/email`, {});
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('PDF generation failed:', errorData || response.statusText);
        throw new Error(
          errorData?.message || 
          errorData?.error || 
          'Failed to generate invoice PDF. Please try again.'
        );
      }
      
      const responseData = await response.json();
      console.log('PDF generation response:', responseData);
      
      // Create mailto URL with the email content
      const recipient = to || '';
      const subject = encodeURIComponent(responseData.emailSubject);
      const body = encodeURIComponent(responseData.emailBody);
      
      // Create a temporary link to download the PDF
      const pdfData = responseData.pdfData;
      const pdfBlob = this.dataURItoBlob(pdfData);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Create a temporary download link for the PDF
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      downloadLink.download = responseData.filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Open the system email client
      const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
      window.open(mailtoUrl, '_blank');
      
      return;
    } catch (error) {
      console.error('Error in openEmailWithInvoice:', error);
      throw error;
    }
  },

  /**
   * Convert a data URI to a Blob
   * 
   * @param dataURI The data URI string
   * @returns Blob object
   */
  dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  },

  /**
   * Generate a default email subject for an invoice
   * 
   * @param invoice The invoice
   * @returns A formatted subject line
   */
  generateDefaultSubject(invoice: InvoiceWithLineItems): string {
    return `Invoice #${invoice.invoiceNumber} from [Your Company Name]`;
  },

  /**
   * Generate a default email message for an invoice
   * 
   * @param invoice The invoice
   * @returns A formatted message
   */
  generateDefaultMessage(invoice: InvoiceWithLineItems): string {
    return `Dear ${invoice.clientName},

Please find attached invoice #${invoice.invoiceNumber} for services rendered.

Invoice Details:
- Issue Date: ${formatDateForDisplay(invoice.issueDate)}
- Due Date: ${formatDateForDisplay(invoice.dueDate)}
- Total Amount: ${formatCurrency(Number(invoice.totalAmount))}

Please let us know if you have any questions.

Thank you for your business.

Best regards,
[Your Company Name]`;
  }
};
