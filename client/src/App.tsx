import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Authorizations from "@/pages/authorizations";

import Documents from "@/pages/documents";
import Reports from "@/pages/reports";
import Audit from "@/pages/audit";
import AppLogs from "@/pages/app-logs";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import ImportPage from "@/pages/import";
import Insurance from "@/pages/insurance";

import PriorAuthGenerator from "@/pages/prior-auth-generator";
import ExternalConnections from "@/pages/external-connections";
import NotFound from "@/pages/not-found";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  return <MainLayout>{children}</MainLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/patients">
        <ProtectedRoute>
          <Patients />
        </ProtectedRoute>
      </Route>
      <Route path="/authorizations">
        <ProtectedRoute>
          <Authorizations />
        </ProtectedRoute>
      </Route>

      <Route path="/documents">
        <ProtectedRoute>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/audit">
        <ProtectedRoute>
          <Audit />
        </ProtectedRoute>
      </Route>
      <Route path="/app-logs">
        <ProtectedRoute>
          <AppLogs />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/import">
        <ProtectedRoute>
          <ImportPage />
        </ProtectedRoute>
      </Route>

      <Route path="/insurance">
        <ProtectedRoute>
          <Insurance />
        </ProtectedRoute>
      </Route>

      <Route path="/external-connections">
        <ProtectedRoute>
          <ExternalConnections />
        </ProtectedRoute>
      </Route>

      <Route path="/prior-auth-generator">
        <ProtectedRoute>
          <PriorAuthGenerator />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
