import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Check, Code, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MerchantCredentials {
  accountNumber: string;
  apiKey: string;
  payoutKey: string;
}

const MerchantDocumentation = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<MerchantCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPayoutKey, setShowPayoutKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user?.merchantId) return;

      try {
        const { data } = await supabase
          .from('merchants')
          .select('account_number, api_key, payout_key')
          .eq('id', user.merchantId)
          .single();

        if (data) {
          setCredentials({
            accountNumber: data.account_number,
            apiKey: data.api_key,
            payoutKey: data.payout_key,
          });
        }
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredentials();
  }, [user?.merchantId]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: t('common.copied') });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '********';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  const payinExample = `{
  "merchant_id": "${credentials?.accountNumber || '100888001'}",
  "api_key": "${credentials?.apiKey || 'your_api_key'}",
  "amount": "500.00",
  "merchant_order_no": "ORDER_${Date.now()}",
  "callback_url": "https://your-domain.com/callback",
  "extra": 0,
  "signature": "md5(merchant_id + amount + merchant_order_no + api_key + callback_url)"
}`;

  const payoutExample = `{
  "merchant_id": "${credentials?.accountNumber || '100888001'}",
  "amount": 150,
  "transaction_id": "WD_${Date.now()}",
  "account_number": "1234567890",
  "ifsc": "HDFC0001234",
  "name": "Account Holder Name",
  "bank_name": "HDFC Bank",
  "callback_url": "https://your-domain.com/payout-callback",
  "signature": "md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)"
}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('docs.title')}</h1>

        {/* API Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>{t('docs.credentials')}</CardTitle>
            <CardDescription>
              {language === 'zh' ? '您的API凭证用于API集成' : 'Your API credentials for integration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchants.accountNumber')}</p>
                    <p className="font-mono font-medium">{credentials?.accountNumber}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(credentials?.accountNumber || '', 'accountNumber')}
                  >
                    {copiedField === 'accountNumber' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchants.apiKey')}</p>
                    <p className="font-mono font-medium">
                      {showApiKey ? credentials?.apiKey : maskKey(credentials?.apiKey || '')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(credentials?.apiKey || '', 'apiKey')}
                    >
                      {copiedField === 'apiKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchants.payoutKey')}</p>
                    <p className="font-mono font-medium">
                      {showPayoutKey ? credentials?.payoutKey : maskKey(credentials?.payoutKey || '')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setShowPayoutKey(!showPayoutKey)}>
                      {showPayoutKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(credentials?.payoutKey || '', 'payoutKey')}
                    >
                      {copiedField === 'payoutKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* API Documentation Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="payin">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payin">{t('docs.payinApi')}</TabsTrigger>
                <TabsTrigger value="payout">{t('docs.payoutApi')}</TabsTrigger>
                <TabsTrigger value="callback">{t('docs.callback')}</TabsTrigger>
              </TabsList>

              <TabsContent value="payin" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('docs.endpoint')}</h3>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    POST https://api.bond-pays.com/v1/create
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.signature')}</h3>
                  <code className="block p-3 bg-muted rounded-lg text-sm break-all">
                    md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.example')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                    {payinExample}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.response')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "order_no": "20251024075901825014350",
  "payment_url": "https://cash.bondcash.com/20251024075901825014350",
  "message": ""
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="payout" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('docs.endpoint')}</h3>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    POST http://api.bond-pays.com/payout/payment.php
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.signature')}</h3>
                  <code className="block p-3 bg-muted rounded-lg text-sm break-all">
                    md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.example')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                    {payoutExample}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="callback" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '回调说明' : 'Callback Information'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {language === 'zh'
                      ? '当支付状态发生变化时，系统会向您配置的回调地址发送POST请求'
                      : 'When payment status changes, system will send POST request to your configured callback URL'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '代收回调示例' : 'Pay-in Callback Example'}
                  </h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "orderNo": "20251105205347935010403",
  "merchantOrder": "ORDER_1762356226_7932",
  "status": "success",
  "amount": 200,
  "createtime": "2025-11-05T20:53:47.937067",
  "updatetime": "2025-11-05T20:54:22.041635"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '代付回调示例' : 'Pay-out Callback Example'}
                  </h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "merchant_id": 100888001,
  "transaction_id": "WD_1764208563",
  "amount": "150.00",
  "status": "SUCCESS",
  "timestamp": "2025-11-27 07:27:14"
}`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDocumentation;
