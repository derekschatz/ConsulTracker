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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/engagements" component={Engagements} />
      <Route path="/time-logs" component={TimeLogs} />
      <Route path="/invoices" component={Invoices} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <Router />
      </Shell>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
