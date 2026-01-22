import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, Home, MessageCircle, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gateway_name: string | null;
  logo_url: string | null;
  support_email: string | null;
}

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState<GatewaySettings | null>(null);
  const [copied, setCopied] = useState(false);

  const orderNo = searchParams.get('order_no') || 'TXN' + Date.now();
  const amount = searchParams.get('amount') || '0';
  const merchant = searchParams.get('merchant') || '商户';
  const reason = searchParams.get('reason') || '支付处理失败 / Payment processing failed';
  const linkCode = searchParams.get('link_code');

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Failed Header */}
        <div className="bg-gradient-to-r from-destructive to-destructive/80 p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-12 w-12 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">支付失败</h1>
          <p className="text-white/80 text-sm">Payment Failed</p>
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
          <div className="text-center py-4 bg-destructive/5 rounded-xl border border-destructive/20">
            <p className="text-sm text-muted-foreground mb-1">支付金额 / Amount</p>
            <p className="text-3xl font-bold text-destructive">
              ₹{parseFloat(amount).toLocaleString()}
            </p>
          </div>

          {/* Error Details */}
          <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">失败原因 / Reason</p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>

          {/* Transaction Details */}
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
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">时间 / Time</span>
              <span className="text-sm">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <Button 
            className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新支付 / Retry Payment
          </Button>
          {gateway?.support_email && (
            <Button 
              variant="outline" 
              className="w-full h-11" 
              onClick={() => window.location.href = `mailto:${gateway.support_email}?subject=Payment Issue - ${orderNo}`}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              联系客服 / Contact Support
            </Button>
          )}
          <Button 
            variant="ghost" 
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

export default PaymentFailed;