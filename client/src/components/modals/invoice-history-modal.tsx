import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  engagement?: {
    id: number;
    clientName: string;
    projectName: string;
  };
}

const InvoiceHistoryModal = ({
  isOpen,
  onClose,
  engagement,
}: InvoiceHistoryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invoice History</DialogTitle>
          <DialogDescription>
            {engagement ? `${engagement.clientName} - ${engagement.projectName}` : 'No engagement selected'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-slate-600 mb-4">Invoice history feature coming soon!</p>
          <p className="text-sm text-slate-500">
            This will display all invoices related to this engagement.
          </p>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceHistoryModal;