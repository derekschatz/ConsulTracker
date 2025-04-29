import { Route, Router, Switch, Redirect } from "wouter";
import Dashboard from "./components/dashboard/dashboard";
import TimeLogs from "./components/time-logs/time-logs";
import Engagements from "./components/engagements/engagements";
import Invoices from "./components/invoices/invoices";
import Shell from "./components/layout/shell";
import AuthPage from "./pages/auth-page";
import LandingPage from "./pages/landing-page";
import ForgotPasswordPage from "./pages/forgot-password-page";
import ResetPasswordPage from "./pages/reset-password-page";
import Home from "./pages/Home";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { ProtectedWrapper } from "./lib/protected-route";
import { ThemeProvider } from "next-themes";

// Authenticated route that redirects to login if not authenticated
const AuthenticatedRoute = ({ component: Component, ...rest }: any) => {
  const { user } = useAuth();
  return user ? <Component {...rest} /> : <Redirect to="/login" />;
};

// Public only route that redirects to dashboard if authenticated
const PublicOnlyRoute = ({ component: Component, ...rest }: any) => {
  const { user } = useAuth();
  return user ? <Redirect to="/dashboard" /> : <Component {...rest} />;
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
              <Route path="/hero-demo">
                <Home />
              </Route>
              <Route path="/">
                <PublicOnlyRoute component={LandingPage} />
              </Route>
              <ProtectedWrapper>
                <Shell>
                  <Switch>
                    <Route path="/dashboard" component={Dashboard} />
                    <Route path="/time-logs" component={TimeLogs} />
                    <Route path="/engagements" component={Engagements} />
                    <Route path="/invoices" component={Invoices} />
                    <Route>
                      <Redirect to="/dashboard" />
                    </Route>
                  </Switch>
                </Shell>
              </ProtectedWrapper>
            </Switch>
          </Router>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
