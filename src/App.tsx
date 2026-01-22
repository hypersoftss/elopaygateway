import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import { useAuthStore, initializeAuth } from "@/lib/auth";

// Pages
import Index from "./pages/Index";
import SetupAdmin from "./pages/SetupAdmin";
import AdminLogin from "./pages/AdminLogin";
import MerchantLogin from "./pages/MerchantLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPayinOrders from "./pages/admin/AdminPayinOrders";
import AdminPayoutOrders from "./pages/admin/AdminPayoutOrders";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminApiTesting from "./pages/admin/AdminApiTesting";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantDocumentation from "./pages/merchant/MerchantDocumentation";
import MerchantWithdrawal from "./pages/merchant/MerchantWithdrawal";
import MerchantAnalytics from "./pages/merchant/MerchantAnalytics";
import MerchantPaymentLinks from "./pages/merchant/MerchantPaymentLinks";
import MerchantChannelPrice from "./pages/merchant/MerchantChannelPrice";
import MerchantAccountInfo from "./pages/merchant/MerchantAccountInfo";
import MerchantSecurity from "./pages/merchant/MerchantSecurity";
import MerchantPayinOrders from "./pages/merchant/MerchantPayinOrders";
import MerchantPayoutOrders from "./pages/merchant/MerchantPayoutOrders";
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
      <Route path="/" element={<Index />} />
      <Route path="/setup-admin" element={<SetupAdmin />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/merchant-login" element={<MerchantLogin />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/merchants" element={<ProtectedRoute requiredRole="admin"><AdminMerchants /></ProtectedRoute>} />
      <Route path="/admin/payin" element={<ProtectedRoute requiredRole="admin"><AdminPayinOrders /></ProtectedRoute>} />
      <Route path="/admin/payout" element={<ProtectedRoute requiredRole="admin"><AdminPayoutOrders /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute requiredRole="admin"><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/api-testing" element={<ProtectedRoute requiredRole="admin"><AdminApiTesting /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
      
      {/* Merchant Routes */}
      <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/merchant/dashboard" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/merchant/analytics" element={<ProtectedRoute requiredRole="merchant"><MerchantAnalytics /></ProtectedRoute>} />
      <Route path="/merchant/documentation" element={<ProtectedRoute requiredRole="merchant"><MerchantDocumentation /></ProtectedRoute>} />
      <Route path="/merchant/payment-links" element={<ProtectedRoute requiredRole="merchant"><MerchantPaymentLinks /></ProtectedRoute>} />
      <Route path="/merchant/channel-price" element={<ProtectedRoute requiredRole="merchant"><MerchantChannelPrice /></ProtectedRoute>} />
      <Route path="/merchant/info" element={<ProtectedRoute requiredRole="merchant"><MerchantAccountInfo /></ProtectedRoute>} />
      <Route path="/merchant/withdrawal" element={<ProtectedRoute requiredRole="merchant"><MerchantWithdrawal /></ProtectedRoute>} />
      <Route path="/merchant/security" element={<ProtectedRoute requiredRole="merchant"><MerchantSecurity /></ProtectedRoute>} />
      <Route path="/merchant/payin" element={<ProtectedRoute requiredRole="merchant"><MerchantPayinOrders /></ProtectedRoute>} />
      <Route path="/merchant/payout" element={<ProtectedRoute requiredRole="merchant"><MerchantPayoutOrders /></ProtectedRoute>} />
      
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
