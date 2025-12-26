import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useFinancialSecurity } from "@/hooks/useSecurityEvents";
import BottomNavigation from "@/components/BottomNavigation";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transfers from "./pages/Transfers";
import Inventory from "./pages/Inventory";
import Debts from "./pages/Debts";
import Records from "./pages/Records";
import TransfersRecords from "./pages/records/TransfersRecords";
import ProductsRecords from "./pages/records/ProductsRecords";
import CategoryDetails from "./pages/records/CategoryDetails";
import DebtsRecords from "./pages/records/DebtsRecords";
import PhoneNumbersRecords from "./pages/records/PhoneNumbersRecords";
import Reports from "./pages/Reports";
import SellProducts from "./pages/SellProducts";
import SettleDebts from "./pages/SettleDebts";
import FixedNumberDetails from "./pages/FixedNumberDetails";
import NotFound from "./pages/NotFound";

// Financial security wrapper - applies all security measures
function SecurityProvider({ children }: { children: React.ReactNode }) {
  useFinancialSecurity();
  return <>{children}</>;
}

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logged in but email not confirmed - redirect to auth page
  if (!user.email_confirmed_at) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Only redirect to dashboard if user exists AND email is confirmed
  if (user && user.email_confirmed_at) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function EmailConfirmationGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // HARD GUARD: Supabase may still return a session for unconfirmed emails.
  // If the email isn't confirmed, immediately force user to /auth and render nothing else.
  if (user && !user.email_confirmed_at && location.pathname !== "/auth") {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ emailConfirmationRequired: true }}
      />
    );
  }

  return <>{children}</>;
}

function BottomNavIfAllowed() {
  const location = useLocation();
  if (location.pathname === "/auth") return null;
  return <BottomNavigation />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />

      {/* Main app */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <Transfers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/numbers/:id"
        element={
          <ProtectedRoute>
            <FixedNumberDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      {/* Alias for older/expected route */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Navigate to="/inventory" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/debts"
        element={
          <ProtectedRoute>
            <Debts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sell"
        element={
          <ProtectedRoute>
            <SellProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settle-debts"
        element={
          <ProtectedRoute>
            <SettleDebts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <Records />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/transfers"
        element={
          <ProtectedRoute>
            <TransfersRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/products"
        element={
          <ProtectedRoute>
            <ProductsRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/category/:id"
        element={
          <ProtectedRoute>
            <CategoryDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/debts"
        element={
          <ProtectedRoute>
            <DebtsRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/phone-numbers"
        element={
          <ProtectedRoute>
            <PhoneNumbersRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <SecurityProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <EmailConfirmationGuard>
              {/* Global safe padding so content never sits under bottom nav */}
              <div
                className="min-h-screen pb-24"
                style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <AppRoutes />
              </div>
              <BottomNavIfAllowed />
            </EmailConfirmationGuard>
          </BrowserRouter>
        </SecurityProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

