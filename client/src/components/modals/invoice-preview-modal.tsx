import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { InvoiceWithLineItems } from "@shared/schema";
import { generateInvoicePDF, downloadInvoice } from "@/lib/pdf-generator";
import { formatCurrency, formatHours } from "@/lib/format-utils";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface InvoicePreviewModalProps {
  invoice: InvoiceWithLineItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoicePreviewModal = ({
  invoice,
  open,
  onOpenChange,
}: InvoicePreviewModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    // Store invoice details for the preview card
    invoiceNumber: string;
    clientName: string;
    projectName: string;
    issueDate: string;
    dueDate: string;
    amount: string;
    totalHours: number;
    periodStart: string;
    periodEnd: string;
    status: string;
    rate?: string;
    billingContactName?: string;
    billingContactEmail?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
    billingCountry?: string;
  } | null>(null);
  
  const { toast } = useToast();
  // Fetch business info for the invoice preview
  const { data: businessInfo, isLoading: isLoadingBusinessInfo } = useBusinessInfo();
  // Get the current user information
  const { user } = useAuth();

  // Function to get status badge variant based on invoice status
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'outline';
      case 'pending':
        return 'secondary';
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Function to format a date for display
  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    
    // Use the same approach as in the PDF generator
    const str = typeof date === 'string' ? date : date.toISOString();
    const datePart = str.substring(0, 10); // Get YYYY-MM-DD part
    const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[month-1]} ${day}, ${year}`;
  };

  // Generate a visual preview of the invoice instead of using PDF
  // Using useCallback to memoize the function and avoid dependency cycles
  const generatePreview = useCallback(async () => {
    if (!invoice) return;

    try {
      setIsLoading(true);
      
      // Format dates
      const formattedPeriodStart = formatDate(invoice.periodStart);
      const formattedPeriodEnd = formatDate(invoice.periodEnd);
      
      // Get rate from the first line item if available
      let rate = '';
      if (invoice.lineItems && invoice.lineItems.length > 0 && invoice.lineItems[0].rate) {
        rate = formatCurrency(Number(invoice.lineItems[0].rate)) + '/hr';
      } else if (invoice.totalHours && invoice.totalAmount) {
        // Calculate effective hourly rate from total amount and hours
        const effectiveRate = Number(invoice.totalAmount) / Number(invoice.totalHours);
        rate = formatCurrency(effectiveRate) + '/hr';
      }
      
      // Extract the data we need for the preview
      setPreviewData({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        projectName: invoice.projectName || 'Consulting Services',
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        amount: formatCurrency(invoice.totalAmount),
        totalHours: invoice.totalHours || 0,
        periodStart: formattedPeriodStart,
        periodEnd: formattedPeriodEnd,
        status: invoice.status || 'Draft',
        rate,
        billingContactName: invoice.billingContactName || undefined,
        billingContactEmail: invoice.billingContactEmail || undefined,
        billingAddress: invoice.billingAddress || undefined,
        billingCity: invoice.billingCity || undefined,
        billingState: invoice.billingState || undefined,
        billingZip: invoice.billingZip || undefined,
        billingCountry: invoice.billingCountry || undefined
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice preview",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [invoice, toast, onOpenChange, formatDate]);

  // Reset state when the modal closes
  useEffect(() => {
    if (!open) {
      setPreviewData(null);
    } else if (invoice) {
      generatePreview();
    }
  }, [open, invoice, generatePreview]);

  const handleDownload = () => {
    if (!invoice) return;
    
    try {
      // Use the shared downloadInvoice function for consistency
      // Pass the user's name to the PDF generator
      downloadInvoice(invoice, user?.name || undefined);
      
      toast({
        title: "Download started",
        description: "The invoice PDF download has started.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download the invoice",
        variant: "destructive",
      });
    }
  };

  const handleEmailInvoice = async () => {
    if (!invoice) return;
    
    try {
      // Close the preview modal first
      onOpenChange(false);
      
      // Notify the parent to open the email modal
      window.dispatchEvent(new CustomEvent('openEmailModal', { 
        detail: { invoiceId: invoice.id }
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare email",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            {invoice ? `Invoice #${invoice.invoiceNumber}` : "Invoice Preview"}
          </DialogTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmailInvoice}
              disabled={!invoice || isLoading}
            >
              Email Invoice
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleDownload}
              disabled={!invoice || isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-slate-100 rounded-md p-4">
          {isLoading || isLoadingBusinessInfo ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Generating preview...</p>
              </div>
            </div>
          ) : previewData ? (
            <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
              {/* Invoice Header */}
              <div className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-start">
                  {/* Company Logo - Centered at top */}
                  <div className="w-1/3">
                    {/* Placeholder for left side */}
                  </div>
                  
                  {/* Logo in center */}
                  <div className="flex justify-center items-center w-1/3">
                    {businessInfo?.companyLogo && (
                      <div className="max-w-[160px] max-h-[80px]">
                        <img 
                          src={`/api/business-logo/${businessInfo.companyLogo}`}
                          alt="Company logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Invoice details at top right */}
                  <div className="text-right w-1/3">
                    <div className="text-gray-700">
                      <div className="flex justify-end items-center gap-2 mb-1">
                        <p className="font-semibold">Invoice #{previewData.invoiceNumber}</p>
                        <Badge variant={getStatusVariant(previewData.status)} className="ml-2">
                          {previewData.status}
                        </Badge>
                      </div>
                      <p>Date: {previewData.issueDate}</p>
                      <p>Due Date: {previewData.dueDate}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex flex-col items-start">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {user?.name || businessInfo?.companyName || "INVOICE"}
                    </h2>
                    {/* Company Information - Reduced spacing */}
                    <div className="mt-1 text-gray-600 text-sm">
                      {businessInfo?.companyName && (
                        <p className="font-medium">{businessInfo.companyName}</p>
                      )}
                      {businessInfo?.address && (
                        <p>{businessInfo.address}</p>
                      )}
                      {/* City, State ZIP on one line if available */}
                      {(businessInfo?.city || businessInfo?.state || businessInfo?.zip) && (
                        <p>
                          {[
                            businessInfo.city,
                            businessInfo.state,
                            businessInfo.zip
                          ].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {businessInfo?.phoneNumber && (
                        <p>Phone: {businessInfo.phoneNumber}</p>
                      )}
                      {businessInfo?.taxId && (
                        <p>Tax ID: {businessInfo.taxId}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To section - Reduced spacing with company details */}
              <div className="p-4 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">BILL TO:</h3>
                    <p className="font-semibold text-gray-800">{previewData.clientName}</p>
                    {previewData.billingContactName && (
                      <p>ATTN: {previewData.billingContactName}</p>
                    )}
                    {previewData.billingAddress && (
                      <p>{previewData.billingAddress}</p>
                    )}
                    {/* City, State ZIP on one line if available */}
                    {(previewData.billingCity || previewData.billingState || previewData.billingZip) && (
                      <p>
                        {[
                          previewData.billingCity,
                          previewData.billingState,
                          previewData.billingZip
                        ].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {previewData.billingCountry && (
                      <p>{previewData.billingCountry}</p>
                    )}
                    {previewData.billingContactEmail && (
                      <p>{previewData.billingContactEmail}</p>
                    )}
                  </div>
                  {/* Period information will be shown in the invoice summary table */}
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="p-6 border-b">
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-4">Invoice Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-2 px-4 font-semibold text-gray-600">Description</th>
                        <th className="py-2 px-4 font-semibold text-gray-600 text-right">Hours</th>
                        <th className="py-2 px-4 font-semibold text-gray-600 text-right">Rate</th>
                        <th className="py-2 px-4 font-semibold text-gray-600 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-4 px-4 border-t">
                          Consultant {previewData.projectName} Activities<br />
                          <span className="text-sm text-gray-500">
                            Period: {previewData.periodStart} - {previewData.periodEnd}
                          </span>
                        </td>
                        <td className="py-4 px-4 border-t text-right">
                          {formatHours(previewData.totalHours)}
                        </td>
                        <td className="py-4 px-4 border-t text-right">
                          {previewData.rate || 'N/A'}
                        </td>
                        <td className="py-4 px-4 border-t text-right">
                          {previewData.amount}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-4 px-4 border-t"></td>
                        <td className="py-4 px-4 border-t"></td>
                        <td className="py-4 px-4 border-t text-right font-semibold">Total:</td>
                        <td className="py-4 px-4 border-t text-right font-bold">
                          {previewData.amount}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="p-6 text-sm text-gray-600">
                <p>Make all checks payable to the company name.</p>
                <p>Total due in 30 days.</p>
                <p className="mt-4 text-center text-gray-500">Thank you for your business!</p>
              </div>
            </div>
          ) : invoice ? (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <FileText className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No preview available</h3>
              <p className="text-center text-slate-600 mb-6 max-w-md">
                The invoice preview couldn't be generated. You can download the invoice as a PDF instead.
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Invoice PDF
              </Button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p>No invoice selected</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewModal;