import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { InvoiceWithLineItems } from "@shared/schema";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { formatCurrency } from "@/lib/format-utils";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  } | null>(null);
  
  const { toast } = useToast();

  // Reset state when the modal closes
  useEffect(() => {
    if (!open) {
      setPreviewData(null);
    } else if (invoice) {
      generatePreview();
    }
  }, [open, invoice]);

  // Function to format a date for display
  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate a visual preview of the invoice instead of using PDF
  const generatePreview = async () => {
    if (!invoice) return;

    try {
      setIsLoading(true);
      
      // Extract the data we need for the preview
      setPreviewData({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        projectName: invoice.projectName || 'Consulting Services',
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        amount: formatCurrency(invoice.amount),
        totalHours: invoice.totalHours || 0,
        periodStart: formatDate(invoice.periodStart),
        periodEnd: formatDate(invoice.periodEnd)
      });
    } catch (error: any) {
      console.error("Error generating invoice preview:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice preview",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!invoice) return;
    
    try {
      // Generate PDF document specifically for download
      const doc = generateInvoicePDF(invoice);
      const downloadFileName = `Invoice-${invoice.invoiceNumber}.pdf`;
      doc.save(downloadFileName);
      
      toast({
        title: "Download started",
        description: "The invoice PDF download has started.",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download the invoice",
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
      // We'll need to implement this in the parent component
      window.dispatchEvent(new CustomEvent('openEmailModal', { 
        detail: { invoiceId: invoice.id }
      }));
    } catch (error) {
      console.error("Error preparing email:", error);
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
          {isLoading ? (
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
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
                    <div className="mt-2 text-gray-600">
                      <p className="font-semibold">Agile Infusion, LLC</p>
                      <p>100 Danby Court</p>
                      <p>Churchville, PA 18966</p>
                      <p>bobschatz@agileinfusion.com</p>
                      <p>(215) 435-3240</p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <div className="text-gray-700">
                      <p className="font-semibold">Invoice #{previewData.invoiceNumber}</p>
                      <p>Date: {previewData.issueDate}</p>
                      <p>Due Date: {previewData.dueDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Info and Project */}
              <div className="p-6 border-b">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To:</h3>
                    <p className="text-gray-700 font-medium">{previewData.clientName}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">For:</h3>
                    <p className="text-gray-700">{previewData.projectName}</p>
                    <p className="text-gray-700">Period: {previewData.periodStart} - {previewData.periodEnd}</p>
                  </div>
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
                          {previewData.totalHours.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 border-t text-right">
                          {previewData.amount}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
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
                <p>Make all checks payable to Derek Schatz.</p>
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