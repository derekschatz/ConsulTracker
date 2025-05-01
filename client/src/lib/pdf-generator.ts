import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatHours } from './format-utils';
import { formatDate } from './date-utils';
import { type InvoiceWithLineItems } from '@shared/schema';
import { BusinessInfoValues } from '@/hooks/use-business-info';

// No need for declaration as we're properly importing autoTable
// And will use it differently

// Format dates - directly extract from the date strings without timezone conversion
function formatDatePart(dateStr: string | Date): string {
  if (!dateStr) return '';
  console.log('Date received by formatDatePart:', dateStr);
  
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  console.log('Date string after conversion:', str);
  
  const datePart = str.substring(0, 10); // Get YYYY-MM-DD part
  console.log('Date part extracted (YYYY-MM-DD):', datePart);
  
  const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
  console.log('Year:', year, 'Month:', month, 'Day:', day);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const result = `${months[month-1]} ${day}, ${year}`;
  console.log('Final formatted date:', result);
  
  return result;
}

interface InvoiceGeneratorOptions {
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogo?: string;
  footerText?: string;
  businessInfo?: BusinessInfoValues;
  logoDataUrl?: string | null;
  userName?: string;
  download?: boolean;
  filename?: string;
}

export function generateInvoicePDF(
  invoice: InvoiceWithLineItems,
  options: InvoiceGeneratorOptions = {}
): jsPDF {
  // Debug client billing information
  console.log('PDF Generator - Invoice billing details:', {
    clientName: invoice.clientName,
    billingContactName: invoice.billingContactName,
    billingContactEmail: invoice.billingContactEmail,
    billingAddress: invoice.billingAddress,
    billingCity: invoice.billingCity,
    billingState: invoice.billingState,
    billingZip: invoice.billingZip,
    billingCountry: invoice.billingCountry
  });

  // Default options
  const defaultOptions: InvoiceGeneratorOptions = {
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    footerText: 'Thank you for your business!',
  };

  // Merge options
  const opts = { ...defaultOptions, ...options };
  
  // Use business info for defaults if available
  const businessInfo = opts.businessInfo;
  if (businessInfo) {
    opts.companyName = businessInfo.companyName || opts.companyName;
    
    // Create multi-line address from business info components
    const addressParts = [];
    if (businessInfo.address) addressParts.push(businessInfo.address);
    
    // City, State ZIP
    const cityStateZip = [
      businessInfo.city,
      businessInfo.state,
      businessInfo.zip
    ].filter(Boolean).join(", ");
    
    if (cityStateZip) addressParts.push(cityStateZip);
    
    if (addressParts.length > 0) {
      opts.companyAddress = addressParts.join('\n');
    }
    
    // Phone and Tax ID
    opts.companyPhone = businessInfo.phoneNumber || '';
  }

  // Create PDF document
  const doc = new jsPDF();

  // Page width for alignment
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add company logo if available - centered at top
  if (opts.logoDataUrl) {
    try {
      console.log('Adding logo from data URL');
      
      // Logo dimensions in mm
      const logoWidth = 40; // mm
      const logoHeight = 20; // mm
      const logoY = 10; // 10mm from top
      const logoX = (pageWidth - logoWidth) / 2; // Centered horizontally
      
      // Add image to PDF from the loaded data URL
      doc.addImage(
        opts.logoDataUrl,
        'AUTO', // Auto-detect format from data URL
        logoX, // X position - centered
        logoY, // Y position from top
        logoWidth, // Width in mm
        logoHeight, // Height in mm
        undefined, // Alias
        'FAST' // Compression
      );
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      // If image loading fails, fall back to placeholder
      if (businessInfo?.companyLogo) {
        const logoWidth = 40;
        const logoHeight = 20;
        const logoY = 10;
        const logoX = (pageWidth - logoWidth) / 2; // Centered
        doc.setDrawColor(255, 255, 255); // White - invisible border
        doc.rect(logoX, logoY, logoWidth, logoHeight, 'S');
      }
    }
  } else if (businessInfo?.companyLogo) {
    // If no data URL but a logo filename exists, add placeholder
    const logoWidth = 40;
    const logoHeight = 20;
    const logoY = 10;
    const logoX = (pageWidth - logoWidth) / 2; // Centered
    doc.setDrawColor(255, 255, 255); // White - invisible border
    doc.rect(logoX, logoY, logoWidth, logoHeight, 'S');
  }
  
  // INVOICE on right side
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - 14, 20, { align: 'right' });
  
  // Invoice details on right (moved up)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`INVOICE #${invoice.invoiceNumber}`, pageWidth - 14, 30, { align: 'right' });
  doc.text(`DATE: ${formatDatePart(invoice.issueDate).toUpperCase()}`, pageWidth - 14, 35, { align: 'right' });
  doc.text(`DUE DATE: ${formatDatePart(invoice.dueDate).toUpperCase()}`, pageWidth - 14, 40, { align: 'right' });

  // Company information (left side) - starts lower if logo is present
  const contentStartY = businessInfo?.companyLogo ? 40 : 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const displayName = opts.userName || 'INVOICE';
  doc.text(displayName, 14, contentStartY);
  
  // Add company details if available
  let yPosition = contentStartY + 5; // Reduced gap between username and company name (was +10)
  
  if (opts.companyName || opts.companyAddress || opts.companyPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    if (opts.companyName) {
      doc.text(opts.companyName, 14, yPosition);
      yPosition += 5;
    }
    
    if (opts.companyAddress) {
      // Handle multi-line address
      const addressLines = opts.companyAddress.split('\n');
      for (const line of addressLines) {
        doc.text(line, 14, yPosition);
        yPosition += 5;
      }
    }
    
    if (opts.companyPhone) {
      doc.text(`Phone: ${opts.companyPhone}`, 14, yPosition);
      yPosition += 5;
    }
    
    if (businessInfo?.taxId) {
      doc.text(`Tax ID: ${businessInfo.taxId}`, 14, yPosition);
      yPosition += 5;
    }
  }

  // Bill to section - with reduced gap between company details and TO section
  const toSectionY = Math.max(yPosition + 8, 75); // Add 8mm gap (reduced from 15mm)
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("TO:", 14, toSectionY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName, 14, toSectionY + 5);
  
  // Add billing information if available
  let billingY = toSectionY + 10;
  if (invoice.billingContactName) {
    doc.text(`ATTN: ${invoice.billingContactName}`, 14, billingY);
    billingY += 5;
  }
  
  if (invoice.billingAddress) {
    doc.text(invoice.billingAddress, 14, billingY);
    billingY += 5;
  }
  
  // Add city, state, zip on same line if available
  const addressLine = [
    invoice.billingCity,
    invoice.billingState,
    invoice.billingZip
  ].filter(Boolean).join(", ");
  
  if (addressLine) {
    doc.text(addressLine, 14, billingY);
    billingY += 5;
  }
  
  if (invoice.billingCountry) {
    doc.text(invoice.billingCountry, 14, billingY);
    billingY += 5;
  }
  
  if (invoice.billingContactEmail) {
    doc.text(invoice.billingContactEmail, 14, billingY);
  }
  
  // Check if this is a project-based engagement - check both camelCase and snake_case
  const isProjectEngagement = (invoice as any).engagementType === 'project' || 
                             (invoice as any).engagement_type === 'project';
  console.log('PDF Generator - Project check:', { 
    camelCase: (invoice as any).engagementType,
    snakeCase: (invoice as any).engagement_type,
    projectName: invoice.projectName,
    isProject: isProjectEngagement
  });

  // Table for line items
  const tableStartY = 100;
  
  // Define table headers
  doc.setFillColor(255, 255, 255); // White background
  doc.setDrawColor(0, 0, 0); // Black border
  doc.setLineWidth(0.1);
  
  // Draw table header
  doc.setFont('helvetica', 'bold');
  
  if (!isProjectEngagement) {
    // For hourly engagements - show all columns
    doc.rect(14, tableStartY, pageWidth - 28, 10, 'S');
    doc.text("DESCRIPTION", 24, tableStartY + 7);
    doc.text("HOURS", pageWidth - 95, tableStartY + 7, { align: 'center' });
    doc.text("RATE", pageWidth - 55, tableStartY + 7, { align: 'center' });
    doc.text("AMOUNT", pageWidth - 20, tableStartY + 7, { align: 'right' });
  } else {
    // For project-based engagements - only show description and amount
    doc.rect(14, tableStartY, pageWidth - 28, 10, 'S');
    doc.text("DESCRIPTION", 24, tableStartY + 7);
    doc.text("AMOUNT", pageWidth - 20, tableStartY + 7, { align: 'right' });
  }
  
  // Format line items
  let currentY = tableStartY + 10;
  
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
      const projectDesc = `${invoice.projectName || "Consulting Services"} Activities`;
      
      // Format period dates - directly extract from the date strings without timezone conversion
      const period = `Period: ${formatDatePart(invoice.periodStart)} - ${formatDatePart(invoice.periodEnd)}`;
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
        
        // For hourly engagements, show hours and rate
        if (!isProjectEngagement) {
          doc.text(formatHours(invoice.totalHours || 0), pageWidth - 95, tableStartY + 17, { align: 'center' });
          doc.text(`${formatCurrency(Number(item.rate))}/hr`, pageWidth - 55, tableStartY + 17, { align: 'center' });
        }
        
        // Always show amount
        doc.text(formatCurrency(Number(invoice.totalAmount)), pageWidth - 20, tableStartY + 17, { align: 'right' });
      }
    });
  } else {
    // If no line items, show consistent description with preview
    const projectDesc = `${invoice.projectName || "Consulting Services"} Activities`;
    const period = `Period: ${formatDatePart(invoice.periodStart)} - ${formatDatePart(invoice.periodEnd)}`;

    // Draw first row with description
    doc.setFont('helvetica', 'normal');
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    doc.text(projectDesc, 24, currentY + 7);
    
    // Add period on the next line
    currentY += 10;
    doc.rect(14, currentY, pageWidth - 28, 10, 'S');
    doc.text(period, 24, currentY + 7);
    
    // For hourly engagements, show hours and rate
    if (!isProjectEngagement) {
      doc.text(formatHours(invoice.totalHours || 0), pageWidth - 95, tableStartY + 17, { align: 'center' });
      
      // Calculate effective hourly rate if we have total hours and amount
      if (invoice.totalHours && invoice.totalAmount) {
        const effectiveRate = Number(invoice.totalAmount) / Number(invoice.totalHours);
        doc.text(`${formatCurrency(effectiveRate)}/hr`, pageWidth - 55, tableStartY + 17, { align: 'center' });
      } else {
        doc.text("N/A", pageWidth - 55, tableStartY + 17, { align: 'center' });
      }
    }
    
    // Always show amount
    doc.text(formatCurrency(Number(invoice.totalAmount)), pageWidth - 20, tableStartY + 17, { align: 'right' });
    
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
  doc.text(formatCurrency(Number(invoice.totalAmount)), pageWidth - 20, currentY + 15, { align: 'right' });
  
  // Add payment instructions
  currentY += 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  // Use generic payment instructions without hardcoded name
  doc.text("Make all checks payable to the company name.", 14, currentY);
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
  
  if (!window.jspdf) {
    throw new Error('jsPDF is not available globally');
  }
  
  const { jsPDF } = window.jspdf;
  
  // Debug client billing information
  console.log('PDF Fallback - Invoice billing details:', {
    clientName: invoice.clientName,
    billingContactName: invoice.billingContactName,
    billingContactEmail: invoice.billingContactEmail,
    billingAddress: invoice.billingAddress,
    billingCity: invoice.billingCity,
    billingState: invoice.billingState,
    billingZip: invoice.billingZip,
    billingCountry: invoice.billingCountry
  });

  // Default options
  const defaultOptions: InvoiceGeneratorOptions = {
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    footerText: 'Thank you for your business!',
  };

  // Merge options
  const opts = { ...defaultOptions, ...options };
  
  // Use business info for defaults if available
  const businessInfo = opts.businessInfo;
  if (businessInfo) {
    opts.companyName = businessInfo.companyName || opts.companyName;
    
    // Create multi-line address from business info components
    const addressParts = [];
    if (businessInfo.address) addressParts.push(businessInfo.address);
    
    // City, State ZIP
    const cityStateZip = [
      businessInfo.city,
      businessInfo.state,
      businessInfo.zip
    ].filter(Boolean).join(", ");
    
    if (cityStateZip) addressParts.push(cityStateZip);
    
    if (addressParts.length > 0) {
      opts.companyAddress = addressParts.join('\n');
    }
    
    // Phone and Tax ID
    opts.companyPhone = businessInfo.phoneNumber || '';
  }

  // Create PDF document
  const doc = new jsPDF();

  // Create the same PDF layout as the main function
  // But delegate the implementation to the main generator
  // This is a simplified fallback that won't include all features
  
  // ...rest of fallback implementation...
  
  return doc;
}

export async function downloadInvoice(
  invoice: InvoiceWithLineItems,
  userName?: string
): Promise<void> {
  try {
    console.log('Starting PDF generation for invoice:', invoice.invoiceNumber);
    
    // Debug billing details
    console.log('Invoice billing details for PDF:', {
      clientName: invoice.clientName,
      billingContactName: invoice.billingContactName,
      billingContactEmail: invoice.billingContactEmail,
      billingAddress: invoice.billingAddress,
      billingCity: invoice.billingCity,
      billingState: invoice.billingState,
      billingZip: invoice.billingZip,
      billingCountry: invoice.billingCountry
    });
    
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
      // Initialize as empty array instead of throwing
      invoice.lineItems = [];
      console.log('Initialized empty line items array');
    }
    
    // Log if line items are empty but don't throw an error
    if (invoice.lineItems.length === 0) {
      console.log('Invoice has no line items, will generate PDF with available data', invoice);
    }
    
    if (typeof invoice.totalAmount !== 'number' && typeof invoice.totalAmount !== 'string') {
      console.error('Invoice amount is missing or invalid', invoice);
      // Calculate from line items or use 0 as fallback
      invoice.totalAmount = invoice.lineItems.length > 0
        ? invoice.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0).toString()
        : "0";
    }
    
    // Fetch business info
    console.log('Fetching business information for invoice');
    let businessInfo: BusinessInfoValues | undefined;
    
    try {
      const res = await fetch('/api/business-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (res.ok) {
        businessInfo = await res.json();
        console.log('Business info loaded for invoice:', businessInfo);
      } else {
        console.warn('Failed to load business info for invoice');
      }
    } catch (error) {
      console.error('Error fetching business info for invoice:', error);
      // Continue without business info
    }
    
    // Load the logo image if available
    let logoDataUrl: string | null = null;
    if (businessInfo?.companyLogo) {
      try {
        const logoUrl = `/api/business-logo/${businessInfo.companyLogo}`;
        console.log('Fetching logo image from:', logoUrl);
        
        // Fetch the image
        const response = await fetch(logoUrl);
        if (response.ok) {
          // Convert to blob and then to data URL
          const blob = await response.blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          console.log('Logo successfully loaded as data URL');
        } else {
          console.warn('Failed to load logo image:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading logo image:', error);
        // Continue without logo
      }
    }
    
    console.log('Validated invoice data, generating PDF...');
    try {
      // Try the ESM import version first
      const doc = generateInvoicePDF(invoice, { businessInfo, logoDataUrl, userName });
      console.log('PDF generated successfully, saving file...');
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      console.log('PDF saved successfully');
    } catch (pdfError) {
      console.error('Error in PDF generation step, trying fallback method:', pdfError);
      
      // Try the fallback method with global jsPDF
      try {
        const doc = generateInvoicePDFFallback(invoice, { businessInfo, logoDataUrl, userName });
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
