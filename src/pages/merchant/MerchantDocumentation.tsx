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

  // Get base API URL from Supabase
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

  // Dynamic payin example based on currency
  const getPayinExample = () => {
    const baseExample = {
      merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
      amount: '500.00',
      merchant_order_no: `ORDER_${Date.now()}`,
      callback_url: 'https://your-domain.com/callback',
      extra: 'optional_reference',
    };

    // Add trade_type for PKR/BDT
    if (credentials?.currency === 'PKR') {
      return `{
  "merchant_id": "${baseExample.merchant_id}",
  "amount": "${baseExample.amount}",
  "merchant_order_no": "${baseExample.merchant_order_no}",
  "callback_url": "${baseExample.callback_url}",
  "trade_type": "easypaisa",  // or "jazzcash"
  "extra": "optional_reference",
  "sign": "MD5(ASCII sorted params + &key=api_key).toUpperCase()"
}`;
    }
    
    if (credentials?.currency === 'BDT') {
      return `{
  "merchant_id": "${baseExample.merchant_id}",
  "amount": "${baseExample.amount}",
  "merchant_order_no": "${baseExample.merchant_order_no}",
  "callback_url": "${baseExample.callback_url}",
  "trade_type": "nagad",  // or "bkash"
  "extra": "optional_reference",
  "sign": "MD5(ASCII sorted params + &key=api_key).toUpperCase()"
}`;
    }

    if (credentials?.currency === 'INR' && (credentials?.gatewayType === 'hypersofts' || credentials?.gatewayType === 'lgpay')) {
      return `{
  "merchant_id": "${baseExample.merchant_id}",
  "amount": "${baseExample.amount}",
  "merchant_order_no": "${baseExample.merchant_order_no}",
  "callback_url": "${baseExample.callback_url}",
  "trade_type": "INRUPI",  // or "usdt"
  "extra": "optional_reference",
  "sign": "MD5(ASCII sorted params + &key=api_key).toUpperCase()"
}`;
    }

    // HYPER PAY (BondPay) - no trade_type needed
    return `{
  "merchant_id": "${baseExample.merchant_id}",
  "amount": "${baseExample.amount}",
  "merchant_order_no": "${baseExample.merchant_order_no}",
  "callback_url": "${baseExample.callback_url}",
  "extra": "optional_reference",
  "sign": "md5(merchant_id + amount + merchant_order_no + api_key + callback_url)"
}`;
  };

  const payinExample = getPayinExample();

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
                {/* Gateway Info */}
                {credentials?.gatewayName && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                        credentials.gatewayType === 'hyperpay' ? 'bg-orange-500' : 'bg-purple-500'
                      }`}>
                        {credentials.currency}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'zh' ? '支付网关' : 'Payment Gateway'}</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{credentials.gatewayName}</p>
                          <Badge variant="outline" className={credentials.gatewayType === 'hyperpay' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}>
                            {credentials.gatewayType === 'hyperpay' ? 'HYPER PAY' : 'HYPER SOFTS'}
                          </Badge>
                          {credentials.tradeType && (
                            <Badge variant="secondary">{credentials.tradeType}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                  <div className="p-4 bg-[hsl(var(--success))]/10 rounded-lg border border-[hsl(var(--success))]/20">
                    <p className="text-sm text-muted-foreground">{t('merchants.payinFee')}</p>
                    <p className="text-2xl font-bold text-[hsl(var(--success))]">{credentials?.payinFee}%</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">{t('merchants.payoutFee')}</p>
                    <p className="text-2xl font-bold text-primary">{credentials?.payoutFee}%</p>
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
            <Tabs defaultValue="gateway">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="gateway" className="flex items-center gap-1">
                  🌐 {language === 'zh' ? '网关' : 'Gateway'}
                </TabsTrigger>
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

              {/* Gateway Specific Documentation */}
              <TabsContent value="gateway" className="space-y-6 mt-6">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    🌐 {language === 'zh' ? '您的网关配置' : 'Your Gateway Configuration'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' 
                      ? '以下是您账户分配的支付网关的具体技术信息'
                      : 'Below is the specific technical information for your assigned payment gateway'}
                  </p>
                </div>

                {credentials?.gatewayType === 'hyperpay' ? (
                  /* HYPER PAY Documentation */
                  <div className="space-y-6">
                    <Card className="border-orange-500/20">
                      <CardHeader className="bg-orange-500/5">
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">HP</div>
                          HYPER PAY (India - INR)
                        </CardTitle>
                        <CardDescription>
                          {language === 'zh' ? '印度卢比支付通道' : 'Indian Rupee payment gateway'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">{language === 'zh' ? '签名算法' : 'Signature Algorithm'}</h4>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-mono">Payin: MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)</p>
                            <p className="text-sm font-mono mt-2">Payout: MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">⚠️ {language === 'zh' ? '字段按顺序拼接，无分隔符' : 'Fields concatenated in order, no separator'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">{language === 'zh' ? '支持的银行' : 'Supported Banks'}</h4>
                          <div className="flex flex-wrap gap-2">
                            {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'BOB', 'IndusInd', 'IDFC'].map(bank => (
                              <Badge key={bank} variant="outline">{bank}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (credentials?.gatewayType === 'lgpay' || credentials?.gatewayType === 'hypersofts') ? (
                  /* HYPER SOFTS Documentation */
                  <div className="space-y-6">
                    <Card className="border-purple-500/20">
                      <CardHeader className="bg-purple-500/5">
                        <CardTitle className="flex items-center gap-2 text-purple-600">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">HS</div>
                          HYPER SOFTS ({credentials.currency})
                          {credentials.tradeType && <Badge variant="secondary">{credentials.tradeType}</Badge>}
                        </CardTitle>
                        <CardDescription>
                          {credentials.currency === 'INR' && (language === 'zh' ? '印度卢比 - UPI支付' : 'Indian Rupee - UPI Payment')}
                          {credentials.currency === 'PKR' && (language === 'zh' ? '巴基斯坦卢比 - Easypaisa/JazzCash' : 'Pakistan Rupee - Easypaisa/JazzCash')}
                          {credentials.currency === 'BDT' && (language === 'zh' ? '孟加拉塔卡 - Nagad/bKash' : 'Bangladesh Taka - Nagad/bKash')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">{language === 'zh' ? '签名算法 (ASCII排序 + MD5大写)' : 'Signature Algorithm (ASCII Sorted + MD5 Uppercase)'}</h4>
                          <div className="p-3 bg-muted rounded-lg space-y-2">
                            <p className="text-sm">1. {language === 'zh' ? '过滤空值参数' : 'Filter out empty parameters'}</p>
                            <p className="text-sm">2. {language === 'zh' ? '按参数名ASCII排序' : 'Sort by parameter name (ASCII)'}</p>
                            <p className="text-sm">3. {language === 'zh' ? '拼接: key1=value1&key2=value2&key=YOUR_API_KEY' : 'Concatenate: key1=value1&key2=value2&key=YOUR_API_KEY'}</p>
                            <p className="text-sm">4. {language === 'zh' ? 'MD5哈希后转大写' : 'MD5 hash and convert to uppercase'}</p>
                          </div>
                          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`// JavaScript Example
function generateHyperSoftsSign(params, apiKey) {
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b));
  
  const str = filtered.map(([k,v]) => \`\${k}=\${v}\`).join('&') + '&key=' + apiKey;
  return md5(str).toUpperCase();
}`}
                          </pre>
                        </div>

                        {credentials.currency === 'PKR' && (
                          <div>
                            <h4 className="font-semibold mb-2">{language === 'zh' ? '支持的支付方式' : 'Supported Payment Methods'}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 border rounded-lg border-green-500/20 bg-green-500/5">
                                <p className="font-medium text-green-600">🇵🇰 Easypaisa</p>
                                <p className="text-xs text-muted-foreground">trade_type: <code className="bg-muted px-1 rounded">easypaisa</code></p>
                              </div>
                              <div className="p-3 border rounded-lg border-red-500/20 bg-red-500/5">
                                <p className="font-medium text-red-600">🇵🇰 JazzCash</p>
                                <p className="text-xs text-muted-foreground">trade_type: <code className="bg-muted px-1 rounded">jazzcash</code></p>
                              </div>
                            </div>
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <p className="text-sm text-blue-700">
                                💡 {language === 'zh' 
                                  ? '您可以在每笔交易中选择使用 Easypaisa 或 JazzCash'
                                  : 'You can choose Easypaisa or JazzCash for each transaction'}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Deposit Trade Type: PKRPH | Withdrawal Code: PKR</p>
                          </div>
                        )}

                        {credentials.currency === 'BDT' && (
                          <div>
                            <h4 className="font-semibold mb-2">{language === 'zh' ? '支持的支付方式' : 'Supported Payment Methods'}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 border rounded-lg border-orange-500/20 bg-orange-500/5">
                                <p className="font-medium text-orange-600">🇧🇩 Nagad</p>
                                <p className="text-xs text-muted-foreground">trade_type: <code className="bg-muted px-1 rounded">nagad</code></p>
                              </div>
                              <div className="p-3 border rounded-lg border-pink-500/20 bg-pink-500/5">
                                <p className="font-medium text-pink-600">🇧🇩 bKash</p>
                                <p className="text-xs text-muted-foreground">trade_type: <code className="bg-muted px-1 rounded">bkash</code></p>
                              </div>
                            </div>
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <p className="text-sm text-blue-700">
                                💡 {language === 'zh' 
                                  ? '您可以在每笔交易中选择使用 Nagad 或 bKash'
                                  : 'You can choose Nagad or bKash for each transaction'}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Withdrawal Code: BDT</p>
                          </div>
                        )}

                        {credentials.currency === 'INR' && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">{language === 'zh' ? '支持的支付方式' : 'Supported Payment Methods'}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`p-3 border rounded-lg ${credentials.tradeType === 'INRUPI' ? 'border-blue-500 bg-blue-500/10' : ''}`}>
                                  <p className="font-medium text-blue-600">INRUPI</p>
                                  <p className="text-xs text-muted-foreground">UPI Payment</p>
                                  {credentials.tradeType === 'INRUPI' && <Badge className="mt-1 bg-blue-500">Active</Badge>}
                                </div>
                                <div className={`p-3 border rounded-lg ${credentials.tradeType === 'usdt' ? 'border-green-500 bg-green-500/10' : ''}`}>
                                  <p className="font-medium text-green-600">USDT</p>
                                  <p className="text-xs text-muted-foreground">Crypto (TRC20)</p>
                                  {credentials.tradeType === 'usdt' && <Badge className="mt-1 bg-green-500">Active</Badge>}
                                </div>
                                <div className="p-3 border rounded-lg">
                                  <p className="font-medium text-purple-600">IMPS</p>
                                  <p className="text-xs text-muted-foreground">Bank Transfer</p>
                                </div>
                                <div className="p-3 border rounded-lg">
                                  <p className="font-medium text-orange-600">NEFT</p>
                                  <p className="text-xs text-muted-foreground">Bank Transfer</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* USDT Documentation Section */}
                            {credentials.tradeType === 'usdt' && (
                              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                                  💰 USDT (TRC20) {language === 'zh' ? '接入说明' : 'Integration Guide'}
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <p className="font-medium">{language === 'zh' ? 'Payin Trade Type:' : 'Payin Trade Type:'}</p>
                                    <code className="p-2 bg-muted rounded block mt-1">usdt</code>
                                  </div>
                                  <div>
                                    <p className="font-medium">{language === 'zh' ? 'Payout Withdrawal Code:' : 'Payout Withdrawal Code:'}</p>
                                    <code className="p-2 bg-muted rounded block mt-1">INR</code>
                                  </div>
                                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                                    <p className="text-yellow-700">
                                      ⚠️ {language === 'zh' 
                                        ? 'USDT支付成功后，系统会自动转换为INR结算'
                                        : 'USDT payments are automatically converted to INR for settlement'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{language === 'zh' ? '您的支付方式' : 'Your Trade Type'}: </span>
                              <Badge variant="secondary">{credentials.tradeType || 'INRUPI'}</Badge>
                              <span> | Withdrawal Code: INR</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'zh' ? '未分配支付网关' : 'No payment gateway assigned'}
                  </div>
                )}
              </TabsContent>

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
                        <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '金额' : 'Amount'} ({credentials?.currency || 'INR'})</td></tr>
                        <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '商户订单号' : 'Merchant Order No'}</td></tr>
                        <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? '回调地址' : 'Callback URL'}</td></tr>
                        {/* trade_type - Required for PKR/BDT, Optional for INR */}
                        {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT' || (credentials?.currency === 'INR' && (credentials?.gatewayType === 'hypersofts' || credentials?.gatewayType === 'lgpay'))) && (
                          <tr className="bg-primary/5">
                            <td className="p-3 border-b font-mono text-primary">trade_type</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b">{credentials?.currency === 'PKR' || credentials?.currency === 'BDT' ? '✓' : '-'}</td>
                            <td className="p-3 border-b">
                              {credentials?.currency === 'PKR' && (
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600">easypaisa</Badge>
                                  <Badge variant="outline" className="bg-red-500/10 text-red-600">jazzcash</Badge>
                                </span>
                              )}
                              {credentials?.currency === 'BDT' && (
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600">nagad</Badge>
                                  <Badge variant="outline" className="bg-pink-500/10 text-pink-600">bkash</Badge>
                                </span>
                              )}
                              {credentials?.currency === 'INR' && (credentials?.gatewayType === 'hypersofts' || credentials?.gatewayType === 'lgpay') && (
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600">INRUPI</Badge>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600">usdt</Badge>
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                        <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">{language === 'zh' ? 'MD5签名' : 'MD5 Signature'}</td></tr>
                        <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">{language === 'zh' ? '扩展字段' : 'Extra data'}</td></tr>
                      </tbody>
                    </table>

                    {/* Trade Type Warning for PKR/BDT */}
                    {(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-700 flex items-center gap-2">
                          ⚠️ <strong>{language === 'zh' ? '重要:' : 'Important:'}</strong> 
                          {language === 'zh' 
                            ? `${credentials.currency} 交易必须指定 trade_type 参数`
                            : `trade_type is REQUIRED for ${credentials.currency} transactions`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {credentials.currency === 'PKR' && (language === 'zh' 
                            ? '可选值: "easypaisa" 或 "jazzcash"'
                            : 'Valid values: "easypaisa" or "jazzcash"')}
                          {credentials.currency === 'BDT' && (language === 'zh' 
                            ? '可选值: "nagad" 或 "bkash"'
                            : 'Valid values: "nagad" or "bkash"')}
                        </p>
                      </div>
                    )}
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
