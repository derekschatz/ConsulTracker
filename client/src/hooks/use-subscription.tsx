import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { useAuth } from "./use-auth";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  tier: 'solo' | 'pro' | 'team';
  subscriptionId?: string;
  renewalDate?: Date;
  status?: string;
}

type SubscriptionContextType = {
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  isSubscriptionActive: boolean;
  tier: 'solo' | 'pro' | 'team';
  isPro: boolean;
  isTeam: boolean;
  isSolo: boolean;
  refetch: () => Promise<SubscriptionStatus | null>;
};

const defaultSubscription: SubscriptionStatus = {
  hasActiveSubscription: false,
  tier: 'solo'
};

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const {
    data: subscriptionStatus,
    error,
    isLoading,
    refetch
  } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/stripe/subscription-status", user?.id],
    queryFn: async ({ queryKey }) => {
      console.log("Fetching subscription status for user:", user?.id);
      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });
      
      console.log("Subscription status response:", response.status, response.statusText);
      
      // Check content type to help debug HTML responses
      const contentType = response.headers.get("content-type");
      console.log("Response content type:", contentType);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("Subscription error response body:", text);
        throw new Error(`Failed to fetch subscription status: ${response.status} ${response.statusText}`);
      }
      
      try {
        const responseText = await response.text();
        console.log("Response first 100 chars:", responseText.substring(0, 100));
        
        // Check if it looks like HTML
        if (responseText.trim().startsWith("<!DOCTYPE html>") || responseText.trim().startsWith("<html")) {
          console.error("Received HTML instead of JSON:", responseText);
          // Return default subscription status
          return defaultSubscription;
        }
        
        // Try to parse as JSON
        return JSON.parse(responseText);
      } catch (err) {
        console.error("Error parsing subscription response:", err);
        // Return default subscription status on parse error
        return defaultSubscription;
      }
    },
    enabled: !!user, // Only fetch if user is authenticated
    // Default to solo tier if there's no data
    placeholderData: defaultSubscription,
    // Retry with exponential backoff
    retry: 2,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000)
  });

  // Computed properties for convenient access
  const isSubscriptionActive = subscriptionStatus?.hasActiveSubscription || false;
  const tier = subscriptionStatus?.tier || 'solo';
  const isPro = tier === 'pro';
  const isTeam = tier === 'team';
  const isSolo = tier === 'solo';

  // Return Promise<SubscriptionStatus | null> for refetch
  const refetchSubscription = async (): Promise<SubscriptionStatus | null> => {
    try {
      const result = await refetch();
      return result.data ?? null;
    } catch (error) {
      console.error("Error refetching subscription status:", error);
      return null;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus: subscriptionStatus ?? null,
        isLoading,
        error,
        isSubscriptionActive,
        tier,
        isPro,
        isTeam,
        isSolo,
        refetch: refetchSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
} 