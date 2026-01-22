import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import { useAuthStore, initializeAuth } from "@/lib/auth";

// Pages
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import MerchantLogin from "./pages/MerchantLogin";
import SetupAdmin from "./pages/SetupAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminSettings from "./pages/admin/AdminSettings";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantDocumentation from "./pages/merchant/MerchantDocumentation";
import MerchantWithdrawal from "./pages/merchant/MerchantWithdrawal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'merchant' }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/merchant'} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/merchant-login" element={<MerchantLogin />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/setup-admin" element={<SetupAdmin />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/merchants" element={<ProtectedRoute requiredRole="admin"><AdminMerchants /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
      
      {/* Merchant Routes */}
      <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/merchant/documentation" element={<ProtectedRoute requiredRole="merchant"><MerchantDocumentation /></ProtectedRoute>} />
      <Route path="/merchant/withdrawal" element={<ProtectedRoute requiredRole="merchant"><MerchantWithdrawal /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
