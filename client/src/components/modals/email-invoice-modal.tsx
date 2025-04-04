import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/lib/email-service';
import { formatCurrency } from '@/lib/format-utils';

const formSchema = z.object({
  to: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

const EmailInvoiceModal = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: EmailInvoiceModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: '',
      subject: invoice ? emailService.generateDefaultSubject(invoice) : '',
      message: invoice ? emailService.generateDefaultMessage(invoice) : '',
    },
  });

  // Update form values when invoice changes
  useState(() => {
    if (invoice) {
      reset({
        to: '',
        subject: emailService.generateDefaultSubject(invoice),
        message: emailService.generateDefaultMessage(invoice),
      });
    }
  });

  // Handle modal close and reset form
  const handleClose = () => {
    reset();
    onClose();
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    if (!invoice) return;

    try {
      setIsSubmitting(true);

      // Send email
      const response = await emailService.sendInvoice(
        invoice,
        data.to,
        data.subject,
        data.message
      );

      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }

      // Success toast
      toast({
        title: 'Invoice sent',
        description: `Invoice has been sent to ${data.to}`,
      });

      // Close modal and reset form
      handleClose();
      
      // Trigger success callback
      onSuccess();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invoice',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Email Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="invoiceInfo" className="text-sm font-medium text-slate-700">
                Invoice Information
              </Label>
              <div className="text-sm p-3 bg-slate-50 rounded-md">
                <p className="font-medium">{invoice.invoiceNumber}</p>
                <p>{invoice.clientName}</p>
                <p>{formatCurrency(invoice.amount)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="to" className="text-sm font-medium text-slate-700">
                Recipient Email
              </Label>
              <Input
                id="to"
                type="email"
                placeholder="client@example.com"
                {...register('to')}
                className={errors.to ? 'border-red-500' : ''}
              />
              {errors.to && (
                <span className="text-xs text-red-500">{errors.to.message}</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="subject" className="text-sm font-medium text-slate-700">
                Subject
              </Label>
              <Input
                id="subject"
                placeholder="Invoice subject"
                {...register('subject')}
                className={errors.subject ? 'border-red-500' : ''}
              />
              {errors.subject && (
                <span className="text-xs text-red-500">{errors.subject.message}</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                Message
              </Label>
              <Textarea
                id="message"
                rows={6}
                placeholder="Enter message"
                {...register('message')}
                className={errors.message ? 'border-red-500' : ''}
              />
              {errors.message && (
                <span className="text-xs text-red-500">{errors.message.message}</span>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailInvoiceModal;
