import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import { useAuthStore, initializeAuth } from "@/lib/auth";
import { Require2FA } from "@/components/Require2FA";
import { useGatewaySettings } from "@/hooks/useGatewaySettings";
import { useFavicon } from "@/hooks/useFavicon";

// Lazy-loaded Pages
const Index = React.lazy(() => import("./pages/Index"));
const SetupAdmin = React.lazy(() => import("./pages/SetupAdmin"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const MerchantLogin = React.lazy(() => import("./pages/MerchantLogin"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMerchants = React.lazy(() => import("./pages/admin/AdminMerchants"));
const AdminSettings = React.lazy(() => import("./pages/admin/AdminSettings"));
const AdminPayinOrders = React.lazy(() => import("./pages/admin/AdminPayinOrders"));
const AdminPayoutOrders = React.lazy(() => import("./pages/admin/AdminPayoutOrders"));
const AdminWithdrawals = React.lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminApiTesting = React.lazy(() => import("./pages/admin/AdminApiTesting"));
const MerchantDashboard = React.lazy(() => import("./pages/merchant/MerchantDashboard"));
const MerchantDocumentation = React.lazy(() => import("./pages/merchant/MerchantDocumentation"));
const MerchantWithdrawal = React.lazy(() => import("./pages/merchant/MerchantWithdrawal"));
const MerchantAnalytics = React.lazy(() => import("./pages/merchant/MerchantAnalytics"));
const MerchantPaymentLinks = React.lazy(() => import("./pages/merchant/MerchantPaymentLinks"));
const MerchantChannelPrice = React.lazy(() => import("./pages/merchant/MerchantChannelPrice"));
const MerchantAccountInfo = React.lazy(() => import("./pages/merchant/MerchantAccountInfo"));
const MerchantSecurity = React.lazy(() => import("./pages/merchant/MerchantSecurity"));
const MerchantPayinOrders = React.lazy(() => import("./pages/merchant/MerchantPayinOrders"));
const MerchantPayoutOrders = React.lazy(() => import("./pages/merchant/MerchantPayoutOrders"));
const MerchantSettlementHistory = React.lazy(() => import("./pages/merchant/MerchantSettlementHistory"));
const MerchantApiTesting = React.lazy(() => import("./pages/merchant/MerchantApiTesting"));
const PaymentPage = React.lazy(() => import("./pages/PaymentPage"));
const PaymentSuccess = React.lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = React.lazy(() => import("./pages/PaymentFailed"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const About = React.lazy(() => import("./pages/About"));
const PublicDocs = React.lazy(() => import("./pages/PublicDocs"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = React.lazy(() => import("./pages/TermsConditions"));
const EloPayGatewayINRDocs = React.lazy(() => import("./pages/admin/sdk/EloPayGatewayINRDocs"));
const EloPayINRDocs = React.lazy(() => import("./pages/admin/sdk/EloPayINRDocs"));
const EloPayPKRDocs = React.lazy(() => import("./pages/admin/sdk/EloPayPKRDocs"));
const EloPayBDTDocs = React.lazy(() => import("./pages/admin/sdk/EloPayBDTDocs"));
const AdminGateways = React.lazy(() => import("./pages/admin/AdminGateways"));
const AdminGatewayHealth = React.lazy(() => import("./pages/admin/AdminGatewayHealth"));
const AdminTelegram = React.lazy(() => import("./pages/admin/AdminTelegram"));
const AdminActivityLogs = React.lazy(() => import("./pages/admin/AdminActivityLogs"));
const AdminLiveTransactions = React.lazy(() => import("./pages/admin/AdminLiveTransactions"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'merchant' }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingFallback />;
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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/setup-admin" element={<SetupAdmin />} />
        <Route path="/xp7k9m2v-admin" element={<AdminLogin />} />
        <Route path="/merchant-login" element={<MerchantLogin />} />
        <Route path="/pay/:linkCode" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<PublicDocs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/merchants" element={<ProtectedRoute requiredRole="admin"><AdminMerchants /></ProtectedRoute>} />
        <Route path="/admin/payin" element={<ProtectedRoute requiredRole="admin"><AdminPayinOrders /></ProtectedRoute>} />
        <Route path="/admin/payout" element={<ProtectedRoute requiredRole="admin"><AdminPayoutOrders /></ProtectedRoute>} />
        <Route path="/admin/withdrawals" element={<ProtectedRoute requiredRole="admin"><AdminWithdrawals /></ProtectedRoute>} />
        <Route path="/admin/api-testing" element={<ProtectedRoute requiredRole="admin"><AdminApiTesting /></ProtectedRoute>} />
        <Route path="/admin/gateways" element={<ProtectedRoute requiredRole="admin"><AdminGateways /></ProtectedRoute>} />
        <Route path="/admin/gateway-health" element={<ProtectedRoute requiredRole="admin"><AdminGatewayHealth /></ProtectedRoute>} />
        <Route path="/admin/telegram" element={<ProtectedRoute requiredRole="admin"><AdminTelegram /></ProtectedRoute>} />
        <Route path="/admin/activity-logs" element={<ProtectedRoute requiredRole="admin"><AdminActivityLogs /></ProtectedRoute>} />
        <Route path="/admin/live-transactions" element={<ProtectedRoute requiredRole="admin"><AdminLiveTransactions /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
        
        {/* SDK Documentation Routes */}
        <Route path="/admin/sdk/elopay-gateway-inr" element={<ProtectedRoute requiredRole="admin"><EloPayGatewayINRDocs /></ProtectedRoute>} />
        <Route path="/admin/sdk/elopay-inr" element={<ProtectedRoute requiredRole="admin"><EloPayINRDocs /></ProtectedRoute>} />
        <Route path="/admin/sdk/elopay-pkr" element={<ProtectedRoute requiredRole="admin"><EloPayPKRDocs /></ProtectedRoute>} />
        <Route path="/admin/sdk/elopay-bdt" element={<ProtectedRoute requiredRole="admin"><EloPayBDTDocs /></ProtectedRoute>} />
        
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
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
