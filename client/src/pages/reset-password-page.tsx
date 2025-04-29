import { Link, useLocation } from "wouter";
import ResetPasswordForm from "@/components/layout/reset-password-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  
  // Extract token from URL query string
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    setToken(tokenParam);
  }, [location]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="py-8 px-4">
          <Link href="/" className="flex items-center w-fit">
            <div className="bg-primary-600 text-white p-2 rounded-md mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Contrack</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Invalid Reset Link</h2>
              <p className="text-gray-600 mt-2">
                The reset link you're trying to use is missing a token.
              </p>
            </div>
            
            <Button asChild className="w-full">
              <Link href="/forgot-password">
                Request New Reset Link
              </Link>
            </Button>
          </div>
        </div>

        <div className="py-6 text-center bg-gray-50">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Contrack. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="py-8 px-4">
        <Link href="/" className="flex items-center w-fit">
          <div className="bg-primary-600 text-white p-2 rounded-md mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">Contrack</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-gray-600 mt-2">
              Enter your new password below
            </p>
          </div>
          
          <ResetPasswordForm token={token} />
        </div>
      </div>

      <div className="py-6 text-center bg-gray-50">
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} Contrack. All rights reserved.
        </p>
      </div>
    </div>
  );
} 