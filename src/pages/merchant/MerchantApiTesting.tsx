import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Hash, Play, TestTube, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { md5 } from 'js-md5';

interface MerchantInfo {
  account_number: string;
  api_key: string;
  payout_key: string;
  merchant_name: string;
}

const MerchantApiTesting = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payin form
  const [payinAmount, setPayinAmount] = useState('100');
  const [payinOrderNo, setPayinOrderNo] = useState('');
  const [payinCallbackUrl, setPayinCallbackUrl] = useState('https://example.com/callback');
  const [payinSignature, setPayinSignature] = useState('');
  const [isSubmittingPayin, setIsSubmittingPayin] = useState(false);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState('100');
  const [payoutTransactionId, setPayoutTransactionId] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('1234567890');
  const [payoutIfsc, setPayoutIfsc] = useState('HDFC0001234');
  const [payoutAccountHolder, setPayoutAccountHolder] = useState('Test User');
  const [payoutBankName, setPayoutBankName] = useState('HDFC Bank');
  const [payoutCallbackUrl, setPayoutCallbackUrl] = useState('https://example.com/payout-callback');
  const [payoutSignature, setPayoutSignature] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const fetchMerchantInfo = async () => {
    if (!user?.merchantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('account_number, api_key, payout_key, merchant_name')
        .eq('id', user.merchantId)
        .single();

      if (error) throw error;
      setMerchantInfo(data);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantInfo();
  }, [user?.merchantId]);

  const generatePayinSignature = () => {
    if (!merchantInfo) return;
    
    const orderNo = payinOrderNo || `TEST_${Date.now()}`;
    setPayinOrderNo(orderNo);
    
    // MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const signString = `${merchantInfo.account_number}${payinAmount}${orderNo}${merchantInfo.api_key}${payinCallbackUrl}`;
    const signature = md5(signString);
    setPayinSignature(signature);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '签名已生成' : 'Signature generated',
    });
  };

  const generatePayoutSignature = () => {
    if (!merchantInfo) return;
    
    const txId = payoutTransactionId || `WD_${Date.now()}`;
    setPayoutTransactionId(txId);
    
    // MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
    const signString = `${payoutAccountNumber}${payoutAmount}${payoutBankName}${payoutCallbackUrl}${payoutIfsc}${merchantInfo.account_number}${payoutAccountHolder}${txId}${merchantInfo.payout_key}`;
    const signature = md5(signString);
    setPayoutSignature(signature);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '签名已生成' : 'Signature generated',
    });
  };

  const submitPayinRequest = async () => {
    if (!merchantInfo || !payinSignature) return;

    setIsSubmittingPayin(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: merchantInfo.account_number,
            amount: payinAmount,
            merchant_order_no: payinOrderNo,
            callback_url: payinCallbackUrl,
            sign: payinSignature,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      toast({
        title: t('common.success'),
        description: `Order: ${result.order_no}`,
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayin(false);
    }
  };

  const submitPayoutRequest = async () => {
    if (!merchantInfo || !payoutSignature) return;

    setIsSubmittingPayout(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: merchantInfo.account_number,
            amount: payoutAmount,
            transaction_id: payoutTransactionId,
            account_number: payoutAccountNumber,
            ifsc: payoutIfsc,
            name: payoutAccountHolder,
            bank_name: payoutBankName,
            callback_url: payoutCallbackUrl,
            sign: payoutSignature,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      toast({
        title: t('common.success'),
        description: `Order: ${result.order_no}`,
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '已复制' : 'Copied',
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
              <TestTube className="h-6 w-6 text-[hsl(var(--success))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{language === 'zh' ? 'API测试' : 'API Testing'}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '使用您的凭证测试Payin/Payout API' : 'Test Payin/Payout APIs using your credentials'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchMerchantInfo}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Merchant Info */}
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5" />
              {language === 'zh' ? '您的API凭证' : 'Your API Credentials'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '以下是您的商户凭证信息' : 'Below are your merchant credentials for API testing'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">{language === 'zh' ? '商户ID' : 'Merchant ID'}</Label>
                <div className="flex gap-2">
                  <Input value={merchantInfo?.account_number || ''} readOnly className="bg-muted/50" />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(merchantInfo?.account_number || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">{language === 'zh' ? 'API密钥 (Payin)' : 'API Key (Payin)'}</Label>
                <div className="flex gap-2">
                  <Input type="password" value={merchantInfo?.api_key || ''} readOnly className="bg-muted/50" />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(merchantInfo?.api_key || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">{language === 'zh' ? 'Payout密钥' : 'Payout Key'}</Label>
                <div className="flex gap-2">
                  <Input type="password" value={merchantInfo?.payout_key || ''} readOnly className="bg-muted/50" />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(merchantInfo?.payout_key || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Testing Tabs */}
        <Tabs defaultValue="payin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payin" className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[hsl(var(--success))] rounded-full flex items-center justify-center text-white text-xs">⊕</span>
              {language === 'zh' ? 'Payin API测试' : 'Payin API Test'}
            </TabsTrigger>
            <TabsTrigger value="payout" className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[hsl(var(--warning))] rounded-full flex items-center justify-center text-white text-xs">⊖</span>
              {language === 'zh' ? 'Payout API测试' : 'Payout API Test'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payin">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '测试Payin API' : 'Test Payin API'}</CardTitle>
                <CardDescription className="font-mono text-xs bg-muted p-2 rounded">
                  MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '金额 (₹)' : 'Amount (₹)'}</Label>
                    <Input
                      type="number"
                      value={payinAmount}
                      onChange={(e) => setPayinAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '商户订单号' : 'Merchant Order No'}</Label>
                    <Input
                      value={payinOrderNo}
                      onChange={(e) => setPayinOrderNo(e.target.value)}
                      placeholder={language === 'zh' ? '自动生成(留空)' : 'Auto-generated if empty'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '回调URL' : 'Callback URL'}</Label>
                  <Input
                    value={payinCallbackUrl}
                    onChange={(e) => setPayinCallbackUrl(e.target.value)}
                    placeholder="https://example.com/callback"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generatePayinSignature}>
                    <Hash className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '生成签名' : 'Generate Signature'}
                  </Button>
                </div>
                {payinSignature && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">{language === 'zh' ? '签名' : 'Signature'}</Label>
                    <p className="font-mono text-sm break-all">{payinSignature}</p>
                  </div>
                )}
                <Button 
                  className="w-full btn-gradient-success" 
                  onClick={submitPayinRequest}
                  disabled={isSubmittingPayin || !payinSignature}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmittingPayin ? t('common.loading') : (language === 'zh' ? '发送Payin请求' : 'Send Payin Request')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '测试Payout API' : 'Test Payout API'}</CardTitle>
                <CardDescription className="font-mono text-xs bg-muted p-2 rounded">
                  MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {language === 'zh' 
                      ? '注意：Payout请求会从您的余额中扣款' 
                      : 'Note: Payout requests will deduct from your balance'}
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '金额 (₹)' : 'Amount (₹)'}</Label>
                    <Input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '交易ID' : 'Transaction ID'}</Label>
                    <Input
                      value={payoutTransactionId}
                      onChange={(e) => setPayoutTransactionId(e.target.value)}
                      placeholder={language === 'zh' ? '自动生成(留空)' : 'Auto-generated if empty'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '收款人姓名' : 'Account Holder Name'}</Label>
                    <Input
                      value={payoutAccountHolder}
                      onChange={(e) => setPayoutAccountHolder(e.target.value)}
                      placeholder="Test User"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '银行账号' : 'Bank Account Number'}</Label>
                    <Input
                      value={payoutAccountNumber}
                      onChange={(e) => setPayoutAccountNumber(e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '银行名称' : 'Bank Name'}</Label>
                    <Input
                      value={payoutBankName}
                      onChange={(e) => setPayoutBankName(e.target.value)}
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC</Label>
                    <Input
                      value={payoutIfsc}
                      onChange={(e) => setPayoutIfsc(e.target.value)}
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '回调URL' : 'Callback URL'}</Label>
                  <Input
                    value={payoutCallbackUrl}
                    onChange={(e) => setPayoutCallbackUrl(e.target.value)}
                    placeholder="https://example.com/payout-callback"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={generatePayoutSignature}>
                    <Hash className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '生成签名' : 'Generate Signature'}
                  </Button>
                </div>
                
                {payoutSignature && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">{language === 'zh' ? '签名' : 'Signature'}</Label>
                    <p className="font-mono text-sm break-all">{payoutSignature}</p>
                  </div>
                )}
                
                <Button 
                  className="w-full btn-gradient-warning" 
                  onClick={submitPayoutRequest}
                  disabled={isSubmittingPayout || !payoutSignature}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmittingPayout ? t('common.loading') : (language === 'zh' ? '发送Payout请求' : 'Send Payout Request')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MerchantApiTesting;
