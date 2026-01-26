import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Check, Terminal, FileCode, Download, Package, Zap, Shield } from 'lucide-react';
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
  gatewayName: string | null;
  gatewayType: string | null;
  currency: string | null;
  tradeType: string | null;
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

  // Use gateway name from settings for branding
  const gatewayName = settings.gatewayName || 'Payment Gateway';
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user?.merchantId) return;

      try {
        const { data } = await supabase
          .from('merchants')
          .select(`
            account_number, api_key, payout_key, payin_fee, payout_fee, trade_type,
            payment_gateways (gateway_name, gateway_type, currency)
          `)
          .eq('id', user.merchantId)
          .single();

        if (data) {
          const gateway = data.payment_gateways as any;
          setCredentials({
            accountNumber: data.account_number,
            apiKey: data.api_key,
            payoutKey: data.payout_key,
            payinFee: data.payin_fee || 0,
            payoutFee: data.payout_fee || 0,
            gatewayName: gateway?.gateway_name || null,
            gatewayType: gateway?.gateway_type || null,
            currency: gateway?.currency || 'INR',
            tradeType: data.trade_type || null,
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

  // Currency-specific helpers
  const getCurrencySymbol = () => {
    if (credentials?.currency === 'PKR') return 'Rs.';
    if (credentials?.currency === 'BDT') return '৳';
    return '₹';
  };

  const getCurrencyFlag = () => {
    if (credentials?.currency === 'PKR') return '🇵🇰';
    if (credentials?.currency === 'BDT') return '🇧🇩';
    return '🇮🇳';
  };

  const getPaymentMethods = () => {
    if (credentials?.currency === 'PKR') {
      return [
        { name: 'Easypaisa', code: 'easypaisa', color: 'bg-green-500', description: 'Mobile Wallet' },
        { name: 'JazzCash', code: 'jazzcash', color: 'bg-red-500', description: 'Mobile Wallet' }
      ];
    }
    if (credentials?.currency === 'BDT') {
      return [
        { name: 'Nagad', code: 'nagad', color: 'bg-orange-500', description: 'Mobile Wallet' },
        { name: 'bKash', code: 'bkash', color: 'bg-pink-500', description: 'Mobile Wallet' }
      ];
    }
    return [
      { name: 'UPI', code: 'INRUPI', color: 'bg-blue-500', description: 'UPI Payment' },
      { name: 'Bank Transfer', code: 'bank', color: 'bg-purple-500', description: 'IMPS/NEFT' }
    ];
  };

  // Dynamic examples based on currency
  const getPayinExample = () => {
    const baseParams = {
      merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
      amount: credentials?.currency === 'PKR' ? '2000.00' : credentials?.currency === 'BDT' ? '1000.00' : '500.00',
      merchant_order_no: `ORDER_${Date.now()}`,
      callback_url: 'https://your-domain.com/callback',
    };

    if (credentials?.currency === 'PKR') {
      return JSON.stringify({
        ...baseParams,
        trade_type: 'easypaisa',
        sign: 'YOUR_MD5_SIGNATURE'
      }, null, 2);
    }
    if (credentials?.currency === 'BDT') {
      return JSON.stringify({
        ...baseParams,
        trade_type: 'nagad',
        sign: 'YOUR_MD5_SIGNATURE'
      }, null, 2);
    }
    return JSON.stringify({
      ...baseParams,
      sign: 'YOUR_MD5_SIGNATURE'
    }, null, 2);
  };

  const getPayoutExample = () => {
    if (credentials?.currency === 'PKR') {
      return JSON.stringify({
        merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
        amount: 2000,
        transaction_id: `WD_${Date.now()}`,
        account_number: '03001234567',
        name: 'Account Holder Name',
        callback_url: 'https://your-domain.com/payout-callback',
        withdrawal_method: 'easypaisa',
        sign: 'YOUR_MD5_SIGNATURE'
      }, null, 2);
    }
    if (credentials?.currency === 'BDT') {
      return JSON.stringify({
        merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
        amount: 1000,
        transaction_id: `WD_${Date.now()}`,
        account_number: '01712345678',
        name: 'Account Holder Name',
        callback_url: 'https://your-domain.com/payout-callback',
        sign: 'YOUR_MD5_SIGNATURE'
      }, null, 2);
    }
    return JSON.stringify({
      merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
      amount: 150,
      transaction_id: `WD_${Date.now()}`,
      account_number: '1234567890',
      ifsc: 'HDFC0001234',
      name: 'Account Holder Name',
      bank_name: 'HDFC Bank',
      callback_url: 'https://your-domain.com/payout-callback',
      sign: 'YOUR_MD5_SIGNATURE'
    }, null, 2);
  };

  const getSignatureFormula = () => {
    if (credentials?.currency === 'PKR' || credentials?.currency === 'BDT') {
      return 'MD5(sorted_params + "&key=" + api_key).toUpperCase()';
    }
    return 'md5(merchant_id + amount + merchant_order_no + api_key + callback_url)';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{gatewayName} API</h1>
            <p className="text-muted-foreground">
              {language === 'zh' ? '完整API集成文档' : 'Complete API Integration Documentation'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {getCurrencyFlag()} {credentials?.currency || 'INR'}
            </Badge>
            <Badge className="bg-primary">{gatewayName} API v1.0</Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{credentials?.payinFee || 0}%</p>
              <p className="text-sm text-muted-foreground">{language === 'zh' ? '代收费率' : 'Pay-in Fee'}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{credentials?.payoutFee || 0}%</p>
              <p className="text-sm text-muted-foreground">{language === 'zh' ? '代付费率' : 'Pay-out Fee'}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Terminal className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">REST</p>
              <p className="text-sm text-muted-foreground">{language === 'zh' ? 'API类型' : 'API Type'}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <FileCode className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">JSON</p>
              <p className="text-sm text-muted-foreground">{language === 'zh' ? '数据格式' : 'Format'}</p>
            </CardContent>
          </Card>
        </div>

        {/* API Credentials Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {language === 'zh' ? '您的API凭证' : 'Your API Credentials'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' 
                ? '请妥善保管您的密钥，切勿泄露给第三方' 
                : 'Keep your credentials secure. Never share with third parties.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Merchant ID */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant ID</p>
                    <p className="font-mono font-bold text-lg">{credentials?.accountNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials?.accountNumber || '', 'merchantId')}
                  >
                    {copiedField === 'merchantId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* API Key */}
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      API Key <Badge variant="secondary" className="ml-2 text-xs">Pay-in</Badge>
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
                      Payout Key <Badge variant="secondary" className="ml-2 text-xs">Pay-out</Badge>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'zh' ? '支持的支付方式' : 'Supported Payment Methods'}</CardTitle>
            <CardDescription>
              {language === 'zh' 
                ? `${getCurrencyFlag()} ${credentials?.currency} 区域可用的支付渠道`
                : `Available payment channels for ${getCurrencyFlag()} ${credentials?.currency} region`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getPaymentMethods().map((method) => (
                <div key={method.code} className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors">
                  <div className={`w-12 h-12 ${method.color} rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold`}>
                    {method.name.charAt(0)}
                  </div>
                  <p className="font-semibold">{method.name}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                  {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') && (
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">{method.code}</code>
                  )}
                </div>
              ))}
            </div>
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
                <TabsTrigger value="payin">{language === 'zh' ? '代收' : 'Pay-in'}</TabsTrigger>
                <TabsTrigger value="payout">{language === 'zh' ? '代付' : 'Pay-out'}</TabsTrigger>
                <TabsTrigger value="signature">{language === 'zh' ? '签名' : 'Signature'}</TabsTrigger>
                <TabsTrigger value="callback">{language === 'zh' ? '回调' : 'Callback'}</TabsTrigger>
                <TabsTrigger value="sdk">SDK</TabsTrigger>
              </TabsList>

              {/* Pay-in Tab */}
              <TabsContent value="payin" className="space-y-6 mt-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge className="bg-green-500">POST</Badge>
                    {language === 'zh' ? '创建代收订单' : 'Create Pay-in Order'}
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
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '请求参数' : 'Request Parameters'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '参数' : 'Parameter'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '类型' : 'Type'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '必填' : 'Required'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '说明' : 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户ID' : 'Your Merchant ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '金额' : 'Amount'} ({getCurrencySymbol()})</td></tr>
                        <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户订单号' : 'Your Order ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '回调地址' : 'Callback URL'}</td></tr>
                        {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') && (
                          <tr className="bg-yellow-500/10">
                            <td className="p-3 border-b font-mono text-yellow-700">trade_type</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b font-bold text-yellow-700">✓</td>
                            <td className="p-3 border-b">
                              {credentials?.currency === 'PKR' && (
                                <span className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="bg-green-500/10">easypaisa</Badge>
                                  <Badge variant="outline" className="bg-red-500/10">jazzcash</Badge>
                                </span>
                              )}
                              {credentials?.currency === 'BDT' && (
                                <span className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="bg-orange-500/10">nagad</Badge>
                                  <Badge variant="outline" className="bg-pink-500/10">bkash</Badge>
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                        <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? 'MD5签名' : 'MD5 Signature'}</td></tr>
                        <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">{language === 'zh' ? '扩展数据' : 'Extra data (optional)'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="font-semibold text-yellow-700 mb-2">
                      ⚠️ {language === 'zh' ? '重要提示' : 'Important'}
                    </p>
                    <p className="text-sm text-yellow-600">
                      {credentials?.currency === 'PKR' 
                        ? (language === 'zh' 
                            ? 'PKR交易必须指定 trade_type 为 "easypaisa" 或 "jazzcash"'
                            : 'PKR transactions require trade_type: "easypaisa" or "jazzcash"')
                        : (language === 'zh'
                            ? 'BDT交易必须指定 trade_type 为 "nagad" 或 "bkash"'
                            : 'BDT transactions require trade_type: "nagad" or "bkash"')}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '请求示例' : 'Request Example'}</h3>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                      {getPayinExample()}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(getPayinExample(), 'payinExample')}
                    >
                      {copiedField === 'payinExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '响应示例' : 'Response Example'}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "order_no": "PI${Date.now()}ABC",
    "merchant_order_no": "YOUR_ORDER_NO",
    "amount": ${credentials?.currency === 'PKR' ? '2000.00' : credentials?.currency === 'BDT' ? '1000.00' : '500.00'},
    "payment_url": "https://pay.${settings.gatewayDomain || 'example.com'}/..."
  }
}`}
                  </pre>
                </div>
              </TabsContent>

              {/* Pay-out Tab */}
              <TabsContent value="payout" className="space-y-6 mt-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge className="bg-blue-500">POST</Badge>
                    {language === 'zh' ? '创建代付订单' : 'Create Pay-out Order'}
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
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '请求参数' : 'Request Parameters'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '参数' : 'Parameter'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '类型' : 'Type'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '必填' : 'Required'}</th>
                          <th className="text-left p-3 border-b">{language === 'zh' ? '说明' : 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户ID' : 'Your Merchant ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">number</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '金额' : 'Amount'} ({getCurrencySymbol()})</td></tr>
                        <tr><td className="p-3 border-b font-mono">transaction_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '交易ID' : 'Transaction ID'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">account_number</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">
                          {credentials?.currency === 'PKR' && (language === 'zh' ? '手机号码 (03xxxxxxxxx)' : 'Mobile Number (03xxxxxxxxx)')}
                          {credentials?.currency === 'BDT' && (language === 'zh' ? '手机号码 (01xxxxxxxxx)' : 'Mobile Number (01xxxxxxxxx)')}
                          {credentials?.currency === 'INR' && (language === 'zh' ? '银行账号' : 'Bank Account Number')}
                        </td></tr>
                        <tr><td className="p-3 border-b font-mono">name</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '收款人姓名' : 'Beneficiary Name'}</td></tr>
                        {credentials?.currency === 'INR' && (
                          <>
                            <tr><td className="p-3 border-b font-mono">ifsc</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">IFSC Code</td></tr>
                            <tr><td className="p-3 border-b font-mono">bank_name</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '银行名称' : 'Bank Name'}</td></tr>
                          </>
                        )}
                        {credentials?.currency === 'PKR' && (
                          <tr className="bg-blue-500/10">
                            <td className="p-3 border-b font-mono">withdrawal_method</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b">✓</td>
                            <td className="p-3 border-b">
                              <Badge variant="outline" className="bg-green-500/10 mr-2">easypaisa</Badge>
                              <Badge variant="outline" className="bg-red-500/10">jazzcash</Badge>
                            </td>
                          </tr>
                        )}
                        <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '回调地址' : 'Callback URL'}</td></tr>
                        <tr><td className="p-3 font-mono">sign</td><td className="p-3">string</td><td className="p-3">✓</td><td className="p-3">{language === 'zh' ? 'MD5签名' : 'MD5 Signature'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '请求示例' : 'Request Example'}</h3>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                      {getPayoutExample()}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(getPayoutExample(), 'payoutExample')}
                    >
                      {copiedField === 'payoutExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Signature Tab */}
              <TabsContent value="signature" className="space-y-6 mt-6">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '签名算法' : 'Signature Algorithm'}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'zh' 
                      ? '所有API请求都需要使用MD5签名进行验证'
                      : 'All API requests must be verified using MD5 signature'}
                  </p>
                  <code className="block p-4 bg-muted rounded-lg text-sm font-mono">
                    {getSignatureFormula()}
                  </code>
                </div>

                {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold">{language === 'zh' ? '签名步骤' : 'Signature Steps'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Badge>1</Badge>
                        <div>
                          <p className="font-medium">{language === 'zh' ? '过滤空值' : 'Filter Empty Values'}</p>
                          <p className="text-sm text-muted-foreground">{language === 'zh' ? '移除所有空值参数和sign参数' : 'Remove all empty parameters and the sign parameter'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Badge>2</Badge>
                        <div>
                          <p className="font-medium">{language === 'zh' ? 'ASCII排序' : 'ASCII Sort'}</p>
                          <p className="text-sm text-muted-foreground">{language === 'zh' ? '按参数名ASCII顺序排序' : 'Sort parameters by ASCII order'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Badge>3</Badge>
                        <div>
                          <p className="font-medium">{language === 'zh' ? '拼接字符串' : 'Concatenate String'}</p>
                          <p className="text-sm text-muted-foreground">key1=value1&key2=value2&key=YOUR_API_KEY</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Badge>4</Badge>
                        <div>
                          <p className="font-medium">{language === 'zh' ? 'MD5哈希并转大写' : 'MD5 Hash & Uppercase'}</p>
                          <p className="text-sm text-muted-foreground">MD5(string).toUpperCase()</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{language === 'zh' ? '代码示例' : 'Code Example'}</h3>
                      <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`// JavaScript
function generateSign(params, apiKey) {
  // Filter empty values and sort
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b));
  
  // Create query string
  const str = filtered.map(([k, v]) => \`\${k}=\${v}\`).join('&');
  
  // Append key and hash
  return md5(str + '&key=' + apiKey).toUpperCase();
}`}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold">{language === 'zh' ? 'Pay-in签名' : 'Pay-in Signature'}</h3>
                    <code className="block p-4 bg-muted rounded-lg text-sm font-mono">
                      sign = md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                    </code>
                    
                    <h3 className="font-semibold">{language === 'zh' ? 'Pay-out签名' : 'Pay-out Signature'}</h3>
                    <code className="block p-4 bg-muted rounded-lg text-sm font-mono break-all">
                      sign = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                    </code>
                    <p className="text-sm text-muted-foreground">
                      ⚠️ {language === 'zh' ? '参数按字母顺序拼接' : 'Parameters concatenated in alphabetical order'}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Callback Tab */}
              <TabsContent value="callback" className="space-y-6 mt-6">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="font-semibold mb-2 text-yellow-700">
                    ⚠️ {language === 'zh' ? '回调注意事项' : 'Callback Guidelines'}
                  </h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {language === 'zh' ? '使用HTTPS端点' : 'Use HTTPS endpoints'}</li>
                    <li>• {language === 'zh' ? '3秒内响应' : 'Respond within 3 seconds'}</li>
                    <li>• {language === 'zh' ? '返回 "ok" 确认收到' : 'Return "ok" to acknowledge'}</li>
                    <li>• {language === 'zh' ? '实现幂等性处理' : 'Implement idempotent handling'}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '回调示例' : 'Callback Example'}</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`POST https://your-domain.com/callback
Content-Type: application/json

{
  "orderNo": "PI${Date.now()}",
  "merchantOrder": "YOUR_ORDER_NO",
  "status": "success",
  "amount": ${credentials?.currency === 'PKR' ? '2000.00' : credentials?.currency === 'BDT' ? '1000.00' : '500.00'},
  "timestamp": "${new Date().toISOString()}"
}

// Your Response
HTTP/1.1 200 OK
ok`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{language === 'zh' ? '状态说明' : 'Status Values'}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                      <Badge className="bg-green-500">success</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '成功' : 'Success'}</p>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
                      <Badge className="bg-yellow-500">pending</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '处理中' : 'Processing'}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                      <Badge className="bg-red-500">failed</Badge>
                      <p className="text-sm mt-2">{language === 'zh' ? '失败' : 'Failed'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SDK Tab */}
              <TabsContent value="sdk" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => downloadFile('paygate-sdk.js')}>
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">JS</span>
                      </div>
                      <h3 className="font-semibold">JavaScript SDK</h3>
                      <p className="text-sm text-muted-foreground mb-3">Node.js / Browser</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => downloadFile('paygate-sdk.ts')}>
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">TS</span>
                      </div>
                      <h3 className="font-semibold">TypeScript SDK</h3>
                      <p className="text-sm text-muted-foreground mb-3">Type-safe Integration</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => downloadFile('PayGateSDK.php')}>
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-purple-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">PHP</span>
                      </div>
                      <h3 className="font-semibold">PHP SDK</h3>
                      <p className="text-sm text-muted-foreground mb-3">Laravel / WordPress</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'zh' ? '快速开始' : 'Quick Start'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`// JavaScript Example
const PayGate = require('./paygate-sdk');

const client = new PayGate({
  merchantId: '${credentials?.accountNumber || 'YOUR_MERCHANT_ID'}',
  apiKey: 'YOUR_API_KEY',
  payoutKey: 'YOUR_PAYOUT_KEY'
});

// Create Pay-in
const order = await client.createPayin({
  amount: ${credentials?.currency === 'PKR' ? '2000' : credentials?.currency === 'BDT' ? '1000' : '500'},
  orderNo: 'ORDER_123',
  callbackUrl: 'https://your-site.com/callback'${(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') ? `,
  tradeType: '${credentials?.currency === 'PKR' ? 'easypaisa' : 'nagad'}'` : ''}
});

console.log(order.payment_url);`}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDocumentation;
