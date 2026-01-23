import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Shield, Globe, Sun, Moon, Lock, ExternalLink } from 'lucide-react';

type Language = 'zh' | 'en';

interface PaymentLinkData {
  id: string;
  link_code: string;
  amount: number;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  merchant_id: string;
}

interface MerchantData {
  merchant_name: string;
}

interface GatewaySettings {
  gateway_name: string | null;
  logo_url: string | null;
}

const translations = {
  zh: {
    loading: '加载中...',
    invalidLink: '无效链接',
    notFound: '链接不存在',
    expired: '链接已过期',
    inactive: '链接已停用',
    loadFailed: '加载失败',
    payTo: '收款方',
    payNow: '立即支付',
    processing: '正在跳转支付...',
    secured: '安全支付',
    goHome: '返回首页',
    redirecting: '正在跳转到支付页面...',
    paymentFailed: '支付创建失败',
    tryAgain: '请重试',
  },
  en: {
    loading: 'Loading...',
    invalidLink: 'Invalid Link',
    notFound: 'Link not found',
    expired: 'Link expired',
    inactive: 'Link inactive',
    loadFailed: 'Load failed',
    payTo: 'Pay to',
    payNow: 'Pay Now',
    processing: 'Redirecting to payment...',
    secured: 'Secure Payment',
    goHome: 'Go Home',
    redirecting: 'Redirecting to payment page...',
    paymentFailed: 'Payment creation failed',
    tryAgain: 'Please try again',
  },
};

const PaymentPage = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [gateway, setGateway] = useState<GatewaySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [isDark, setIsDark] = useState(true);

  const t = translations[language];

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!linkCode) {
        setError(t.invalidLink);
        setIsLoading(false);
        return;
      }

      try {
        const { data: linkData, error: linkError } = await supabase
          .from('payment_links')
          .select('*')
          .eq('link_code', linkCode)
          .maybeSingle();

        if (linkError) throw linkError;

        if (!linkData) {
          setError(t.notFound);
          setIsLoading(false);
          return;
        }

        setPaymentLink(linkData);

        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError(t.expired);
          setIsLoading(false);
          return;
        }

        if (!linkData.is_active) {
          setError(t.inactive);
          setIsLoading(false);
          return;
        }

        const { data: merchantData } = await supabase
          .from('merchants')
          .select('merchant_name')
          .eq('id', linkData.merchant_id)
          .maybeSingle();

        if (merchantData) setMerchant(merchantData);

        const { data: gatewayData } = await supabase
          .from('admin_settings')
          .select('gateway_name, logo_url')
          .limit(1)
          .maybeSingle();

        if (gatewayData) setGateway(gatewayData);
      } catch (err) {
        console.error('Error:', err);
        setError(t.loadFailed);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [linkCode]);

  const handlePay = async () => {
    if (!linkCode) return;
    
    setIsProcessing(true);
    
    try {
      // Call edge function to create real BondPay payment
      const { data, error } = await supabase.functions.invoke('payment-link-pay', {
        body: { link_code: linkCode }
      });

      if (error) {
        console.error('Payment creation error:', error);
        setError(t.paymentFailed);
        setIsProcessing(false);
        return;
      }

      console.log('Payment response:', data);

      if (data?.payment_url) {
        // Redirect to BondPay payment page
        window.location.href = data.payment_url;
      } else {
        // If no payment URL, show error
        console.error('No payment URL returned');
        setError(t.paymentFailed);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(t.paymentFailed);
      setIsProcessing(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-foreground font-medium">{error}</p>
          <p className="text-muted-foreground text-sm">{t.tryAgain}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t.tryAgain}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      {/* Controls */}
      <div className="fixed top-3 right-3 flex gap-1.5 z-50">
        <Button variant="ghost" size="sm" onClick={toggleLanguage} className="h-8 px-2 text-muted-foreground hover:text-foreground">
          <Globe className="h-4 w-4 mr-1" />
          {language === 'zh' ? 'EN' : '中'}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Compact Payment Card */}
      <div className="w-full max-w-sm">
        {/* Header with Branding */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {gateway?.logo_url ? (
            <img src={gateway.logo_url} alt="" className="h-8 w-8 object-contain rounded-lg" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground">{gateway?.gateway_name || 'PayGate'}</span>
        </div>

        {/* Main Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-xl">
          {/* Amount Section */}
          <div className="p-6 text-center border-b border-border">
            <p className="text-muted-foreground text-xs mb-2">{t.payTo} {merchant?.merchant_name}</p>
            <p className="text-4xl font-bold text-foreground">
              ₹{paymentLink?.amount.toLocaleString()}
            </p>
            {paymentLink?.description && (
              <p className="text-muted-foreground text-sm mt-2 truncate">{paymentLink.description}</p>
            )}
          </div>

          {/* Pay Button */}
          <div className="p-4">
            <Button 
              className="w-full h-12 font-semibold rounded-xl transition-all gap-2" 
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.processing}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  {t.payNow}
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </Button>
            
            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-muted-foreground text-xs">
              <Shield className="h-3 w-3" />
              <span>{t.secured}</span>
            </div>
          </div>
        </div>

        {/* Order ID */}
        <p className="text-center text-muted-foreground text-xs mt-4">
          #{paymentLink?.link_code}
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;