"use client";

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

const SuccessPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [_, navigate] = useLocation();

  useEffect(() => {
    // Trigger confetti animation on successful checkout
    const triggerConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#6366F1']
      });
    };

    triggerConfetti();
    
    // Get session ID from URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    // Verify the session if session ID exists
    if (sessionId) {
      const verifySession = async () => {
        try {
          // Use the new Stripe API endpoint
          const apiUrl = `${window.location.origin}/api/stripe/verify-session?session_id=${sessionId}`;
          console.log('Verifying session at:', apiUrl);
          
          const response = await fetch(apiUrl, {
            credentials: 'include',
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error:', response.status, errorText);
            setError(`Verification failed (${response.status})`);
            setIsLoading(false);
            return;
          }
          
          const data = await response.json();

          if (response.ok) {
            console.log('Session verified:', data);
            setSessionData(data);
          } else {
            setError(data.error || "Failed to verify payment session");
          }
        } catch (err) {
          console.error('Error during verification:', err);
          setError("An error occurred while verifying your payment");
        } finally {
          setIsLoading(false);
        }
      };

      verifySession();
    } else {
      setError("No session ID provided");
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-700">Verifying your subscription...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Payment verification failed</h2>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <Button 
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-primary-600 hover:bg-primary-700"
                >
                  Return to pricing
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Payment successful!</h2>
              <p className="mt-2 text-sm text-gray-500">
                Thank you for subscribing to Contraq. Your subscription is now active.
              </p>
              {sessionData && sessionData.customerDetails && (
                <div className="mt-4 text-left rounded-md bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-900">Subscription details</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Plan: {sessionData.plan || "Contraq"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Email: {sessionData.customerDetails.email}
                  </p>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessPage; 