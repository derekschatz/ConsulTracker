import { Route, Router, Switch, Redirect } from "wouter";
import Dashboard from "./components/dashboard/dashboard";
import TimeLogs from "./components/time-logs/time-logs";
import Engagements from "./components/engagements/engagements";
import Invoices from "./components/invoices/invoices";
import Shell from "./components/layout/shell";
import AuthPage from "./pages/auth-page";
import LandingPage from "./pages/landing-page";
import PricingPage from "./pages/pricing-page";
import ForgotPasswordPage from "./pages/forgot-password-page";
import ResetPasswordPage from "./pages/reset-password-page";
import Home from "./pages/Home";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { SubscriptionProvider, useSubscription } from "./hooks/use-subscription";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { ProtectedWrapper } from "./lib/protected-route";
import { ThemeProvider } from "next-themes";
import AccountSettings from "./components/account/account-settings";

// Authenticated route that redirects to login if not authenticated
const AuthenticatedRoute = ({ component: Component, ...rest }: any) => {
  const { user } = useAuth();
  return user ? <Component {...rest} /> : <Redirect to="/login" />;
};

// Public only route that redirects to dashboard if authenticated
const PublicOnlyRoute = ({ component: Component, ...rest }: any) => {
  const { user } = useAuth();
  const { isPro, isTeam } = useSubscription();
  
  // If authenticated, redirect to appropriate homepage based on subscription
  if (user) {
    return (isPro || isTeam) ? <Redirect to="/dashboard" /> : <Redirect to="/engagements" />;
  }
  
  // Not authenticated, show the component
  return <Component {...rest} />;
};

// Pro subscription route that redirects Solo users to engagements
const ProSubscriptionRoute = ({ component: Component, ...rest }: any) => {
  const { isPro, isTeam, isLoading } = useSubscription();
  
  // During loading, we don't want to redirect yet
  if (isLoading) {
    return <div>Loading subscription details...</div>;
  }
  
  // Only allow access if user has Pro or Team subscription
  return (isPro || isTeam) ? <Component {...rest} /> : <Redirect to="/engagements" />;
};

// Route handler for the root path that redirects based on subscription
const RootRouteHandler = () => {
  const { user } = useAuth();
  const { isPro, isTeam, isLoading } = useSubscription();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (isLoading) {
    return <div>Loading subscription details...</div>;
  }
  
  return (isPro || isTeam) ? <Redirect to="/dashboard" /> : <Redirect to="/engagements" />;
};

function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  // Add a small delay to ensure auth is initialized
  useEffect(() => {
    console.log("App initializing...");
    const timer = setTimeout(() => {
      console.log("App ready");
      setIsAppReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isAppReady) {
    return <div>Loading application...</div>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SubscriptionProvider>
            <Router>
              <Switch>
                <Route path="/login">
                  <AuthPage />
                </Route>
                <Route path="/forgot-password">
                  <ForgotPasswordPage />
                </Route>
                <Route path="/reset-password">
                  <ResetPasswordPage />
                </Route>
                <Route path="/pricing">
                  <PricingPage />
                </Route>
                <Route path="/hero-demo">
                  <Home />
                </Route>
                <Route path="/">
                  <PublicOnlyRoute component={LandingPage} />
                </Route>
                <ProtectedWrapper>
                  <Shell>
                    <Switch>
                      <Route path="/dashboard">
                        <ProSubscriptionRoute component={Dashboard} />
                      </Route>
                      <Route path="/time-logs" component={TimeLogs} />
                      <Route path="/engagements" component={Engagements} />
                      <Route path="/invoices" component={Invoices} />
                      <Route path="/account/settings" component={AccountSettings} />
                      <Route path="/">
                        <RootRouteHandler />
                      </Route>
                      <Route>
                        <Redirect to="/engagements" />
                      </Route>
                    </Switch>
                  </Shell>
                </ProtectedWrapper>
              </Switch>
            </Router>
            <Toaster />
          </SubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
