/**
 * Email service for sending emails
 */
import nodemailer from 'nodemailer';
import { formatDateForDisplay } from './date-utils.js';

/**
 * Creates a configured email service instance
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });
  }

  /**
   * Sends an email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Sending result
   */
  async sendEmail(options) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Contrack App" <noreply@example.com>',
        ...options
      });
      console.log('Email sent:', result);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sends an invoice email
   * @param {Object} invoice - The invoice data
   * @param {string} recipientEmail - The recipient's email address
   * @returns {Promise<Object>} - Sending result
   */
  async sendInvoiceEmail(invoice, recipientEmail) {
    if (!invoice || !recipientEmail) {
      console.error('Missing required parameters for sending invoice email');
      return { success: false, error: 'Missing required parameters' };
    }

    const emailOptions = {
      to: recipientEmail,
      subject: `Invoice #${invoice.invoice_number || 'Unknown'} from ${invoice.company_name || 'Your Consultant'}`,
      html: this.generateInvoiceEmailHtml(invoice),
      text: this.generateInvoiceEmailText(invoice),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Generates HTML for invoice emails
   * @param {Object} invoice - The invoice data
   * @returns {string} - HTML content
   */
  generateInvoiceEmailHtml(invoice) {
    const dateFormatted = formatDateForDisplay(invoice.date || new Date());
    const dueDateFormatted = formatDateForDisplay(invoice.due_date || new Date());
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice #${invoice.invoice_number || 'Unknown'}</h2>
        <p>Dear Client,</p>
        <p>Please find attached your invoice #${invoice.invoice_number || 'Unknown'} dated ${dateFormatted}.</p>
        <div style="margin: 20px 0; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <p><strong>Invoice Date:</strong> ${dateFormatted}</p>
          <p><strong>Due Date:</strong> ${dueDateFormatted}</p>
          <p><strong>Amount Due:</strong> $${(invoice.total_amount || 0).toFixed(2)}</p>
        </div>
        <p>Thank you for your business!</p>
        <p>Regards,<br>${invoice.company_name || 'Your Consultant'}</p>
      </div>
    `;
  }

  /**
   * Generates plain text for invoice emails
   * @param {Object} invoice - The invoice data
   * @returns {string} - Plain text content
   */
  generateInvoiceEmailText(invoice) {
    const dateFormatted = formatDateForDisplay(invoice.date || new Date());
    const dueDateFormatted = formatDateForDisplay(invoice.due_date || new Date());
    
    return `
Invoice #${invoice.invoice_number || 'Unknown'}

Dear Client,

Please find attached your invoice #${invoice.invoice_number || 'Unknown'} dated ${dateFormatted}.

Invoice Date: ${dateFormatted}
Due Date: ${dueDateFormatted}
Amount Due: $${(invoice.total_amount || 0).toFixed(2)}

Thank you for your business!

Regards,
${invoice.company_name || 'Your Consultant'}
    `;
  }
}

export const emailService = new EmailService();

export default {
  emailService
}; 