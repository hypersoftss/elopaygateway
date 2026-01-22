import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, Receipt, Copy, Check, Globe, Sun, Moon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type Language = 'zh' | 'en';

interface GatewaySettings {
  gateway_name: string | null;
  logo_url: string | null;
}

const translations = {
  zh: {
    success: '支付成功',
    successSub: 'Payment Successful',
    amountPaid: '支付金额',
    orderNo: '订单号',
    merchant: '商户',
    description: '描述',
    time: '时间',
    downloadReceipt: '下载收据',
    backHome: '返回首页',
  },
  en: {
    success: 'Payment Successful',
    successSub: '支付成功',
    amountPaid: 'Amount Paid',
    orderNo: 'Order No',
    merchant: 'Merchant',
    description: 'Description',
    time: 'Time',
    downloadReceipt: 'Download Receipt',
    backHome: 'Back to Home',
  },
};

const PaymentSuccess = () => {
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
  const description = searchParams.get('description') || '';

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
        .select('gateway_name, logo_url')
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

  const handleDownloadReceipt = () => {
    const receiptContent = `
========================================
           ${t.success}
========================================

${t.orderNo}: ${orderNo}
${t.amountPaid}: ₹${parseFloat(amount).toLocaleString()}
${t.merchant}: ${merchant}
${description ? `${t.description}: ${description}` : ''}
${t.time}: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

----------------------------------------
${gateway?.gateway_name || 'Payment Gateway'}
========================================
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${orderNo}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cinematic-bg bg-gradient-to-br from-background via-background to-[hsl(var(--success))]/10">
      {/* Cinematic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[hsl(var(--success))]/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse" />
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
        {/* Success Header */}
        <div className="bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(142_76%_45%)] p-10 text-center relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 h-6 w-6 text-white/30 animate-pulse" />
          <Sparkles className="absolute bottom-4 left-4 h-5 w-5 text-white/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-5 animate-bounce shadow-2xl">
            <CheckCircle2 className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.success}</h1>
          <p className="text-white/70 text-sm">{t.successSub}</p>
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
          <div className="text-center py-6 bg-[hsl(var(--success))]/5 dark:bg-[hsl(var(--success))]/10 rounded-xl border border-[hsl(var(--success))]/20">
            <p className="text-sm text-muted-foreground mb-2">{t.amountPaid}</p>
            <p className="text-4xl font-bold text-[hsl(var(--success))]">
              ₹{parseFloat(amount).toLocaleString()}
            </p>
          </div>

          {/* Receipt Details */}
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
            {description && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">{t.description}</span>
                <span className="text-sm text-right max-w-[180px]">{description}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.time}</span>
              <span className="text-sm">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <Button 
            className="w-full h-12 btn-gradient-success text-base font-semibold" 
            onClick={handleDownloadReceipt}
          >
            <Receipt className="h-4 w-4 mr-2" />
            {t.downloadReceipt}
          </Button>
          <Button 
            variant="outline" 
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

export default PaymentSuccess;