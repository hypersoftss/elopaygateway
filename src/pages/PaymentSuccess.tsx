import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, Receipt, Copy, Check, Globe, Sun, Moon, CreditCard, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type Language = 'zh' | 'en';

interface GatewaySettings {
  gateway_name: string;
  logo_url: string | null;
}

interface RecentTransaction {
  order_no: string;
  amount: number;
  status: string;
  created_at: string;
}

const translations = {
  zh: {
    success: '支付成功',
    successSub: 'Payment Successful',
    amountPaid: '支付金额',
    orderNo: '订单号',
    merchant: '商户',
    time: '时间',
    downloadReceipt: '下载收据',
    backHome: '返回首页',
    recentPayments: '最近支付记录',
  },
  en: {
    success: 'Payment Successful',
    successSub: '支付成功',
    amountPaid: 'Amount Paid',
    orderNo: 'Order No',
    merchant: 'Merchant',
    time: 'Time',
    downloadReceipt: 'Download Receipt',
    backHome: 'Back to Home',
    recentPayments: 'Recent Payments',
  },
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState<GatewaySettings>({ gateway_name: '', logo_url: null });
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [isDark, setIsDark] = useState(true);

  const t = translations[language];

  const orderNo = searchParams.get('order_no') || 'TXN' + Date.now();
  const amount = searchParams.get('amount') || '0';
  const merchant = searchParams.get('merchant') || '';

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

      // Fetch recent transactions
      const { data: txnData } = await supabase
        .from('transactions')
        .select('order_no, amount, status, created_at')
        .eq('status', 'success')
        .eq('transaction_type', 'payin')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (txnData) setRecentTxns(txnData);
    };
    fetchData();
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
${merchant ? `${t.merchant}: ${merchant}` : ''}
${t.time}: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

----------------------------------------
${gateway.gateway_name}
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
            <h1 className="font-bold text-lg text-foreground">{gateway.gateway_name || 'ELOPAY'}</h1>
            <p className="text-xs text-muted-foreground">{language === 'zh' ? 'ELOPAY 支付网关' : 'ELOPAY Payment Gateway'}</p>
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
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Success Card */}
          <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t.success}</h2>
              <p className="text-white/70 text-sm mt-1">{t.successSub}</p>
            </div>
            
            {/* Amount */}
            <div className="p-6 text-center border-b border-border/50">
              <p className="text-sm text-muted-foreground mb-1">{t.amountPaid}</p>
              <p className="text-4xl font-bold text-green-500">
                ₹{parseFloat(amount).toLocaleString()}
              </p>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t.orderNo}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{orderNo}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              {merchant && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t.merchant}</span>
                  <span className="text-sm font-medium">{merchant}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t.time}</span>
                <span className="text-sm">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 space-y-3">
              <Button 
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl" 
                onClick={handleDownloadReceipt}
              >
                <Receipt className="h-4 w-4 mr-2" />
                {t.downloadReceipt}
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl" 
                onClick={() => navigate('/')}
              >
                <Home className="h-4 w-4 mr-2" />
                {t.backHome}
              </Button>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTxns.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{t.recentPayments}</h3>
              </div>
              <div className="space-y-2">
                {recentTxns.slice(0, 3).map((txn, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">{txn.order_no.slice(0, 12)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), 'MM-dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-green-500">₹{txn.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            {language === 'zh' ? '由 ELOPAY 提供支持' : 'Powered by ELOPAY'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default PaymentSuccess;