import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BottomNavigation from "@/components/BottomNavigation";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transfers from "./pages/Transfers";
import Inventory from "./pages/Inventory";
import Debts from "./pages/Debts";
import Records from "./pages/Records";
import TransfersRecords from "./pages/records/TransfersRecords";
import ProductsRecords from "./pages/records/ProductsRecords";
import DebtsRecords from "./pages/records/DebtsRecords";
import Reports from "./pages/Reports";
import SellProducts from "./pages/SellProducts";
import SettleDebts from "./pages/SettleDebts";
import NotFound from "./pages/NotFound";

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
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
        path="/records/debts"
        element={
          <ProtectedRoute>
            <DebtsRecords />
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Global safe padding so content never sits under bottom nav */}
          <div
            className="min-h-screen pb-24"
            style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <AppRoutes />
          </div>
          <BottomNavigation />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

