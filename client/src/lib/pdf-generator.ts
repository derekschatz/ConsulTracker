import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatHours } from './format-utils';
import { formatDate } from './date-utils';
import { type InvoiceWithLineItems } from '@shared/schema';

// No need for declaration as we're properly importing autoTable
// And will use it differently

// Function to handle date timezone adjustment
function adjustDateForTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate() + 1  // Add one day to compensate for timezone shift
  );
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
    companyName: 'Derek Schatz',
    companyAddress: '100 Danby Court\nChurchville, PA 18966',
    companyEmail: 'bobschatz@agileinfusion.com',
    companyPhone: '(215) 435-3240',
    footerText: 'Thank you for your business!',
  };

  // Merge options
  const opts = { ...defaultOptions, ...options };

  // Create PDF document
  const doc = new jsPDF();

  // Page width for alignment
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Company information (left side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(opts.companyName!, 14, 20);
  
  // Tagline in blue
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 255); // Blue color
  doc.text("Learning Through Experience", 14, 26);
  
  // Company details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Agile Infusion, LLC", 14, 34);
  doc.text(opts.companyAddress!.split('\n'), 14, 39);
  doc.text(`Phone ${opts.companyPhone}`, 14, 49);
  doc.text(opts.companyEmail!, 14, 54);
  doc.text(`Federal Tax ID: 20-5199056`, 14, 59);

  // INVOICE on right side
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - 14, 20, { align: 'right' });
  
  // Invoice details on right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`INVOICE #${invoice.invoiceNumber}`, pageWidth - 14, 30, { align: 'right' });
  doc.text(`DATE: ${formatDate(invoice.issueDate).toUpperCase()}`, pageWidth - 14, 35, { align: 'right' });

  // Bill to section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("TO:", 14, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName, 14, 80);
  // Placeholder for more client info that would be added later
  
  // For section - project details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("FOR:", pageWidth - 90, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.projectName || "Consulting Services", pageWidth - 90, 80);
  
  // Table for line items
  const startY = 100;
  
  // Define table headers
  doc.setFillColor(255, 255, 255); // White background
  doc.setDrawColor(0, 0, 0); // Black border
  doc.setLineWidth(0.1);
  
  // Draw table header
  doc.setFont('helvetica', 'bold');
  doc.rect(14, startY, pageWidth - 28, 10, 'S');
  doc.text("DESCRIPTION", 24, startY + 7);
  doc.text("HOURS", pageWidth - 95, startY + 7, { align: 'center' });
  doc.text("RATE", pageWidth - 55, startY + 7, { align: 'center' });
  doc.text("AMOUNT", pageWidth - 20, startY + 7, { align: 'right' });
  
  // Format line items
  let currentY = startY + 10;
  
  // If there are line items, display them
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    // Main line items
    invoice.lineItems.forEach((item, index) => {
      // Extract the project description without the date information
      let description = item.description || '';
      if (description.includes('Date:')) {
        description = description.split('Date:')[0].trim();
      }
      
      // For the example format, we'll create a period/date range description
      const projectDesc = `Consultant ${invoice.projectName || "Services"} Activities`;
      const period = `Period: ${formatDate(invoice.periodStart)}-${formatDate(invoice.periodEnd)}`;
      const finalNote = invoice.status === 'final' ? '****Final Invoice****' : '';
      
      if (index === 0) {
        // Draw first row with description
        doc.setFont('helvetica', 'normal');
        doc.rect(14, currentY, pageWidth - 28, 10, 'S');
        doc.text(projectDesc, 24, currentY + 7);
        
        // Add period on the next line
        currentY += 10;
        doc.rect(14, currentY, pageWidth - 28, 10, 'S');
        doc.text(period, 24, currentY + 7);
        
        // If final invoice, add that note
        if (finalNote) {
          currentY += 10;
          doc.rect(14, currentY, pageWidth - 28, 10, 'S');
          doc.text(finalNote, 24, currentY + 7);
        }
        
        // Add hours, rate and amount only to the first row
        doc.text(formatHours(invoice.totalHours || 0), pageWidth - 95, startY + 17, { align: 'center' });
        doc.text(`$${item.rate}/hr`, pageWidth - 55, startY + 17, { align: 'center' });
        doc.text(`$${parseFloat(String(invoice.amount)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 20, startY + 17, { align: 'right' });
      }
    });
  } else {
    // If no line items, show placeholder
    doc.setFont('helvetica', 'normal');
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    doc.text("No items", 24, currentY + 7);
    currentY += 10;
  }
  
  // Add empty rows to make the table look fuller
  const emptyRows = 3 - (invoice.lineItems?.length || 0);
  for (let i = 0; i < emptyRows; i++) {
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    currentY += 10;
  }
  
  // Add total row
  doc.setFont('helvetica', 'bold');
  doc.text("TOTAL", pageWidth - 65, currentY + 15);
  doc.text(`$${parseFloat(String(invoice.amount)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 20, currentY + 15, { align: 'right' });
  
  // Add payment instructions
  currentY += 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Make all checks payable to ${opts.companyName}`, 14, currentY);
  doc.text(`Total due in 30 days.`, 14, currentY + 5);
  
  // Add footer
  doc.setFontSize(10);
  doc.text(opts.footerText!, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });

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
    companyName: 'Derek Schatz',
    companyAddress: '100 Danby Court\nChurchville, PA 18966',
    companyEmail: 'bobschatz@agileinfusion.com',
    companyPhone: '(215) 435-3240',
    footerText: 'Thank you for your business!',
  };

  // Merge options
  const opts = { ...defaultOptions, ...options };

  // Create PDF document using the global jsPDF
  const doc = new jsPDF() as any;
  
  // Page width for alignment
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Company information (left side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(opts.companyName!, 14, 20);
  
  // Tagline in blue
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 255); // Blue color
  doc.text("Learning Through Experience", 14, 26);
  
  // Company details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Agile Infusion, LLC", 14, 34);
  doc.text(opts.companyAddress!.split('\n'), 14, 39);
  doc.text(`Phone ${opts.companyPhone}`, 14, 49);
  doc.text(opts.companyEmail!, 14, 54);
  doc.text(`Federal Tax ID: 20-5199056`, 14, 59);

  // INVOICE on right side
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - 14, 20, { align: 'right' });
  
  // Invoice details on right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`INVOICE #${invoice.invoiceNumber}`, pageWidth - 14, 30, { align: 'right' });
  doc.text(`DATE: ${formatDate(invoice.issueDate).toUpperCase()}`, pageWidth - 14, 35, { align: 'right' });

  // Bill to section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("TO:", 14, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName, 14, 80);
  // Placeholder for more client info that would be added later
  
  // For section - project details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("FOR:", pageWidth - 90, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.projectName || "Consulting Services", pageWidth - 90, 80);
  
  // Table for line items
  const startY = 100;
  
  // Define table headers
  doc.setFillColor(255, 255, 255); // White background
  doc.setDrawColor(0, 0, 0); // Black border
  doc.setLineWidth(0.1);
  
  // Draw table header
  doc.setFont('helvetica', 'bold');
  doc.rect(14, startY, pageWidth - 28, 10, 'S');
  doc.text("DESCRIPTION", 24, startY + 7);
  doc.text("HOURS", pageWidth - 95, startY + 7, { align: 'center' });
  doc.text("RATE", pageWidth - 55, startY + 7, { align: 'center' });
  doc.text("AMOUNT", pageWidth - 20, startY + 7, { align: 'right' });
  
  // Format line items
  let currentY = startY + 10;
  
  // If there are line items, display them
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    // Main line items
    invoice.lineItems.forEach((item, index) => {
      // Extract the project description without the date information
      let description = item.description || '';
      if (description.includes('Date:')) {
        description = description.split('Date:')[0].trim();
      }
      
      // For the example format, we'll create a period/date range description
      const projectDesc = `Consultant ${invoice.projectName || "Services"} Activities`;
      const period = `Period: ${formatDate(invoice.periodStart)}-${formatDate(invoice.periodEnd)}`;
      const finalNote = invoice.status === 'final' ? '****Final Invoice****' : '';
      
      if (index === 0) {
        // Draw first row with description
        doc.setFont('helvetica', 'normal');
        doc.rect(14, currentY, pageWidth - 28, 10, 'S');
        doc.text(projectDesc, 24, currentY + 7);
        
        // Add period on the next line
        currentY += 10;
        doc.rect(14, currentY, pageWidth - 28, 10, 'S');
        doc.text(period, 24, currentY + 7);
        
        // If final invoice, add that note
        if (finalNote) {
          currentY += 10;
          doc.rect(14, currentY, pageWidth - 28, 10, 'S');
          doc.text(finalNote, 24, currentY + 7);
        }
        
        // Add hours, rate and amount only to the first row
        doc.text(formatHours(invoice.totalHours || 0), pageWidth - 95, startY + 17, { align: 'center' });
        doc.text(`$${item.rate}/hr`, pageWidth - 55, startY + 17, { align: 'center' });
        doc.text(`$${parseFloat(String(invoice.amount)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 20, startY + 17, { align: 'right' });
      }
    });
  } else {
    // If no line items, show placeholder
    doc.setFont('helvetica', 'normal');
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    doc.text("No items", 24, currentY + 7);
    currentY += 10;
  }
  
  // Add empty rows to make the table look fuller
  const emptyRows = 3 - (invoice.lineItems?.length || 0);
  for (let i = 0; i < emptyRows; i++) {
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    currentY += 10;
  }
  
  // Add total row
  doc.setFont('helvetica', 'bold');
  doc.text("TOTAL", pageWidth - 65, currentY + 15);
  doc.text(`$${parseFloat(String(invoice.amount)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 20, currentY + 15, { align: 'right' });
  
  // Add payment instructions
  currentY += 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Make all checks payable to ${opts.companyName}`, 14, currentY);
  doc.text(`Total due in 30 days.`, 14, currentY + 5);
  
  // Add footer
  doc.setFontSize(10);
  doc.text(opts.footerText!, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });

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

// Add this new function to generate a Blob URL instead of a data URI
export function generateInvoiceBlobUrl(invoice: InvoiceWithLineItems): string {
  try {
    // Generate the PDF document
    const doc = generateInvoicePDF(invoice);
    
    // Get the raw PDF data as an array buffer
    const pdfData = doc.output('arraybuffer');
    
    // Create a Blob from the PDF data
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    
    // Create and return a blob URL
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating PDF blob URL:', error);
    throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update the data URI function to use the blob approach for consistency
export function generateInvoiceDataUrl(invoice: InvoiceWithLineItems): string {
  try {
    // Use the blob URL approach which works better with Chrome security policies
    return generateInvoiceBlobUrl(invoice);
  } catch (error) {
    console.error('Error generating PDF data URL:', error);
    throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
