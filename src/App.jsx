import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Clients from "@/pages/Clients";
import Projects from "@/pages/Projects";
import Billing from "@/pages/Billing";
import Invoices from "@/pages/Invoices";
import Sprints from "@/pages/Sprints";
import Timesheets from "@/pages/Timesheets";
import Support from "@/pages/Support";
import AMC from "@/pages/AMC";
import AITools from "@/pages/AITools";
import Analytics from "@/pages/Analytics";
import Logout from "@/pages/Logout";
import Unauthorized from "@/pages/Unauthorized";
import Users from "@/pages/Users";
import Notifications from "@/pages/Notifications";
import Messaging from "@/pages/Messaging";
import Reports from "@/pages/Reports";
import { ROLE_ACCESS } from "@/lib/permissions";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading Crownridge LLP…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/logout" element={<Logout />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      <Route
        element={
          <ProtectedRoute
            unauthenticatedElement={<Navigate to="/login" replace />}
          />
        }
      >
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Leads: Admin + Project Manager */}
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.leads} />}>
            <Route path="/leads" element={<Leads />} />
          </Route>

          {/* User Management: Admin only */}
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.users} />}>
            <Route path="/users" element={<Users />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.clients} />}>
            <Route path="/clients" element={<Clients />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.projects} />}>
            <Route path="/projects" element={<Projects />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.sprints} />}>
            <Route path="/sprints" element={<Sprints />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.aiTools} />}>
            <Route path="/ai-tools" element={<AITools />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.billing} />}>
            <Route path="/billing" element={<Billing />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.amc} />}>
            <Route path="/amc" element={<AMC />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.analytics} />}>
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.invoices} />}>
            <Route path="/invoices" element={<Invoices />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.timesheets} />}>
            <Route path="/timesheets" element={<Timesheets />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.support} />}>
            <Route path="/support" element={<Support />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.notifications} />}>
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.messaging} />}>
            <Route path="/messaging" element={<Messaging />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={ROLE_ACCESS.reports} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
