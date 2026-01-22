import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertCircle, CheckCircle2, Clock, Shield, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

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

const PaymentPage = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [gateway, setGateway] = useState<GatewaySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!linkCode) {
        setError('无效的支付链接 / Invalid payment link');
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
          setError('支付链接不存在 / Payment link not found');
          setIsLoading(false);
          return;
        }

        setPaymentLink(linkData);

        // Check if expired
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError('此支付链接已过期 / This payment link has expired');
          setIsLoading(false);
          return;
        }

        // Check if inactive
        if (!linkData.is_active) {
          setError('此支付链接已停用 / This payment link is no longer active');
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
        setError('加载支付详情失败 / Failed to load payment details');
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
        params.append('reason', '银行拒绝交易 / Transaction declined by bank');
        navigate(`/payment-failed?${params.toString()}`);
      }
    }, 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-muted-foreground">加载支付详情 / Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="p-5 rounded-full bg-destructive/10 animate-pulse">
              <AlertCircle className="h-14 w-14 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">支付错误 / Payment Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
              返回首页 / Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--success))]/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 relative overflow-hidden backdrop-blur-sm bg-card/95">
        {/* Header with Branding */}
        <CardHeader className="text-center border-b border-border pb-6 bg-gradient-to-b from-muted/50 to-transparent">
          {gateway?.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name || 'Payment Gateway'} 
              className="h-14 mx-auto mb-4 object-contain drop-shadow-lg"
            />
          ) : (
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <CreditCard className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {gateway?.gateway_name || 'PayGate'}
              </span>
            </div>
          )}
          <CardTitle className="text-2xl font-bold">安全支付 / Secure Payment</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 mt-2">
            <Shield className="h-4 w-4 text-[hsl(var(--success))]" />
            {merchant?.merchant_name && `支付给 / Pay to: ${merchant.merchant_name}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Amount Display */}
          <div className="text-center py-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary/40 animate-pulse" />
            <p className="text-sm text-muted-foreground mb-2">支付金额 / Amount to Pay</p>
            <p className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              ₹{paymentLink?.amount.toLocaleString()}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            {paymentLink?.description && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground text-sm">描述 / Description</span>
                <span className="text-sm text-right max-w-[200px] font-medium">{paymentLink.description}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">链接代码 / Link Code</span>
              <code className="text-sm font-mono bg-background px-3 py-1.5 rounded-lg border">{paymentLink?.link_code}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">状态 / Status</span>
              <Badge className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                活跃 / Active
              </Badge>
            </div>
            {paymentLink?.expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">过期时间 / Expires</span>
                <span className="text-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(new Date(paymentLink.expires_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border pt-6 pb-8">
          <Button 
            className="w-full h-14 text-lg font-semibold btn-gradient-success shadow-lg hover:shadow-xl transition-all duration-300" 
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                处理中 / Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                立即支付 ₹{paymentLink?.amount.toLocaleString()} / Pay Now
              </>
            )}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>安全加密支付 / Secured & Encrypted by {gateway?.gateway_name || 'PayGate'}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentPage;
