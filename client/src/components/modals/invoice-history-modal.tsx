import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReceiptIcon from '@/components/icons/receipt-icon';

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
}

const InvoiceHistoryModal = ({
  isOpen,
  onClose,
  clientName,
}: InvoiceHistoryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon size={20} className="text-blue-500" />
            Invoice History: {clientName}
          </DialogTitle>
          <DialogDescription>
            View historical invoices and their payment status
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <ReceiptIcon size={40} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Invoice History Coming Soon</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            This feature will allow you to view all historical invoices for this client, their status, and total amounts.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceHistoryModal;