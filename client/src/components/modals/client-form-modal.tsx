import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import { useQueryClient } from '@tanstack/react-query';

// Create a schema for client form validation
const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  billingContactName: z.string().optional().nullable(),
  billingContactEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
}

export function ClientFormModal({
  open,
  onOpenChange,
  onClientCreated
}: ClientFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      billingContactName: '',
      billingContactEmail: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
      billingCountry: '',
    }
  });

  // Submit form data
  const onSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    setSubmitError(null);
    
    try {
      // Prepare the data for API
      const formattedData = {
        ...data,
        billingContactName: data.billingContactName || '',
        billingContactEmail: data.billingContactEmail || '',
        billingAddress: data.billingAddress || '',
        billingCity: data.billingCity || '',
        billingState: data.billingState || '',
        billingZip: data.billingZip || '',
        billingCountry: data.billingCountry || ''
      };
      
      const response = await apiRequest(
        'POST',
        '/api/clients',
        formattedData
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create client' }));
        throw new Error(errorData.message || 'Failed to create client');
      }

      // Success toast
      toast({
        title: 'Client created',
        description: 'New client has been successfully created',
      });

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
      
      // Reset form
      form.reset();
      
      // Close the modal
      onOpenChange(false);
      
      // Call the callback if provided
      if (onClientCreated) {
        onClientCreated();
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setSubmitError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
          <DialogDescription>
            Add a new client with their billing information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter client name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Billing Information</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="billingContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Contact Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Contact person name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="contact@example.com" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Street address" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="City" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billingState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="State/Province" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/ZIP Code</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="Postal/ZIP Code" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billingCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="Country" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <div className="text-red-500 text-sm mt-2">
                {submitError}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 