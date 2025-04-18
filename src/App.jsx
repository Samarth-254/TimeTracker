import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import TimeEntriesPage from "./pages/time-entries-page";
import LeaveManagementPage from "./pages/leave-management-page";
import ExportPage from "./pages/export-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/time-entries" component={TimeEntriesPage} />
      <ProtectedRoute path="/leave-management" component={LeaveManagementPage} />
      <ProtectedRoute path="/export" component={ExportPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
