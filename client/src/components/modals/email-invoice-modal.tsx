import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { emailService } from "@/lib/email-service";
import { InvoiceWithLineItems } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Form schema for email
const formSchema = z.object({
  to: z.string().email({ message: "Please enter a valid email address" }),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailInvoiceModalProps {
  invoice: InvoiceWithLineItems | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EmailInvoiceModal = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: EmailInvoiceModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: "",
    },
  });

  // Reset form when modal closes
  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Submit form data
  const onSubmit = async (data: FormValues) => {
    if (!invoice) return;

    try {
      setIsSubmitting(true);
      toast({
        title: 'Preparing Invoice',
        description: 'Generating PDF and opening your email client...',
      });

      // Open system email client with invoice
      await emailService.openEmailWithInvoice(
        invoice,
        data.to
      );

      // Success toast
      toast({
        title: 'Email Ready',
        description: 'Your default email client has been opened with the invoice attached.',
      });

      // Close modal and reset form
      handleClose();
      
      // Trigger success callback
      onSuccess();
    } catch (error: any) {
      console.error('Error preparing invoice email:', error);
      
      // Provide a more detailed error message
      const errorMessage = error.message || 'Failed to prepare invoice email. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Email Invoice #{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Open Email Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailInvoiceModal;
