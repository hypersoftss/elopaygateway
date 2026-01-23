import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Check, Terminal, FileCode, Download, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { supabase } from '@/integrations/supabase/client';

interface MerchantCredentials {
  accountNumber: string;
  apiKey: string;
  payoutKey: string;
  payinFee: number;
  payoutFee: number;
}

const MerchantDocumentation = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { settings } = useGatewaySettings();
  const [credentials, setCredentials] = useState<MerchantCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPayoutKey, setShowPayoutKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get base API URL from Supabase
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user?.merchantId) return;

      try {
        const { data } = await supabase
          .from('merchants')
          .select('account_number, api_key, payout_key, payin_fee, payout_fee')
          .eq('id', user.merchantId)
          .single();

        if (data) {
          setCredentials({
            accountNumber: data.account_number,
            apiKey: data.api_key,
            payoutKey: data.payout_key,
            payinFee: data.payin_fee || 0,
            payoutFee: data.payout_fee || 0,
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

  const downloadFile = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/sdk/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: language === 'zh' ? '下载开始' : 'Download Started',
      description: filename
    });
  };

  const maskKey = (key: string) => {
    if (!key || key.length <= 8) return '********';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  const payinExample = `{
  "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
  "amount": "500.00",
  "merchant_order_no": "ORDER_${Date.now()}",
  "callback_url": "https://your-domain.com/callback",
  "extra": "optional_reference",
  "sign": "md5(merchant_id + amount + merchant_order_no + api_key + callback_url)"
}`;

  const payoutExample = `{
  "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
  "amount": 150,
  "transaction_id": "WD_${Date.now()}",
  "account_number": "1234567890",
  "ifsc": "HDFC0001234",
  "name": "Account Holder Name",
  "bank_name": "HDFC Bank",
  "callback_url": "https://your-domain.com/payout-callback",
  "sign": "md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)"
}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('docs.title')}</h1>
          <Badge variant="outline" className="text-sm">
            {settings.gatewayName} API v1.0
          </Badge>
        </div>

        {/* API Credentials Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {t('docs.credentials')}
            </CardTitle>
            <CardDescription>
              {language === 'zh' 
                ? '您的专属API凭证，用于接入支付系统' 
                : 'Your exclusive API credentials for payment integration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Merchant ID */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchants.accountNumber')}</p>
                    <p className="font-mono font-bold text-lg">{credentials?.accountNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials?.accountNumber || '', 'accountNumber')}
                  >
                    {copiedField === 'accountNumber' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* API Key */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('merchants.apiKey')} 
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {language === 'zh' ? '代收' : 'Pay-in'}
                      </Badge>
                    </p>
                    <p className="font-mono font-medium">
                      {showApiKey ? credentials?.apiKey : maskKey(credentials?.apiKey || '')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(credentials?.apiKey || '', 'apiKey')}
                    >
                      {copiedField === 'apiKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Payout Key */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('merchants.payoutKey')}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {language === 'zh' ? '代付' : 'Pay-out'}
                      </Badge>
                    </p>
                    <p className="font-mono font-medium">
                      {showPayoutKey ? credentials?.payoutKey : maskKey(credentials?.payoutKey || '')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowPayoutKey(!showPayoutKey)}>
                      {showPayoutKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(credentials?.payoutKey || '', 'payoutKey')}
                    >
                      {copiedField === 'payoutKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Fee Information */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm text-muted-foreground">{t('merchants.payinFee')}</p>
                    <p className="text-2xl font-bold text-green-500">{credentials?.payinFee}%</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-muted-foreground">{t('merchants.payoutFee')}</p>
                    <p className="text-2xl font-bold text-blue-500">{credentials?.payoutFee}%</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Documentation Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {language === 'zh' ? 'API接口文档' : 'API Reference'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="payin">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="payin">{t('docs.payinApi')}</TabsTrigger>
                <TabsTrigger value="payout">{t('docs.payoutApi')}</TabsTrigger>
                <TabsTrigger value="callback">{t('docs.callback')}</TabsTrigger>
                <TabsTrigger value="curl" className="flex items-center gap-1">
                  <Terminal className="h-3 w-3" />
                  cURL
                </TabsTrigger>
                <TabsTrigger value="sdk" className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  SDK
                </TabsTrigger>
              </TabsList>

              <TabsContent value="payin" className="space-y-6 mt-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>POST</Badge>
                    {t('docs.endpoint')}
                  </h3>
                  <div className="relative">
                    <code className="block p-4 bg-muted rounded-lg text-sm font-mono">
                      {apiBaseUrl}/payin
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/payin`, 'payinEndpoint')}
                    >
                      {copiedField === 'payinEndpoint' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.parameters')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '字段' : 'Field'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '类型' : 'Type'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '必填' : 'Required'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '说明' : 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户ID' : 'Merchant ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '金额 (INR)' : 'Amount (INR)'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户订单号' : 'Merchant Order No'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '回调地址' : 'Callback URL'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? 'MD5签名' : 'MD5 Signature'}</td></tr>
                        <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">{language === 'zh' ? '扩展字段' : 'Extra data'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.signature')}</h3>
                  <code className="block p-4 bg-muted rounded-lg text-sm break-all font-mono">
                    sign = md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.example')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                    {payinExample}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.response')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "order_no": "PI1737569847123ABC",
    "merchant_order_no": "YOUR_ORDER_NO",
    "amount": 500.00,
    "fee": 45.00,
    "net_amount": 455.00,
    "payment_url": "https://pay.example.com/PI1737569847123ABC",
    "status": "pending"
  }
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="payout" className="space-y-6 mt-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>POST</Badge>
                    {t('docs.endpoint')}
                  </h3>
                  <div className="relative">
                    <code className="block p-4 bg-muted rounded-lg text-sm font-mono">
                      {apiBaseUrl}/payout
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/payout`, 'payoutEndpoint')}
                    >
                      {copiedField === 'payoutEndpoint' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.parameters')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '字段' : 'Field'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '类型' : 'Type'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '必填' : 'Required'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '说明' : 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户ID' : 'Merchant ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">number</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '金额 (INR)' : 'Amount (INR)'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">transaction_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户交易号' : 'Transaction ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">account_number</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '收款账号' : 'Bank Account'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">ifsc</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">IFSC Code</td></tr>
                        <tr><td className="p-3 border-b font-mono">name</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '收款人姓名' : 'Account Holder'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">bank_name</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '银行名称' : 'Bank Name'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '回调地址' : 'Callback URL'}</td></tr>
                        <tr><td className="p-3 font-mono">sign</td><td className="p-3">string</td><td className="p-3">✓</td><td className="p-3">{language === 'zh' ? 'MD5签名' : 'MD5 Signature'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.signature')}</h3>
                  <code className="block p-4 bg-muted rounded-lg text-sm break-all font-mono">
                    sign = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                  </code>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === 'zh' ? '⚠️ 注意: 参数按字母顺序排列' : '⚠️ Note: Parameters in alphabetical order'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.example')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                    {payoutExample}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('docs.response')}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`{
  "code": 200,
  "message": "Success",
  "status": "success",
  "data": {
    "order_no": "PO1737569847123XYZ",
    "merchant_order_no": "WD_1737569847",
    "amount": 150.00,
    "fee": 6.00,
    "total_amount": 156.00,
    "status": "pending"
  }
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="callback" className="space-y-6 mt-6">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="font-semibold mb-2 text-yellow-600">
                    {language === 'zh' ? '⚠️ 重要提示' : '⚠️ Important'}
                  </h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {language === 'zh' ? '使用 HTTPS 端点接收回调' : 'Use HTTPS endpoints for callbacks'}</li>
                    <li>• {language === 'zh' ? '回调需在3秒内响应' : 'Respond within 3 seconds'}</li>
                    <li>• {language === 'zh' ? '实现幂等性处理重复回调' : 'Implement idempotency for duplicate callbacks'}</li>
                    <li>• {language === 'zh' ? '记录所有回调用于调试' : 'Log all callbacks for debugging'}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '代收回调示例' : 'Pay-in Callback Example'}
                  </h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`POST https://your-domain.com/callback
Content-Type: application/json

{
  "orderNo": "PI1737569847123ABC",
  "merchantOrder": "YOUR_ORDER_NO",
  "status": "success",
  "amount": 500.00,
  "fee": 45.00,
  "net_amount": 455.00,
  "timestamp": "2025-01-22T12:30:45.000Z"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '代付回调示例' : 'Pay-out Callback Example'}
                  </h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`POST https://your-domain.com/payout-callback
Content-Type: application/json

{
  "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
  "transaction_id": "WD_1737569847",
  "amount": "150.00",
  "status": "SUCCESS",
  "timestamp": "2025-01-22T12:30:45.000Z"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '状态值说明' : 'Status Values'}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                      <Badge className="bg-green-500 text-white">success / SUCCESS</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '支付成功' : 'Payment successful'}</p>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
                      <Badge className="bg-yellow-500 text-white">pending</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '处理中' : 'Processing'}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                      <Badge className="bg-red-500 text-white">failed / FAILED</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '支付失败' : 'Payment failed'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'zh' ? '响应示例' : 'Response Example'}
                  </h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "message": "Callback received successfully"
}`}
                  </pre>
                </div>
              </TabsContent>

              {/* cURL Examples Tab */}
              <TabsContent value="curl" className="space-y-6 mt-6">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    {language === 'zh' ? 'cURL 命令示例' : 'cURL Command Examples'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' 
                      ? '直接在终端中测试API请求' 
                      : 'Test API requests directly from your terminal'}
                  </p>
                </div>

                {/* Payin cURL */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge className="bg-green-500">POST</Badge>
                      {language === 'zh' ? '代收请求' : 'Pay-in Request'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`curl -X POST '${apiBaseUrl}/payin' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
    "amount": "500.00",
    "merchant_order_no": "ORDER_${Date.now()}",
    "callback_url": "https://your-domain.com/callback",
    "sign": "YOUR_MD5_SIGNATURE"
  }'`, 'curlPayin')}
                    >
                      {copiedField === 'curlPayin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono whitespace-pre-wrap">
{`curl -X POST '${apiBaseUrl}/payin' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
    "amount": "500.00",
    "merchant_order_no": "ORDER_${Date.now()}",
    "callback_url": "https://your-domain.com/callback",
    "sign": "YOUR_MD5_SIGNATURE"
  }'`}
                  </pre>
                </div>

                {/* Payout cURL */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge className="bg-blue-500">POST</Badge>
                      {language === 'zh' ? '代付请求' : 'Pay-out Request'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`curl -X POST '${apiBaseUrl}/payout' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
    "amount": 1500,
    "transaction_id": "WD_${Date.now()}",
    "account_number": "1234567890",
    "ifsc": "HDFC0001234",
    "name": "Account Holder Name",
    "bank_name": "HDFC Bank",
    "callback_url": "https://your-domain.com/payout-callback",
    "sign": "YOUR_MD5_SIGNATURE"
  }'`, 'curlPayout')}
                    >
                      {copiedField === 'curlPayout' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono whitespace-pre-wrap">
{`curl -X POST '${apiBaseUrl}/payout' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "merchant_id": "${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}",
    "amount": 1500,
    "transaction_id": "WD_${Date.now()}",
    "account_number": "1234567890",
    "ifsc": "HDFC0001234",
    "name": "Account Holder Name",
    "bank_name": "HDFC Bank",
    "callback_url": "https://your-domain.com/payout-callback",
    "sign": "YOUR_MD5_SIGNATURE"
  }'`}
                  </pre>
                </div>

                {/* Signature Generation Tip */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h4 className="font-semibold mb-2 text-yellow-600">
                    {language === 'zh' ? '签名生成提示' : 'Signature Generation Tip'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'zh' 
                      ? '使用以下命令在终端生成MD5签名:' 
                      : 'Generate MD5 signature in terminal:'}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Bash / Linux / Mac</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`echo -n "${credentials?.accountNumber || 'MERCHANT_ID'}500.00ORDER_123${credentials?.apiKey || 'API_KEY'}https://callback.url" | md5sum`, 'bashMd5')}
                    >
                      {copiedField === 'bashMd5' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted rounded text-xs font-mono">
{`# Payin signature
echo -n "${credentials?.accountNumber || 'MERCHANT_ID'}500.00ORDER_123${credentials?.apiKey || 'API_KEY'}https://callback.url" | md5sum

# Payout signature (alphabetical order)
echo -n "1234567890150HDFC Bankhttps://callbackHDFC0001234${credentials?.accountNumber || 'MERCHANT_ID'}NameWD_123${credentials?.payoutKey || 'PAYOUT_KEY'}" | md5sum`}
                  </pre>
                </div>

                {/* Windows PowerShell */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Windows PowerShell</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`$str = "${credentials?.accountNumber || 'MERCHANT_ID'}500.00ORDER_123${credentials?.apiKey || 'API_KEY'}https://callback.url"
$md5 = [System.Security.Cryptography.MD5]::Create()
$hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($str))
[BitConverter]::ToString($hash).Replace("-","").ToLower()`, 'psMd5')}
                    >
                      {copiedField === 'psMd5' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
{`$str = "${credentials?.accountNumber || 'MERCHANT_ID'}500.00ORDER_123${credentials?.apiKey || 'API_KEY'}https://callback.url"
$md5 = [System.Security.Cryptography.MD5]::Create()
$hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($str))
[BitConverter]::ToString($hash).Replace("-","").ToLower()`}
                  </pre>
                </div>
              </TabsContent>

              {/* SDK Download Tab */}
              <TabsContent value="sdk" className="space-y-6 mt-6">
                {/* SDK Download Cards */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    {language === 'zh' ? '下载 SDK' : 'Download SDK'}
                  </h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    {/* JavaScript SDK */}
                    <Card className="bg-card hover:shadow-md transition-shadow border-yellow-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <FileCode className="h-6 w-6 text-yellow-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold">JavaScript</h4>
                            <p className="text-xs text-muted-foreground">Browser / Node.js</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => downloadFile('paygate-sdk.js')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          .js
                        </Button>
                      </CardContent>
                    </Card>

                    {/* TypeScript SDK */}
                    <Card className="bg-card hover:shadow-md transition-shadow border-blue-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <FileCode className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold">TypeScript</h4>
                            <p className="text-xs text-muted-foreground">Full Type Support</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile('paygate-sdk.ts')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          .ts
                        </Button>
                      </CardContent>
                    </Card>

                    {/* PHP SDK */}
                    <Card className="bg-card hover:shadow-md transition-shadow border-purple-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <FileCode className="h-6 w-6 text-purple-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold">PHP</h4>
                            <p className="text-xs text-muted-foreground">Laravel / Native</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile('PayGateSDK.php')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          .php
                        </Button>
                      </CardContent>
                    </Card>

                    {/* README */}
                    <Card className="bg-card hover:shadow-md transition-shadow border-green-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <FileCode className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold">README</h4>
                            <p className="text-xs text-muted-foreground">Documentation</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadFile('README.md')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          .md
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Quick Start Examples */}
                <div>
                  <h3 className="font-semibold mb-4">{language === 'zh' ? '快速开始' : 'Quick Start'}</h3>
                  
                  {/* JavaScript Example */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-yellow-500/10">JavaScript</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`const sdk = new PayGateSDK({
  merchantId: '${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}',
  apiKey: '${credentials?.apiKey || 'YOUR_API_KEY'}',
  payoutKey: '${credentials?.payoutKey || 'YOUR_PAYOUT_KEY'}',
  baseUrl: '${apiBaseUrl}'
});

// Payin
const result = await sdk.createPayin({
  amount: '500.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://your-site.com/callback'
});
window.location.href = result.data.payment_url;`, 'jsExample')}
                      >
                        {copiedField === 'jsExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`const sdk = new PayGateSDK({
  merchantId: '${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}',
  apiKey: '${credentials?.apiKey || 'YOUR_API_KEY'}',
  payoutKey: '${credentials?.payoutKey || 'YOUR_PAYOUT_KEY'}',
  baseUrl: '${apiBaseUrl}'
});

// Payin
const result = await sdk.createPayin({
  amount: '500.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://your-site.com/callback'
});
window.location.href = result.data.payment_url;`}
                    </pre>
                  </div>

                  {/* PHP Example */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-purple-500/10">PHP</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`<?php
require_once 'PayGateSDK.php';

$sdk = new PayGateSDK([
    'merchantId' => '${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}',
    'apiKey' => '${credentials?.apiKey || 'YOUR_API_KEY'}',
    'payoutKey' => '${credentials?.payoutKey || 'YOUR_PAYOUT_KEY'}',
    'baseUrl' => '${apiBaseUrl}'
]);

// Payin
$result = $sdk->createPayin([
    'amount' => '500.00',
    'orderNo' => 'ORDER_' . time(),
    'callbackUrl' => 'https://your-site.com/callback'
]);
header('Location: ' . $result['data']['payment_url']);`, 'phpExample')}
                      >
                        {copiedField === 'phpExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`<?php
require_once 'PayGateSDK.php';

$sdk = new PayGateSDK([
    'merchantId' => '${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}',
    'apiKey' => '${credentials?.apiKey || 'YOUR_API_KEY'}',
    'payoutKey' => '${credentials?.payoutKey || 'YOUR_PAYOUT_KEY'}',
    'baseUrl' => '${apiBaseUrl}'
]);

// Payin
$result = $sdk->createPayin([
    'amount' => '500.00',
    'orderNo' => 'ORDER_' . time(),
    'callbackUrl' => 'https://your-site.com/callback'
]);
header('Location: ' . $result['data']['payment_url']);`}
                    </pre>
                  </div>
                </div>

                {/* Payout Example */}
                <div>
                  <h3 className="font-semibold mb-4">{language === 'zh' ? '代付示例' : 'Payout Example'}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{language === 'zh' ? '通用' : 'Universal'}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`// JavaScript / PHP
const payout = await sdk.createPayout({
  amount: 5000,
  transactionId: 'WD_' + Date.now(),
  accountNumber: '1234567890',
  ifsc: 'HDFC0001234',
  name: 'Account Holder Name',
  bankName: 'HDFC Bank',
  callbackUrl: 'https://your-site.com/payout-callback'
});

console.log('Order:', payout.data.order_no);
console.log('Status:', payout.data.status); // 'pending'`, 'payoutExample')}
                    >
                      {copiedField === 'payoutExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`// JavaScript / PHP
const payout = await sdk.createPayout({
  amount: 5000,
  transactionId: 'WD_' + Date.now(),
  accountNumber: '1234567890',
  ifsc: 'HDFC0001234',
  name: 'Account Holder Name',
  bankName: 'HDFC Bank',
  callbackUrl: 'https://your-site.com/payout-callback'
});

console.log('Order:', payout.data.order_no);
console.log('Status:', payout.data.status); // 'pending'`}
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
