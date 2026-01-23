import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import { useAuthStore, initializeAuth } from "@/lib/auth";
import { Require2FA } from "@/components/Require2FA";
import { useGatewaySettings } from "@/hooks/useGatewaySettings";
import { useFavicon } from "@/hooks/useFavicon";

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
import MerchantSettlementHistory from "./pages/merchant/MerchantSettlementHistory";
import MerchantApiTesting from "./pages/merchant/MerchantApiTesting";
import MerchantSDK from "./pages/merchant/MerchantSDK";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import PublicDocs from "./pages/PublicDocs";

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
  const { settings } = useGatewaySettings();
  
  // Apply dynamic favicon
  useFavicon(settings.faviconUrl);
  
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
      <Route path="/pay/:linkCode" element={<PaymentPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-failed" element={<PaymentFailed />} />
      <Route path="/about" element={<About />} />
      <Route path="/docs" element={<PublicDocs />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/merchants" element={<ProtectedRoute requiredRole="admin"><AdminMerchants /></ProtectedRoute>} />
      <Route path="/admin/payin" element={<ProtectedRoute requiredRole="admin"><AdminPayinOrders /></ProtectedRoute>} />
      <Route path="/admin/payout" element={<ProtectedRoute requiredRole="admin"><AdminPayoutOrders /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute requiredRole="admin"><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/api-testing" element={<ProtectedRoute requiredRole="admin"><AdminApiTesting /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
      
      {/* Merchant Routes - Protected with 2FA requirement */}
      <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantDashboard /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/dashboard" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantDashboard /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/analytics" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantAnalytics /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/documentation" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantDocumentation /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/payment-links" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantPaymentLinks /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/channel-price" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantChannelPrice /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/info" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantAccountInfo /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/withdrawal" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantWithdrawal /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/security" element={<ProtectedRoute requiredRole="merchant"><MerchantSecurity /></ProtectedRoute>} />
      <Route path="/merchant/payin" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantPayinOrders /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/payout" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantPayoutOrders /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/settlement-history" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantSettlementHistory /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/api-testing" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantApiTesting /></Require2FA></ProtectedRoute>} />
      <Route path="/merchant/sdk" element={<ProtectedRoute requiredRole="merchant"><Require2FA><MerchantSDK /></Require2FA></ProtectedRoute>} />
      
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
