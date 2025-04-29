import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation, Redirect } from "wouter";
import LoginForm from "@/components/layout/login-form";
import SignupForm from "@/components/layout/signup-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Extract tab from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    if (tab === "register") {
      setActiveTab("register");
    }
  }, [location]);

  // If already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-gray-600 mt-2">
                  Sign in to access your account
                </p>
              </div>
              <LoginForm />
              <div className="text-center mt-6 text-sm">
                <p>
                  Don't have an account?{" "}
                  <button 
                    className="text-primary-600 font-medium hover:underline"
                    onClick={() => setActiveTab("register")}
                  >
                    Register here
                  </button>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Start your free trial
                </h2>
                <p className="text-gray-600 mt-2">
                  No credit card required. Try Contrack free for 14 days.
                </p>
              </div>
              <SignupForm />
              <div className="text-center mt-6 text-sm">
                <p>
                  Already have an account?{" "}
                  <button 
                    className="text-primary-600 font-medium hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Login here
                  </button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
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