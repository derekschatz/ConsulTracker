import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { InvoiceWithLineItems } from "@shared/schema";
import { generateInvoiceDataUrl } from "@/lib/pdf-generator";
import { Download } from "lucide-react";
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && invoice) {
      generatePdf();
    } else {
      // Clean up when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  }, [open, invoice]);

  const generatePdf = async () => {
    if (!invoice) return;

    try {
      setIsLoading(true);
      // Generate PDF data URL
      const dataUrl = generateInvoiceDataUrl(invoice);
      setPdfUrl(dataUrl);
    } catch (error: any) {
      console.error("Error generating PDF preview:", error);
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
      const link = document.createElement("a");
      if (pdfUrl) {
        link.href = pdfUrl;
        link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download the invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            {invoice ? `Invoice #${invoice.invoiceNumber}` : "Invoice Preview"}
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            disabled={!pdfUrl || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-slate-100 rounded-md">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Generating preview...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={invoice ? `Invoice #${invoice.invoiceNumber}` : "Invoice Preview"}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p>No preview available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewModal; 