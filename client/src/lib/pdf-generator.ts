import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatHours } from './format-utils';
import { formatDate } from './date-utils';
import { type InvoiceWithLineItems } from '@shared/schema';

// Add autotable property to jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface InvoiceGeneratorOptions {
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogo?: string;
  footerText?: string;
}

export function generateInvoicePDF(
  invoice: InvoiceWithLineItems,
  options: InvoiceGeneratorOptions = {}
): jsPDF {
  // Default options
  const defaultOptions: InvoiceGeneratorOptions = {
    companyName: 'Your Consulting Services',
    companyAddress: '123 Business St, Business City, 12345',
    companyEmail: 'contact@yourcompany.com',
    companyPhone: '(123) 456-7890',
    footerText: 'Thank you for your business!',
  };

  // Merge options
  const opts = { ...defaultOptions, ...options };

  // Create PDF document
  const doc = new jsPDF();

  // Add header with logo if available
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(20);
  doc.setTextColor(0, 51, 102); // Dark blue for header
  doc.text("INVOICE", pageWidth / 2, 20, { align: 'center' });

  // Company information
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(opts.companyName!, 14, 30);
  doc.setFontSize(10);
  doc.text(opts.companyAddress!, 14, 35);
  doc.text(`Email: ${opts.companyEmail}`, 14, 40);
  doc.text(`Phone: ${opts.companyPhone}`, 14, 45);

  // Invoice details
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text("Invoice Details", pageWidth - 90, 30);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, pageWidth - 90, 35);
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, pageWidth - 90, 40);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - 90, 45);

  // Bill to
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text("Bill To:", 14, 60);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.clientName, 14, 65);

  // Period
  doc.setFontSize(10);
  doc.text(`Billing Period: ${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`, 14, 75);

  // Line items
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text("Services", 14, 90);

  // Format line items for autotable
  const lineItems = invoice.lineItems.map(item => [
    formatDate(item.description.includes('Date:') ? item.description.split('Date:')[1].trim() : ''),
    item.description,
    formatHours(item.hours),
    formatCurrency(item.rate),
    formatCurrency(item.amount)
  ]);

  // Add table with line items
  doc.autoTable({
    startY: 95,
    head: [['Date', 'Description', 'Hours', 'Rate', 'Amount']],
    body: lineItems,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 51, 102],
      textColor: [255, 255, 255]
    },
    styles: {
      cellPadding: 5,
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  // Calculate total position (after table)
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Totals
  doc.setFontSize(11);
  doc.text("Total Hours:", pageWidth - 80, finalY + 15);
  doc.text(formatHours(invoice.totalHours), pageWidth - 20, finalY + 15, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Total Amount:", pageWidth - 80, finalY + 25);
  doc.text(formatCurrency(invoice.amount), pageWidth - 20, finalY + 25, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Add notes if present
  if (invoice.notes) {
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text("Notes:", 14, finalY + 40);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(invoice.notes, 14, finalY + 45);
  }

  // Add footer
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(opts.footerText!, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  // Add page number
  doc.setFontSize(8);
  doc.text(`Page 1 of 1`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  return doc;
}

export function downloadInvoice(invoice: InvoiceWithLineItems): void {
  const doc = generateInvoicePDF(invoice);
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}

export function generateInvoiceDataUrl(invoice: InvoiceWithLineItems): string {
  const doc = generateInvoicePDF(invoice);
  return doc.output('datauristring');
}
