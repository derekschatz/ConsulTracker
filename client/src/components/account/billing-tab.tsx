import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AlertCircle, CreditCard, ExternalLink, CalendarDays } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BillingTab = () => {
  const { subscriptionStatus, isSubscriptionActive, tier } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Format the next billing date with proper handling of invalid dates
  const formatNextBillingDate = (dateValue: Date | string | undefined): string => {
    if (!dateValue) return 'Not available';
    
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Format the date with month name, day, and year
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Error processing date';
    }
  };

  const handleManageBilling = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create portal session';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Portal session error details:', errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get the text response
          const errorText = await response.text();
          console.error('Portal session error response:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      const error = err as Error;
      console.error('Error redirecting to customer portal:', error);
      toast({
        title: 'Billing Portal Error',
        description: 
          <div>
            {error.message || 'Unable to access billing portal'}. 
            <Button variant="link" className="p-0 h-auto" onClick={() => window.location.href = "mailto:support@contraq.com"}>
              Contact support
            </Button>
          </div>,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Current Plan</h3>
            <p className="text-sm text-muted-foreground">
              You are currently on the <span className="font-medium capitalize">{tier}</span> plan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSubscriptionActive ? (
              <Button
                onClick={handleManageBilling}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {isLoading ? 'Loading...' : 'Manage Billing'}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button variant="default" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Upgrade Now
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isSubscriptionActive ? (
          <div className="rounded-md border p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Subscription Details</div>
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className="capitalize">{subscriptionStatus?.status || 'active'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium">Plan:</span>
                  <span className="capitalize">{tier}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Next billing date:
                  </span>
                  <span>{formatNextBillingDate(subscriptionStatus?.renewalDate)}</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <Alert variant="default" className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Free Plan</AlertTitle>
            <AlertDescription>
              You're currently on the free plan with limited features.
              <Link href="/pricing">
                <Button variant="link" className="p-0 h-auto font-normal ml-1">
                  Upgrade to access premium features <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default BillingTab; 