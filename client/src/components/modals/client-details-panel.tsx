import { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
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
  id: z.number().optional(),
  name: z.string().min(1, 'Client name is required'),
  billingContactName: z.string().optional().nullable(),
  billingContactEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
  userId: z.number().optional(), // Include userId for proper updates
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number | null;
}

export const ClientDetailsPanel = ({
  open,
  onOpenChange,
  clientId
}: ClientDetailsPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<ClientFormValues | null>(null);
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

  // Fetch client data when clientId changes or panel opens
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId || !open) return;
      
      setIsLoading(true);
      try {
        console.log(`Fetching client data for ID: ${clientId}`);
        const response = await fetch(`/api/clients/${clientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }
        
        const clientData = await response.json();
        console.log('Client data fetched:', clientData);
        setClient(clientData);
        
        // Reset form with client data, preserving the userId field
        form.reset({
          id: clientData.id,
          userId: clientData.userId, // Keep the userId
          name: clientData.name,
          billingContactName: clientData.billingContactName || '',
          billingContactEmail: clientData.billingContactEmail || '',
          billingAddress: clientData.billingAddress || '',
          billingCity: clientData.billingCity || '',
          billingState: clientData.billingState || '',
          billingZip: clientData.billingZip || '',
          billingCountry: clientData.billingCountry || '',
        });
      } catch (error) {
        console.error('Error fetching client:', error);
        toast({
          title: 'Error',
          description: 'Failed to load client details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchClientData();
    }
  }, [clientId, open, form, toast]);

  // Submit form data
  const onSubmit = async (data: ClientFormValues) => {
    if (!clientId) return;
    
    setIsLoading(true);
    setSubmitError(null);
    
    try {
      // Ensure empty strings are converted to null for database compatibility
      const formattedData = {
        ...data,
        billingContactName: data.billingContactName || null,
        billingContactEmail: data.billingContactEmail || null,
        billingAddress: data.billingAddress || null,
        billingCity: data.billingCity || null,
        billingState: data.billingState || null,
        billingZip: data.billingZip || null,
        billingCountry: data.billingCountry || null,
      };
      
      console.log('Submitting client data:', formattedData);
      
      const response = await apiRequest(
        'PUT',
        `/api/clients/${clientId}`,
        formattedData
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update client' }));
        throw new Error(errorData.message || 'Failed to update client');
      }

      // Get the updated client data (clone the response before using it)
      const clonedResponse = response.clone();
      const updatedClient = await clonedResponse.json().catch(() => null);
      console.log('Updated client data received:', updatedClient);
      
      if (updatedClient) {
        setClient(updatedClient);
      }

      // Success toast
      toast({
        title: 'Client updated',
        description: 'Client billing details have been successfully updated',
      });

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
      
      // Close the panel
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating client:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: 'Failed to update client details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Client Details</SheetTitle>
          <SheetDescription>
            View and edit client billing information
          </SheetDescription>
        </SheetHeader>

        {isLoading && !client ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Loading client information...</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly 
                        className="bg-slate-50 cursor-not-allowed" 
                      />
                    </FormControl>
                    <FormDescription>
                      Client name cannot be changed here
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Billing Information</h3>
                
                <FormField
                  control={form.control}
                  name="billingContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
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
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ''} />
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
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
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
                          <Input {...field} value={field.value || ''} />
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
                          <Input {...field} value={field.value || ''} />
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
                          <Input {...field} value={field.value || ''} />
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
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {submitError && (
                <div className="text-sm font-medium text-destructive">
                  {submitError}
                </div>
              )}

              <SheetFooter>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClientDetailsPanel; 