import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Shell from "@/components/layout/shell";
import Dashboard from "@/components/dashboard/dashboard";
import Engagements from "@/components/engagements/engagements";
import TimeLogs from "@/components/time-logs/time-logs";
import Invoices from "@/components/invoices/invoices";
import AuthPage from "@/pages/auth-page";
import AccountSettings from "@/components/account/account-settings";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/engagements" component={Engagements} />
      <ProtectedRoute path="/time-logs" component={TimeLogs} />
      <ProtectedRoute path="/invoices" component={Invoices} />
      <ProtectedRoute path="/account/settings" component={AccountSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Shell>
          <Router />
        </Shell>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
