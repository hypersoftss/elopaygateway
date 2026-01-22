import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Home, ArrowLeft, Receipt, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gateway_name: string | null;
  logo_url: string | null;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState<GatewaySettings | null>(null);
  const [copied, setCopied] = useState(false);

  const orderNo = searchParams.get('order_no') || 'TXN' + Date.now();
  const amount = searchParams.get('amount') || '0';
  const merchant = searchParams.get('merchant') || '商户';
  const description = searchParams.get('description') || '';

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
           支付成功收据
         PAYMENT RECEIPT
========================================

订单号 / Order No: ${orderNo}
金额 / Amount: ₹${parseFloat(amount).toLocaleString()}
商户 / Merchant: ${merchant}
${description ? `描述 / Description: ${description}` : ''}
时间 / Time: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
状态 / Status: 成功 / Success

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-[hsl(var(--success))]/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(142_76%_45%)] p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4 animate-bounce">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">支付成功</h1>
          <p className="text-white/80 text-sm">Payment Successful</p>
        </div>

        <CardHeader className="text-center border-b border-border pb-4">
          {gateway?.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name || 'Payment Gateway'} 
              className="h-8 mx-auto mb-2 object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{gateway?.gateway_name || 'Payment Gateway'}</p>
          )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-4">
          {/* Amount */}
          <div className="text-center py-4 bg-[hsl(var(--success))]/5 rounded-xl border border-[hsl(var(--success))]/20">
            <p className="text-sm text-muted-foreground mb-1">支付金额 / Amount Paid</p>
            <p className="text-3xl font-bold text-[hsl(var(--success))]">
              ₹{parseFloat(amount).toLocaleString()}
            </p>
          </div>

          {/* Receipt Details */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">订单号 / Order No</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded">{orderNo}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">商户 / Merchant</span>
              <span className="text-sm font-medium">{merchant}</span>
            </div>
            {description && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">描述 / Description</span>
                <span className="text-sm text-right max-w-[180px]">{description}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">时间 / Time</span>
              <span className="text-sm">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <Button 
            className="w-full h-11 btn-gradient-success" 
            onClick={handleDownloadReceipt}
          >
            <Receipt className="h-4 w-4 mr-2" />
            下载收据 / Download Receipt
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-11" 
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首页 / Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;