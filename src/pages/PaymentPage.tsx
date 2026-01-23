import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Shield, Globe, Sun, Moon, Lock } from 'lucide-react';

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
    processing: '处理中...',
    secured: '安全支付',
    goHome: '返回首页',
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
    processing: 'Processing...',
    secured: 'Secure Payment',
    goHome: 'Go Home',
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
    setIsProcessing(true);
    
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2;
      
      const params = new URLSearchParams({
        order_no: 'TXN' + Date.now(),
        amount: paymentLink?.amount.toString() || '0',
        merchant: merchant?.merchant_name || '',
        description: paymentLink?.description || '',
      });

      if (isSuccess) {
        navigate(`/payment-success?${params.toString()}`);
      } else {
        params.append('link_code', linkCode || '');
        params.append('reason', language === 'zh' ? '交易被拒绝' : 'Transaction declined');
        navigate(`/payment-failed?${params.toString()}`);
      }
    }, 2000);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-slate-400 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-slate-300 font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="text-slate-400">
            {t.goHome}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Controls */}
      <div className="fixed top-3 right-3 flex gap-1.5 z-50">
        <Button variant="ghost" size="sm" onClick={toggleLanguage} className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/10">
          <Globe className="h-4 w-4 mr-1" />
          {language === 'zh' ? 'EN' : '中'}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
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
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="font-semibold text-white">{gateway?.gateway_name || 'PayGate'}</span>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Amount Section */}
          <div className="p-6 text-center border-b border-slate-700/50">
            <p className="text-slate-400 text-xs mb-2">{t.payTo} {merchant?.merchant_name}</p>
            <p className="text-4xl font-bold text-white">
              ₹{paymentLink?.amount.toLocaleString()}
            </p>
            {paymentLink?.description && (
              <p className="text-slate-400 text-sm mt-2 truncate">{paymentLink.description}</p>
            )}
          </div>

          {/* Pay Button */}
          <div className="p-4">
            <Button 
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all" 
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t.processing}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {t.payNow}
                </>
              )}
            </Button>
            
            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-500 text-xs">
              <Shield className="h-3 w-3" />
              <span>{t.secured}</span>
            </div>
          </div>
        </div>

        {/* Order ID */}
        <p className="text-center text-slate-500 text-xs mt-4">
          #{paymentLink?.link_code}
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;