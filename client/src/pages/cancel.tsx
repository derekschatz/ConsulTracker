"use client";

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

const CancelPage = () => {
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">Checkout Canceled</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your payment was not processed. You have not been charged.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              If you have any questions or need assistance, please contact our support team.
            </p>
            <div className="mt-6 space-y-3">
              <Button 
                onClick={() => navigate("/pricing")}
                variant="outline"
                className="w-full border-primary-600 text-primary-600 hover:bg-primary-50 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Pricing
              </Button>
              <Button 
                onClick={() => navigate("/contact")}
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-900"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelPage; 