import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatHours } from './format-utils';
import { formatDate } from './date-utils';
import { type InvoiceWithLineItems } from '@shared/schema';

// No need for declaration as we're properly importing autoTable
// And will use it differently

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
  const lineItems = (invoice.lineItems || []).map(item => [
    formatDate(item.description?.includes('Date:') ? item.description.split('Date:')[1]?.trim() : ''),
    item.description || 'Service',
    formatHours(item.hours || 0),
    formatCurrency(item.rate || 0),
    formatCurrency(item.amount || 0)
  ]);

  // Add table with line items - use imported autoTable function
  autoTable(doc, {
    startY: 95,
    head: [['Date', 'Description', 'Hours', 'Rate', 'Amount']],
    body: lineItems.length > 0 ? lineItems : [['', 'No line items', '', '', '']],
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

  // Get the final Y position after the table
  // @ts-ignore - Access internal API
  const finalY = (doc as any).lastAutoTable?.finalY || 150;

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

// Add type declaration for the global jspdf object
declare global {
  interface Window {
    jspdf?: {
      jsPDF: any;
    };
  }
}

// Add fallback function that uses the global jsPDF instance from the CDN
function generateInvoicePDFFallback(invoice: InvoiceWithLineItems, options: InvoiceGeneratorOptions = {}): any {
  console.log('Using fallback PDF generator with global jsPDF instance');
  
  // Check if the global jsPDF is available
  if (typeof window === 'undefined' || !window.jspdf) {
    throw new Error('jsPDF is not available globally. PDF generation failed.');
  }
  
  // Access the global jsPDF constructor
  const { jsPDF } = window.jspdf;
  
  if (!jsPDF) {
    throw new Error('Global jsPDF constructor is not available. PDF generation failed.');
  }
  
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

  // Create PDF document using the global jsPDF
  const doc = new jsPDF() as any;
  
  // Rest of the implementation is the same as generateInvoicePDF
  // but uses the doc.autoTable method directly instead of the imported autoTable function
  
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
  const lineItems = (invoice.lineItems || []).map(item => [
    formatDate(item.description?.includes('Date:') ? item.description.split('Date:')[1]?.trim() : ''),
    item.description || 'Service',
    formatHours(item.hours || 0),
    formatCurrency(item.rate || 0),
    formatCurrency(item.amount || 0)
  ]);

  // Use the autoTable method directly on the doc object
  doc.autoTable({
    startY: 95,
    head: [['Date', 'Description', 'Hours', 'Rate', 'Amount']],
    body: lineItems.length > 0 ? lineItems : [['', 'No line items', '', '', '']],
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
  const finalY = (doc as any).lastAutoTable?.finalY || 150;

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
  try {
    console.log('Starting PDF generation for invoice:', invoice.invoiceNumber);
    
    // Validate required fields
    if (!invoice.invoiceNumber) {
      console.error('Invoice number is missing', invoice);
      throw new Error('Invoice number is missing');
    }
    
    if (!invoice.clientName) {
      console.error('Client name is missing', invoice);
      throw new Error('Client name is missing');
    }
    
    if (!Array.isArray(invoice.lineItems)) {
      console.error('Line items is not an array', invoice);
      throw new Error('Invoice has invalid line items');
    }
    
    if (invoice.lineItems.length === 0) {
      console.error('Invoice line items are empty', invoice);
      throw new Error('Invoice has no line items');
    }
    
    // Check at least the first line item for valid data
    const firstItem = invoice.lineItems[0];
    if (!firstItem || typeof firstItem !== 'object') {
      console.error('First line item is invalid', firstItem);
      throw new Error('Invoice contains invalid line item data');
    }
    
    // Ensure each line item has proper hours and amount
    for (let i = 0; i < invoice.lineItems.length; i++) {
      const item = invoice.lineItems[i];
      if (item.hours === undefined || item.hours === null || isNaN(Number(item.hours))) {
        console.error(`Line item ${i} has invalid hours:`, item);
        item.hours = 0 as any; // Fix the value rather than failing
      }
      
      if (item.amount === undefined || item.amount === null || isNaN(Number(item.amount))) {
        console.error(`Line item ${i} has invalid amount:`, item);
        item.amount = '0'; // Fix the value rather than failing
      }
      
      if (item.rate === undefined || item.rate === null || isNaN(Number(item.rate))) {
        console.error(`Line item ${i} has invalid rate:`, item);
        item.rate = '0'; // Fix the value rather than failing
      }
    }
    
    if (typeof invoice.totalHours !== 'number' || isNaN(invoice.totalHours)) {
      console.log('Total hours is missing or not a number - calculating from line items');
      // Set default if missing
      invoice.totalHours = invoice.lineItems.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    }
    
    if (typeof invoice.amount !== 'number' && typeof invoice.amount !== 'string') {
      console.error('Invoice amount is missing or invalid', invoice);
      // Calculate from line items as fallback
      invoice.amount = invoice.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0).toString();
    }
    
    console.log('Validated invoice data, generating PDF...');
    try {
      // Try the ESM import version first
      const doc = generateInvoicePDF(invoice);
      console.log('PDF generated successfully, saving file...');
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      console.log('PDF saved successfully');
    } catch (pdfError) {
      console.error('Error in PDF generation step, trying fallback method:', pdfError);
      
      // Try the fallback method with global jsPDF
      try {
        const doc = generateInvoicePDFFallback(invoice);
        console.log('PDF generated successfully using fallback method, saving file...');
        doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
        console.log('PDF saved successfully using fallback method');
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        throw new Error('Unable to generate PDF using both methods. Please check your network connection and try again.');
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateInvoiceDataUrl(invoice: InvoiceWithLineItems): string {
  const doc = generateInvoicePDF(invoice);
  return doc.output('datauristring');
}
