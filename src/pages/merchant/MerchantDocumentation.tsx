import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Check, Terminal, FileCode, Download, Zap, Shield, Globe, Wallet, CreditCard, Smartphone, Building } from 'lucide-react';
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

  const gatewayName = 'ELOPAY';
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user?.merchantId) return;

      try {
        // Fetch merchant data
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('account_number, api_key, payout_key, payin_fee, payout_fee, trade_type')
          .eq('id', user.merchantId)
          .single();

        // Use secure RPC function to get gateway info (bypasses RLS on payment_gateways)
        const { data: gatewayData } = await supabase.rpc('get_my_gateway');

        if (merchantData) {
          const gateway = gatewayData && gatewayData.length > 0 ? gatewayData[0] : null;
          setCredentials({
            accountNumber: merchantData.account_number,
            apiKey: merchantData.api_key,
            payoutKey: merchantData.payout_key,
            payinFee: merchantData.payin_fee || 0,
            payoutFee: merchantData.payout_fee || 0,
            gatewayName: gateway?.gateway_name || null,
            gatewayType: gateway?.gateway_type || null,
            currency: gateway?.currency || 'INR',
            tradeType: merchantData.trade_type || null,
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

  // Currency & Gateway helpers
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

  const getRegionName = () => {
    if (credentials?.currency === 'PKR') return 'Pakistan';
    if (credentials?.currency === 'BDT') return 'Bangladesh';
    return 'India';
  };

  const isHyperPay = credentials?.gatewayType === 'hyperpay' || credentials?.gatewayType === 'bondpay';
  const isHyperSofts = credentials?.gatewayType === 'hypersofts' || credentials?.gatewayType === 'lgpay';

  const getPaymentMethods = () => {
    if (credentials?.currency === 'PKR') {
      return [
        { name: 'Easypaisa', code: 'easypaisa', icon: Smartphone, color: 'bg-green-500', description: 'Mobile Wallet' },
        { name: 'JazzCash', code: 'jazzcash', icon: Smartphone, color: 'bg-red-500', description: 'Mobile Wallet' },
        { name: 'USDT', code: 'usdt', icon: Wallet, color: 'bg-teal-500', description: 'Crypto Payment' }
      ];
    }
    if (credentials?.currency === 'BDT') {
      return [
        { name: 'Nagad', code: 'nagad', icon: Smartphone, color: 'bg-orange-500', description: 'Mobile Wallet' },
        { name: 'bKash', code: 'bkash', icon: Smartphone, color: 'bg-pink-500', description: 'Mobile Wallet' },
        { name: 'USDT', code: 'usdt', icon: Wallet, color: 'bg-teal-500', description: 'Crypto Payment' }
      ];
    }
    // INR
    if (isHyperPay) {
      return [
        { name: 'UPI', code: 'UPI', icon: CreditCard, color: 'bg-blue-500', description: 'Instant Payment' },
        { name: 'Bank Transfer', code: 'IMPS', icon: Building, color: 'bg-purple-500', description: 'IMPS/NEFT' }
      ];
    }
    return [
      { name: 'UPI', code: 'INRUPI', icon: CreditCard, color: 'bg-blue-500', description: 'UPI Payment' },
      { name: 'USDT', code: 'usdt', icon: Wallet, color: 'bg-teal-500', description: 'Crypto Payment' }
    ];
  };

  // PKR Documentation
  const renderPKRDocs = () => (
    <div className="space-y-6">
      {/* Region Header */}
      <div className="p-6 bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-3xl">
            🇵🇰
          </div>
          <div>
            <h2 className="text-xl font-bold">ELOPAY_PKR Integration</h2>
            <p className="text-muted-foreground">Easypaisa, JazzCash & USDT Payments</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-green-500/10">Easypaisa</Badge>
              <Badge variant="outline" className="bg-red-500/10">JazzCash</Badge>
              <Badge variant="outline" className="bg-teal-500/10">USDT</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Pay-in Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-green-500">POST</Badge>
            Pay-in API (Deposit)
          </CardTitle>
          <CardDescription>Collect payments from customers via Easypaisa or JazzCash</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payin</code>
            <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => copyToClipboard(`${apiBaseUrl}/payin`, 'pkr-payin')}>
              {copiedField === 'pkr-payin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in PKR (Rs.)</td></tr>
                <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique order ID</td></tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL for notifications</td></tr>
                <tr className="bg-green-500/10">
                  <td className="p-3 border-b font-mono font-bold text-green-700">trade_type</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b font-bold text-green-700">✓</td>
                  <td className="p-3 border-b">
                    <Badge variant="outline" className="bg-green-500/10 mr-2">easypaisa</Badge>
                    <Badge variant="outline" className="bg-red-500/10">jazzcash</Badge>
                  </td>
                </tr>
                <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">MD5 Signature (uppercase)</td></tr>
                <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">Extra data (returned in callback)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="font-semibold text-yellow-700 mb-1">⚠️ Important</p>
            <p className="text-sm text-yellow-600">PKR transactions require <code className="bg-yellow-200/50 px-1 rounded">trade_type</code> parameter. Use "easypaisa" or "jazzcash".</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: '5000.00',
  merchant_order_no: 'ORDER_123456',
  callback_url: 'https://your-site.com/callback',
  trade_type: 'easypaisa',
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Pay-out Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-blue-500">POST</Badge>
            Pay-out API (Withdrawal)
          </CardTitle>
          <CardDescription>Send payments to Easypaisa or JazzCash accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payout</code>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">number</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in PKR</td></tr>
                <tr><td className="p-3 border-b font-mono">transaction_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique transaction ID</td></tr>
                <tr className="bg-blue-500/10">
                  <td className="p-3 border-b font-mono font-bold">account_number</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Mobile number (03xxxxxxxxx)</td>
                </tr>
                <tr className="bg-blue-500/10">
                  <td className="p-3 border-b font-mono font-bold">name</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Account holder name</td>
                </tr>
                <tr className="bg-green-500/10">
                  <td className="p-3 border-b font-mono font-bold text-green-700">withdrawal_method</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b font-bold text-green-700">✓</td>
                  <td className="p-3 border-b">
                    <Badge variant="outline" className="bg-green-500/10 mr-2">easypaisa</Badge>
                    <Badge variant="outline" className="bg-red-500/10">jazzcash</Badge>
                  </td>
                </tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL</td></tr>
                <tr><td className="p-3 font-mono">sign</td><td className="p-3">string</td><td className="p-3">✓</td><td className="p-3">MD5 Signature (uppercase)</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: 5000,
  transaction_id: 'WD_123456',
  account_number: '03001234567',
  name: 'Muhammad Ali',
  withdrawal_method: 'easypaisa',
  callback_url: 'https://your-site.com/payout-callback',
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // BDT Documentation
  const renderBDTDocs = () => (
    <div className="space-y-6">
      {/* Region Header */}
      <div className="p-6 bg-gradient-to-r from-orange-500/10 to-pink-500/5 border border-orange-500/20 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-3xl">
            🇧🇩
          </div>
          <div>
            <h2 className="text-xl font-bold">ELOPAY_BDT Integration</h2>
            <p className="text-muted-foreground">Nagad, bKash & USDT Payments</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-orange-500/10">Nagad</Badge>
              <Badge variant="outline" className="bg-pink-500/10">bKash</Badge>
              <Badge variant="outline" className="bg-teal-500/10">USDT</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Pay-in Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-green-500">POST</Badge>
            Pay-in API (Deposit)
          </CardTitle>
          <CardDescription>Collect payments from customers via Nagad or bKash</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payin</code>
            <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => copyToClipboard(`${apiBaseUrl}/payin`, 'bdt-payin')}>
              {copiedField === 'bdt-payin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in BDT (৳)</td></tr>
                <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique order ID</td></tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL for notifications</td></tr>
                <tr className="bg-orange-500/10">
                  <td className="p-3 border-b font-mono font-bold text-orange-700">trade_type</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b font-bold text-orange-700">✓</td>
                  <td className="p-3 border-b">
                    <Badge variant="outline" className="bg-orange-500/10 mr-2">nagad</Badge>
                    <Badge variant="outline" className="bg-pink-500/10">bkash</Badge>
                  </td>
                </tr>
                <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">MD5 Signature (uppercase)</td></tr>
                <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">Extra data (returned in callback)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="font-semibold text-yellow-700 mb-1">⚠️ Important</p>
            <p className="text-sm text-yellow-600">BDT transactions require <code className="bg-yellow-200/50 px-1 rounded">trade_type</code> parameter. Use "nagad" or "bkash".</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: '2000.00',
  merchant_order_no: 'ORDER_123456',
  callback_url: 'https://your-site.com/callback',
  trade_type: 'nagad',
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Pay-out Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-blue-500">POST</Badge>
            Pay-out API (Withdrawal)
          </CardTitle>
          <CardDescription>Send payments to Nagad or bKash accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payout</code>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">number</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in BDT</td></tr>
                <tr><td className="p-3 border-b font-mono">transaction_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique transaction ID</td></tr>
                <tr className="bg-orange-500/10">
                  <td className="p-3 border-b font-mono font-bold">account_number</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Mobile number (01xxxxxxxxx)</td>
                </tr>
                <tr className="bg-orange-500/10">
                  <td className="p-3 border-b font-mono font-bold">name</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Account holder name</td>
                </tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL</td></tr>
                <tr><td className="p-3 font-mono">sign</td><td className="p-3">string</td><td className="p-3">✓</td><td className="p-3">MD5 Signature (uppercase)</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: 2000,
  transaction_id: 'WD_123456',
  account_number: '01712345678',
  name: 'Rahim Ahmed',
  callback_url: 'https://your-site.com/payout-callback',
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // INR Documentation (HyperSofts or HyperPay)
  const renderINRDocs = () => (
    <div className="space-y-6">
      {/* Region Header */}
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/5 border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-xl flex items-center justify-center text-3xl">
            🇮🇳
          </div>
          <div>
            <h2 className="text-xl font-bold">{isHyperPay ? 'ELOPAYGATEWAY_INR' : 'ELOPAY_INR'} Integration</h2>
            <p className="text-muted-foreground">
              {isHyperPay ? 'UPI & Bank Transfer Payments' : 'UPI, Bank Transfer & USDT Payments'}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-blue-500/10">UPI</Badge>
              {isHyperPay ? (
                <Badge variant="outline" className="bg-purple-500/10">Bank Transfer</Badge>
              ) : (
                <Badge variant="outline" className="bg-teal-500/10">USDT</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pay-in Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-green-500">POST</Badge>
            Pay-in API (Deposit)
          </CardTitle>
          <CardDescription>
            Collect payments from customers via {isHyperPay ? 'UPI' : 'UPI or USDT'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payin</code>
            <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => copyToClipboard(`${apiBaseUrl}/payin`, 'inr-payin')}>
              {copiedField === 'inr-payin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in INR (₹)</td></tr>
                <tr><td className="p-3 border-b font-mono">merchant_order_no</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique order ID</td></tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL for notifications</td></tr>
                {isHyperSofts && (
                  <tr className="bg-blue-500/10">
                    <td className="p-3 border-b font-mono">trade_type</td>
                    <td className="p-3 border-b">string</td>
                    <td className="p-3 border-b">-</td>
                    <td className="p-3 border-b">
                      <Badge variant="outline" className="bg-blue-500/10 mr-2">INRUPI</Badge>
                      <Badge variant="outline" className="bg-teal-500/10">usdt</Badge>
                      <span className="text-xs ml-2 text-muted-foreground">(default: INRUPI)</span>
                    </td>
                  </tr>
                )}
                <tr><td className="p-3 border-b font-mono">sign</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">MD5 Signature {isHyperSofts ? '(uppercase)' : ''}</td></tr>
                <tr><td className="p-3 font-mono">extra</td><td className="p-3">string</td><td className="p-3">-</td><td className="p-3">Extra data (returned in callback)</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: '500.00',
  merchant_order_no: 'ORDER_123456',
  callback_url: 'https://your-site.com/callback',
  ...(isHyperSofts ? { trade_type: 'INRUPI' } : {}),
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Pay-out Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-blue-500">POST</Badge>
            Pay-out API (Withdrawal)
          </CardTitle>
          <CardDescription>Send payments to bank accounts via IMPS/NEFT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <code className="block p-4 bg-muted rounded-lg text-sm font-mono">{apiBaseUrl}/payout</code>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 border-b">Parameter</th>
                  <th className="text-left p-3 border-b">Type</th>
                  <th className="text-left p-3 border-b">Required</th>
                  <th className="text-left p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-3 border-b font-mono">merchant_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your Merchant ID</td></tr>
                <tr><td className="p-3 border-b font-mono">amount</td><td className="p-3 border-b">number</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Amount in INR</td></tr>
                <tr><td className="p-3 border-b font-mono">transaction_id</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Your unique transaction ID</td></tr>
                <tr className="bg-purple-500/10">
                  <td className="p-3 border-b font-mono font-bold">account_number</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Bank account number</td>
                </tr>
                <tr className="bg-purple-500/10">
                  <td className="p-3 border-b font-mono font-bold">ifsc</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">IFSC Code (e.g., HDFC0001234)</td>
                </tr>
                <tr className="bg-purple-500/10">
                  <td className="p-3 border-b font-mono font-bold">name</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Account holder name</td>
                </tr>
                <tr className="bg-purple-500/10">
                  <td className="p-3 border-b font-mono font-bold">bank_name</td>
                  <td className="p-3 border-b">string</td>
                  <td className="p-3 border-b">✓</td>
                  <td className="p-3 border-b">Bank name (e.g., HDFC Bank)</td>
                </tr>
                <tr><td className="p-3 border-b font-mono">callback_url</td><td className="p-3 border-b">string</td><td className="p-3 border-b">✓</td><td className="p-3 border-b">Callback URL</td></tr>
                <tr><td className="p-3 font-mono">sign</td><td className="p-3">string</td><td className="p-3">✓</td><td className="p-3">MD5 Signature</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{JSON.stringify({
  merchant_id: credentials?.accountNumber || 'YOUR_MERCHANT_ID',
  amount: 500,
  transaction_id: 'WD_123456',
  account_number: '1234567890123',
  ifsc: 'HDFC0001234',
  name: 'Rahul Sharma',
  bank_name: 'HDFC Bank',
  callback_url: 'https://your-site.com/payout-callback',
  sign: 'YOUR_MD5_SIGNATURE'
}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Signature Documentation (common)
  const renderSignatureDocs = () => {
    const isAsciiSort = credentials?.currency === 'PKR' || credentials?.currency === 'BDT' || isHyperSofts;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Signature Algorithm
          </CardTitle>
          <CardDescription>All API requests must be signed using MD5</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAsciiSort ? (
            <>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <code className="text-sm font-mono">MD5(sorted_params + "&key=" + api_key).toUpperCase()</code>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Signature Steps</h4>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge>1</Badge>
                  <div>
                    <p className="font-medium">Filter Empty Values</p>
                    <p className="text-sm text-muted-foreground">Remove all empty parameters and the sign parameter</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge>2</Badge>
                  <div>
                    <p className="font-medium">ASCII Sort</p>
                    <p className="text-sm text-muted-foreground">Sort parameters by key name in ASCII order</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge>3</Badge>
                  <div>
                    <p className="font-medium">Concatenate</p>
                    <p className="text-sm text-muted-foreground">key1=value1&key2=value2&key=YOUR_API_KEY</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge>4</Badge>
                  <div>
                    <p className="font-medium">MD5 Hash & Uppercase</p>
                    <p className="text-sm text-muted-foreground">MD5(string).toUpperCase()</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Code Example</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`// JavaScript
function generateSign(params, apiKey) {
  // Filter empty values and sort by key
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b));
  
  // Create query string
  const str = filtered.map(([k, v]) => \`\${k}=\${v}\`).join('&');
  
  // Append key and hash
  return md5(str + '&key=' + apiKey).toUpperCase();
}

// PHP
function generateSign($params, $apiKey) {
    unset($params['sign']);
    $params = array_filter($params, fn($v) => $v !== '' && $v !== null);
    ksort($params);
    $str = http_build_query($params) . '&key=' . $apiKey;
    return strtoupper(md5($str));
}`}
                </pre>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Pay-in Signature</h4>
                  <code className="block p-4 bg-muted rounded-lg text-sm font-mono">
                    sign = md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Pay-out Signature</h4>
                  <code className="block p-4 bg-muted rounded-lg text-sm font-mono break-all">
                    sign = md5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                  </code>
                  <p className="text-sm text-muted-foreground mt-2">
                    ⚠️ Parameters concatenated in alphabetical order
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Code Example</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`// JavaScript - Pay-in
const payinSign = md5(
  merchant_id + amount + merchant_order_no + api_key + callback_url
);

// JavaScript - Pay-out
const payoutSign = md5(
  account_number + amount + bank_name + callback_url + 
  ifsc + merchant_id + name + transaction_id + payout_key
);`}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Callback Documentation
  const renderCallbackDocs = () => (
    <Card>
      <CardHeader>
        <CardTitle>Callback Handling</CardTitle>
        <CardDescription>Process payment notifications from the gateway</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Important Guidelines</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Use HTTPS endpoints</li>
            <li>• Respond within 3 seconds</li>
            <li>• Return "ok" to acknowledge receipt</li>
            <li>• Implement idempotent handling (same callback may be sent multiple times)</li>
            <li>• Always verify the signature before processing</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Callback Example</h4>
          <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
{`POST https://your-domain.com/callback
Content-Type: application/json

{
  "orderNo": "PI${Date.now()}",
  "merchantOrder": "YOUR_ORDER_NO",
  "status": "success",
  "amount": ${credentials?.currency === 'PKR' ? '5000.00' : credentials?.currency === 'BDT' ? '2000.00' : '500.00'},
  "timestamp": "${new Date().toISOString()}",
  "sign": "CALLBACK_SIGNATURE"
}

// Your Response
HTTP/1.1 200 OK
ok`}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Status Values</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
              <Badge className="bg-green-500">success</Badge>
              <p className="text-sm mt-2">Payment Successful</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
              <Badge className="bg-yellow-500">pending</Badge>
              <p className="text-sm mt-2">Processing</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
              <Badge className="bg-red-500">failed</Badge>
              <p className="text-sm mt-2">Payment Failed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // SDK Download Section
  const renderSDKDocs = () => (
    <div className="space-y-6">
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
          <CardTitle>Quick Start</CardTitle>
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

// Create Pay-in Order
const order = await client.createPayin({
  amount: ${credentials?.currency === 'PKR' ? '5000' : credentials?.currency === 'BDT' ? '2000' : '500'},
  orderNo: 'ORDER_123',
  callbackUrl: 'https://your-site.com/callback'${(credentials?.currency === 'PKR' || credentials?.currency === 'BDT') ? `,
  tradeType: '${credentials?.currency === 'PKR' ? 'easypaisa' : 'nagad'}'` : ''}
});

console.log(order.payment_url);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );

  // Full page loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-muted">
                <CardContent className="p-4 text-center space-y-2">
                  <Skeleton className="h-8 w-8 mx-auto rounded" />
                  <Skeleton className="h-7 w-16 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Credentials Card Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Methods Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center p-4 bg-muted/30 rounded-lg space-y-3">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                    <Skeleton className="h-6 w-16 mx-auto rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* API Reference Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 flex-1 rounded" />
                ))}
              </div>
              <div className="space-y-4 mt-6">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{gatewayName} API</h1>
            <p className="text-muted-foreground">Complete API Integration Documentation</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Globe className="h-3 w-3 mr-1" />
              {getCurrencyFlag()} {getRegionName()} ({credentials?.currency || 'INR'})
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
              <p className="text-sm text-muted-foreground">Pay-in Fee</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{credentials?.payoutFee || 0}%</p>
              <p className="text-sm text-muted-foreground">Pay-out Fee</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Terminal className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">REST</p>
              <p className="text-sm text-muted-foreground">API Type</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <FileCode className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">JSON</p>
              <p className="text-sm text-muted-foreground">Format</p>
            </CardContent>
          </Card>
        </div>

        {/* API Credentials Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Your API Credentials
            </CardTitle>
            <CardDescription>
              Keep your credentials secure. Never share with third parties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Payment Methods</CardTitle>
            <CardDescription>
              Available payment channels for {getCurrencyFlag()} {getRegionName()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getPaymentMethods().map((method) => {
                const IconComponent = method.icon;
                return (
                  <div key={method.code} className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors">
                    <div className={`w-12 h-12 ${method.color} rounded-full mx-auto mb-3 flex items-center justify-center text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <p className="font-semibold">{method.name}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">{method.code}</code>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Documentation Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              API Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="api">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="api">API Endpoints</TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
                <TabsTrigger value="callback">Callback</TabsTrigger>
                <TabsTrigger value="sdk">SDK</TabsTrigger>
              </TabsList>

              <TabsContent value="api" className="mt-6">
                {credentials?.currency === 'PKR' && renderPKRDocs()}
                {credentials?.currency === 'BDT' && renderBDTDocs()}
                {credentials?.currency === 'INR' && renderINRDocs()}
                {!credentials?.currency && renderINRDocs()}
              </TabsContent>

              <TabsContent value="signature" className="mt-6">
                {renderSignatureDocs()}
              </TabsContent>

              <TabsContent value="callback" className="mt-6">
                {renderCallbackDocs()}
              </TabsContent>

              <TabsContent value="sdk" className="mt-6">
                {renderSDKDocs()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDocumentation;
