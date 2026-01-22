import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
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
        setError('Invalid payment link');
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
          setError('Payment link not found');
          setIsLoading(false);
          return;
        }

        setPaymentLink(linkData);

        // Check if expired
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError('This payment link has expired');
          setIsLoading(false);
          return;
        }

        // Check if inactive
        if (!linkData.is_active) {
          setError('This payment link is no longer active');
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

        // Fetch gateway settings
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
        setError('Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [linkCode]);

  const handlePay = async () => {
    setIsProcessing(true);
    // Here you would integrate with the actual payment gateway
    // For now, we'll just show a processing state
    setTimeout(() => {
      setIsProcessing(false);
      // In a real implementation, redirect to payment gateway or show payment form
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-center">Payment Error</h2>
            <p className="text-muted-foreground text-center">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center border-b border-border pb-6">
          {gateway?.logo_url ? (
            <img 
              src={gateway.logo_url} 
              alt={gateway.gateway_name || 'Payment Gateway'} 
              className="h-12 mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">{gateway?.gateway_name || 'Payment'}</span>
            </div>
          )}
          <CardTitle className="text-2xl">Complete Payment</CardTitle>
          <CardDescription>
            {merchant?.merchant_name && `Pay to ${merchant.merchant_name}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Amount */}
          <div className="text-center py-6 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
            <p className="text-4xl font-bold text-primary">
              ₹{paymentLink?.amount.toLocaleString()}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {paymentLink?.description && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground text-sm">Description</span>
                <span className="text-sm text-right max-w-[200px]">{paymentLink.description}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Link Code</span>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{paymentLink?.link_code}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Status</span>
              <Badge className="bg-[hsl(var(--success))]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            {paymentLink?.expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Expires</span>
                <span className="text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(paymentLink.expires_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border pt-6">
          <Button 
            className="w-full h-12 text-lg btn-gradient-success" 
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay ₹{paymentLink?.amount.toLocaleString()}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Secured by {gateway?.gateway_name || 'Payment Gateway'}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentPage;
