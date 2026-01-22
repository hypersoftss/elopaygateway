import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertCircle, CheckCircle2, Clock, Shield, Sparkles, Globe, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';

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
    loading: '加载支付详情...',
    invalidLink: '无效的支付链接',
    notFound: '支付链接不存在',
    expired: '此支付链接已过期',
    inactive: '此支付链接已停用',
    loadFailed: '加载支付详情失败',
    paymentError: '支付错误',
    goHome: '返回首页',
    securePayment: '安全支付',
    payTo: '支付给',
    amountToPay: '支付金额',
    description: '描述',
    linkCode: '链接代码',
    status: '状态',
    active: '活跃',
    expires: '过期时间',
    payNow: '立即支付',
    processing: '处理中...',
    securedBy: '安全加密支付',
  },
  en: {
    loading: 'Loading payment details...',
    invalidLink: 'Invalid payment link',
    notFound: 'Payment link not found',
    expired: 'This payment link has expired',
    inactive: 'This payment link is no longer active',
    loadFailed: 'Failed to load payment details',
    paymentError: 'Payment Error',
    goHome: 'Go Home',
    securePayment: 'Secure Payment',
    payTo: 'Pay to',
    amountToPay: 'Amount to Pay',
    description: 'Description',
    linkCode: 'Link Code',
    status: 'Status',
    active: 'Active',
    expires: 'Expires',
    payNow: 'Pay Now',
    processing: 'Processing...',
    securedBy: 'Secured & Encrypted by',
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
  const [isDark, setIsDark] = useState(false);

  const t = translations[language];

  useEffect(() => {
    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
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

        // Check if expired
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError(t.expired);
          setIsLoading(false);
          return;
        }

        // Check if inactive
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

        if (merchantData) {
          setMerchant(merchantData);
        }

        // Fetch gateway settings for branding
        const { data: gatewayData } = await supabase
          .from('admin_settings')
          .select('gateway_name, logo_url')
          .limit(1)
          .maybeSingle();

        if (gatewayData) {
          setGateway(gatewayData);
        }
      } catch (err) {
        console.error('Error fetching payment link:', err);
        setError(t.loadFailed);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [linkCode]);

  const handlePay = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing - in real implementation, integrate with payment gateway
    setTimeout(() => {
      // Simulate success (80% chance) or failure (20% chance)
      const isSuccess = Math.random() > 0.2;
      
      const params = new URLSearchParams({
        order_no: 'TXN' + Date.now(),
        amount: paymentLink?.amount.toString() || '0',
        merchant: merchant?.merchant_name || '商户',
        description: paymentLink?.description || '',
      });

      if (isSuccess) {
        navigate(`/payment-success?${params.toString()}`);
      } else {
        params.append('link_code', linkCode || '');
        params.append('reason', language === 'zh' ? '银行拒绝交易' : 'Transaction declined by bank');
        navigate(`/payment-failed?${params.toString()}`);
      }
    }, 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 cinematic-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--success))]/20 rounded-full blur-[100px] animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="p-4 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg animate-glow">
              <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4 cinematic-bg">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-destructive/10 rounded-full blur-[100px]" />
        </div>
        
        {/* Controls */}
        <div className="fixed top-4 right-4 flex gap-2 z-50">
          <Button variant="outline" size="icon" onClick={toggleLanguage} className="glass-card border-0">
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="glass-card border-0">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <Card className="w-full max-w-md premium-card border-0 relative z-10">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="p-5 rounded-full bg-destructive/10 animate-pulse">
              <AlertCircle className="h-14 w-14 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">{t.paymentError}</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
              {t.goHome}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cinematic-bg bg-gradient-to-br from-background via-background to-primary/5">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[hsl(var(--success))]/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      {/* Controls */}
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        <Button variant="outline" size="sm" onClick={toggleLanguage} className="glass-card border-0 gap-2">
          <Globe className="h-4 w-4" />
          {language === 'zh' ? 'EN' : '中文'}
        </Button>
        <Button variant="outline" size="icon" onClick={toggleTheme} className="glass-card border-0">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <Card className="w-full max-w-md premium-card border-0 relative overflow-hidden animate-scale-in">
        {/* Decorative gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--success))] to-primary" />
        
        {/* Header with Branding */}
        <CardHeader className="text-center border-b border-border/50 pb-6 pt-8 bg-gradient-to-b from-muted/30 to-transparent">
          {gateway?.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name || 'Payment Gateway'} 
              className="h-16 mx-auto mb-4 object-contain drop-shadow-lg"
            />
          ) : (
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg animate-glow">
                <CreditCard className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {gateway?.gateway_name || 'PayGate'}
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 mt-3">
            <Shield className="h-4 w-4 text-[hsl(var(--success))]" />
            <span className="font-medium">{t.securePayment}</span>
          </CardDescription>
          {merchant?.merchant_name && (
            <p className="text-sm text-muted-foreground mt-2">
              {t.payTo}: <span className="font-semibold text-foreground">{merchant.merchant_name}</span>
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Amount Display */}
          <div className="text-center py-10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-all duration-500">
            <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary/40 animate-pulse" />
            <Sparkles className="absolute bottom-4 left-4 h-4 w-4 text-primary/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-sm text-muted-foreground mb-3 font-medium">{t.amountToPay}</p>
            <p className="text-5xl font-bold text-gradient relative z-10">
              ₹{paymentLink?.amount.toLocaleString()}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 p-5 bg-muted/20 dark:bg-muted/10 rounded-xl border border-border/50">
            {paymentLink?.description && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground text-sm">{t.description}</span>
                <span className="text-sm text-right max-w-[200px] font-medium">{paymentLink.description}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">{t.linkCode}</span>
              <code className="text-sm font-mono bg-background/80 px-3 py-1.5 rounded-lg border">{paymentLink?.link_code}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">{t.status}</span>
              <Badge className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t.active}
              </Badge>
            </div>
            {paymentLink?.expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{t.expires}</span>
                <span className="text-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(new Date(paymentLink.expires_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6 pb-8">
          <Button 
            className="w-full h-14 text-lg font-semibold btn-gradient-success shadow-lg hover:shadow-xl transition-all duration-300 animate-glow" 
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t.processing}
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                {t.payNow} ₹{paymentLink?.amount.toLocaleString()}
              </>
            )}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>{t.securedBy} {gateway?.gateway_name || 'PayGate'}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentPage;
