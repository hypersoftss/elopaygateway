import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Shield, Globe, Sun, Moon, Lock, ExternalLink, Sparkles } from 'lucide-react';

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
  gateway_name: string;
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
    secured: '安全支付 · 256位加密',
    goHome: '返回首页',
    paymentFailed: '支付创建失败',
    tryAgain: '请重试',
    orderNo: '订单号',
    amount: '支付金额',
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
    processing: 'Redirecting...',
    secured: 'Secure Payment · 256-bit SSL',
    goHome: 'Go Home',
    paymentFailed: 'Payment failed',
    tryAgain: 'Try again',
    orderNo: 'Order',
    amount: 'Amount',
  },
};

const PaymentPage = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [gateway, setGateway] = useState<GatewaySettings>({ gateway_name: '', logo_url: null });
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
        // Fetch gateway settings via edge function (bypasses RLS)
        const { data: gatewayResponse } = await supabase.functions.invoke('get-payment-link-merchant', {
          body: { get_gateway_settings: true }
        });
        
        if (gatewayResponse?.gateway_settings) {
          setGateway({
            gateway_name: gatewayResponse.gateway_settings.gateway_name || 'Payment Gateway',
            logo_url: gatewayResponse.gateway_settings.logo_url
          });
        }

        // Fetch payment link
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

        // Fetch merchant info
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('merchant_name')
          .eq('id', linkData.merchant_id)
          .maybeSingle();

        if (merchantData) setMerchant(merchantData);

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
      const baseUrl = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('payment-link-pay', {
        body: { 
          link_code: linkCode,
          success_url: `${baseUrl}/payment-success`,
          failure_url: `${baseUrl}/payment-failed`
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        setError(t.paymentFailed);
        setIsProcessing(false);
        return;
      }

      console.log('Payment response:', data);

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {gateway.logo_url ? (
              <img src={gateway.logo_url} alt={gateway.gateway_name} className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-lg text-foreground">{gateway.gateway_name}</span>
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-foreground font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              {t.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      {/* Header with Branding */}
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          {gateway.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name} 
              className="h-10 w-10 object-contain rounded-xl"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg text-foreground">{gateway.gateway_name}</h1>
            <p className="text-xs text-muted-foreground">{language === 'zh' ? '安全支付' : 'Secure Payment'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="h-8 px-2 text-muted-foreground hover:text-foreground">
            <Globe className="h-4 w-4 mr-1" />
            {language === 'zh' ? 'EN' : '中'}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Payment Card */}
          <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
            {/* Top Accent */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            
            {/* Amount Display */}
            <div className="p-8 text-center bg-gradient-to-b from-muted/50 to-transparent">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Sparkles className="h-3 w-3" />
                {t.payTo} {merchant?.merchant_name}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{t.amount}</p>
              <p className="text-5xl font-bold text-foreground">
                ₹{paymentLink?.amount.toLocaleString()}
              </p>
              
              {paymentLink?.description && (
                <p className="text-muted-foreground text-sm mt-4 px-4">{paymentLink.description}</p>
              )}
            </div>

            {/* Order Details */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground">{t.orderNo}</span>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{paymentLink?.link_code}</code>
              </div>
            </div>

            {/* Pay Button */}
            <div className="p-6 pt-2">
              <Button 
                className="w-full h-14 text-lg font-semibold rounded-2xl transition-all gap-2 shadow-lg" 
                onClick={handlePay}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.processing}
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    {t.payNow} ₹{paymentLink?.amount.toLocaleString()}
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>{t.secured}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {language === 'zh' ? '由' : 'Powered by'} {gateway.gateway_name}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;