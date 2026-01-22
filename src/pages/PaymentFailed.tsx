import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, Home, MessageCircle, Copy, Check, Globe, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type Language = 'zh' | 'en';

interface GatewaySettings {
  gateway_name: string | null;
  logo_url: string | null;
  support_email: string | null;
}

const translations = {
  zh: {
    failed: '支付失败',
    failedSub: 'Payment Failed',
    amount: '支付金额',
    reason: '失败原因',
    orderNo: '订单号',
    merchant: '商户',
    time: '时间',
    retry: '重新支付',
    contact: '联系客服',
    backHome: '返回首页',
  },
  en: {
    failed: 'Payment Failed',
    failedSub: '支付失败',
    amount: 'Amount',
    reason: 'Reason',
    orderNo: 'Order No',
    merchant: 'Merchant',
    time: 'Time',
    retry: 'Retry Payment',
    contact: 'Contact Support',
    backHome: 'Back to Home',
  },
};

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState<GatewaySettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [isDark, setIsDark] = useState(false);

  const t = translations[language];

  const orderNo = searchParams.get('order_no') || 'TXN' + Date.now();
  const amount = searchParams.get('amount') || '0';
  const merchant = searchParams.get('merchant') || '商户';
  const reason = searchParams.get('reason') || (language === 'zh' ? '支付处理失败' : 'Payment processing failed');
  const linkCode = searchParams.get('link_code');

  useEffect(() => {
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
    const fetchGateway = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('gateway_name, logo_url, support_email')
        .limit(1)
        .maybeSingle();
      if (data) setGateway(data);
    };
    fetchGateway();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (linkCode) {
      navigate(`/pay/${linkCode}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cinematic-bg bg-gradient-to-br from-background via-background to-destructive/10">
      {/* Cinematic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-destructive/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
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

      <Card className="w-full max-w-md premium-card border-0 overflow-hidden animate-scale-in relative z-10">
        {/* Failed Header */}
        <div className="bg-gradient-to-r from-destructive to-destructive/80 p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)]" />
          <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-5 shadow-2xl">
            <XCircle className="h-14 w-14 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.failed}</h1>
          <p className="text-white/70 text-sm">{t.failedSub}</p>
        </div>

        <CardHeader className="text-center border-b border-border/50 py-4">
          {gateway?.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name || 'Payment Gateway'} 
              className="h-10 mx-auto object-contain"
            />
          ) : (
            <p className="text-sm font-medium text-muted-foreground">{gateway?.gateway_name || 'Payment Gateway'}</p>
          )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-5">
          {/* Amount */}
          <div className="text-center py-6 bg-destructive/5 dark:bg-destructive/10 rounded-xl border border-destructive/20">
            <p className="text-sm text-muted-foreground mb-2">{t.amount}</p>
            <p className="text-4xl font-bold text-destructive">
              ₹{parseFloat(amount).toLocaleString()}
            </p>
          </div>

          {/* Error Details */}
          <div className="p-4 bg-destructive/5 dark:bg-destructive/10 rounded-xl border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">{t.reason}</p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4 p-5 bg-muted/20 dark:bg-muted/10 rounded-xl border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.orderNo}</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background/80 px-2 py-1 rounded border">{orderNo}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.merchant}</span>
              <span className="text-sm font-medium">{merchant}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.time}</span>
              <span className="text-sm">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <Button 
            className="w-full h-12 btn-gradient-primary text-base font-semibold" 
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.retry}
          </Button>
          {gateway?.support_email && (
            <Button 
              variant="outline" 
              className="w-full h-11" 
              onClick={() => window.location.href = `mailto:${gateway.support_email}?subject=Payment Issue - ${orderNo}`}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t.contact}
            </Button>
          )}
          <Button 
            variant="ghost" 
            className="w-full h-11" 
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            {t.backHome}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentFailed;