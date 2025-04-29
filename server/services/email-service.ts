import { formatDateForDisplay } from './date-utils';
import { Invoice } from '../../shared/schema';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Configure SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create reusable transporter object using SMTP transport or SendGrid
const getTransporter = () => {
  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    return null; // Will use SendGrid directly
  }
  
  // Otherwise, use SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
};

// Email service functions
export const emailService = {
  /**
   * Send an email using either SMTP or SendGrid
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    from?: string;
  }): Promise<boolean> {
    try {
      const { to, subject, text, html, from = process.env.EMAIL_FROM || 'noreply@example.com' } = options;
      
      // Use SendGrid if configured
      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send({
          to,
          from,
          subject,
          text,
          html: html || text,
        });
        return true;
      }
      
      // Otherwise use SMTP
      const transporter = getTransporter();
      if (!transporter) {
        console.error('No email transporter configured');
        return false;
      }
      
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },
  
  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(options: {
    to: string;
    resetToken: string;
    userName: string;
  }): Promise<boolean> {
    const { to, resetToken, userName } = options;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const text = `
      Hello ${userName},
      
      You recently requested to reset your password. Click the link below to reset it:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request a password reset, please ignore this email.
      
      Regards,
      The Support Team
    `;
    
    const html = `
      <p>Hello ${userName},</p>
      <p>You recently requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Regards,<br>The Support Team</p>
    `;
    
    return this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  },
};

export function generateDefaultMessage(invoice: Invoice): string {
  return `Invoice #${invoice.invoiceNumber} for ${invoice.clientName}
Issue Date: ${formatDateForDisplay(invoice.issueDate)}
Due Date: ${formatDateForDisplay(invoice.dueDate)}
Amount: $${Number(invoice.totalAmount).toFixed(2)}`;
} 