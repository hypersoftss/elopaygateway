import { useState } from 'react';
import { Download, Copy, Check, FileCode, FileText, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const MerchantSDK = () => {
  const { language } = useTranslation();
  const { toast } = useToast();
  const { settings } = useGatewaySettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ 
      title: language === 'zh' ? '已复制' : 'Copied',
      description: language === 'zh' ? '代码已复制到剪贴板' : 'Code copied to clipboard'
    });
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

  const jsQuickStart = `// 1. Include the SDK
<script src="https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js"></script>
<script src="paygate-sdk.js"></script>

// 2. Initialize
const sdk = new PayGateSDK({
  merchantId: 'YOUR_MERCHANT_ID',
  apiKey: 'YOUR_API_KEY',
  payoutKey: 'YOUR_PAYOUT_KEY',
  baseUrl: '${apiBaseUrl}'
});

// 3. Create Payin
const payin = await sdk.createPayin({
  amount: '500.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://your-site.com/callback'
});

// Redirect to payment page
window.location.href = payin.data.payment_url;`;

  const tsQuickStart = `import PayGateSDK from './paygate-sdk';

// Initialize
const sdk = new PayGateSDK({
  merchantId: 'YOUR_MERCHANT_ID',
  apiKey: 'YOUR_API_KEY',
  payoutKey: 'YOUR_PAYOUT_KEY',
  baseUrl: '${apiBaseUrl}'
});

// Create Payin
const payin = await sdk.createPayin({
  amount: '500.00',
  orderNo: 'ORDER_' + Date.now(),
  callbackUrl: 'https://your-site.com/callback'
});

console.log(payin.data.payment_url);`;

  const payinExample = `// Create a payment request
const result = await sdk.createPayin({
  amount: '1000.00',              // Amount in INR
  orderNo: 'ORD_' + Date.now(),   // Your unique order ID
  callbackUrl: 'https://yoursite.com/webhook/payin',
  extra: 'user_123'               // Optional reference
});

// Response
{
  "code": 200,
  "success": true,
  "data": {
    "order_no": "PI1737569847ABC",
    "merchant_order_no": "ORD_1737569847",
    "amount": 1000.00,
    "fee": 90.00,
    "net_amount": 910.00,
    "payment_url": "https://pay.gateway.com/...",
    "status": "pending"
  }
}`;

  const payoutExample = `// Create a payout request
const result = await sdk.createPayout({
  amount: 5000,                   // Amount in INR
  transactionId: 'WD_' + Date.now(),
  accountNumber: '1234567890',
  ifsc: 'HDFC0001234',
  name: 'John Doe',
  bankName: 'HDFC Bank',
  callbackUrl: 'https://yoursite.com/webhook/payout'
});

// Response
{
  "code": 200,
  "success": true,
  "data": {
    "order_no": "PO1737569847XYZ",
    "fee": 200.00,
    "total_amount": 5200.00,
    "status": "pending"
  }
}`;

  const callbackExample = `// Express.js callback handler example
const express = require('express');
const app = express();

app.post('/webhook/payin', (req, res) => {
  const { sign, ...data } = req.body;
  
  // Verify signature
  if (sdk.verifyPayinCallback(data, sign)) {
    // Valid callback
    if (data.status === 'success') {
      // Payment successful - fulfill order
      console.log('Payment received:', data.order_no);
    } else {
      // Payment failed
      console.log('Payment failed:', data.order_no);
    }
    res.send('OK');
  } else {
    res.status(400).send('Invalid signature');
  }
});

app.post('/webhook/payout', (req, res) => {
  const { sign, ...data } = req.body;
  
  if (sdk.verifyPayoutCallback(data, sign)) {
    console.log('Payout status:', data.status);
    res.send('OK');
  } else {
    res.status(400).send('Invalid signature');
  }
});`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              {language === 'zh' ? 'SDK 开发包' : 'SDK Kit'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'zh' 
                ? '下载并集成支付SDK到您的应用' 
                : 'Download and integrate payment SDK into your application'}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {settings.gatewayName} SDK v1.0
          </Badge>
        </div>

        {/* Download Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {language === 'zh' ? '下载 SDK' : 'Download SDK'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' 
                ? '选择适合您项目的SDK版本' 
                : 'Choose the SDK version for your project'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* JavaScript SDK */}
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <FileCode className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">JavaScript</h3>
                      <p className="text-sm text-muted-foreground">Browser / Node.js</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => downloadFile('paygate-sdk.js')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    paygate-sdk.js
                  </Button>
                </CardContent>
              </Card>

              {/* TypeScript SDK */}
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileCode className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">TypeScript</h3>
                      <p className="text-sm text-muted-foreground">Full Type Support</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => downloadFile('paygate-sdk.ts')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    paygate-sdk.ts
                  </Button>
                </CardContent>
              </Card>

              {/* README */}
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <FileText className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Documentation</h3>
                      <p className="text-sm text-muted-foreground">README.md</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => downloadFile('README.md')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    README.md
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {language === 'zh' ? '代码示例' : 'Code Examples'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quickstart">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="quickstart">
                  {language === 'zh' ? '快速开始' : 'Quick Start'}
                </TabsTrigger>
                <TabsTrigger value="payin">
                  {language === 'zh' ? '代收 Payin' : 'Payin'}
                </TabsTrigger>
                <TabsTrigger value="payout">
                  {language === 'zh' ? '代付 Payout' : 'Payout'}
                </TabsTrigger>
                <TabsTrigger value="callback">
                  {language === 'zh' ? '回调处理' : 'Callback'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quickstart" className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-500/10">JavaScript</Badge>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(jsQuickStart, 'jsQuickStart')}
                    >
                      {copiedField === 'jsQuickStart' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                    {jsQuickStart}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10">TypeScript</Badge>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(tsQuickStart, 'tsQuickStart')}
                    >
                      {copiedField === 'tsQuickStart' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                    {tsQuickStart}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="payin" className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {language === 'zh' ? '代收请求示例' : 'Payin Request Example'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(payinExample, 'payinExample')}
                  >
                    {copiedField === 'payinExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                  {payinExample}
                </pre>
              </TabsContent>

              <TabsContent value="payout" className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {language === 'zh' ? '代付请求示例' : 'Payout Request Example'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(payoutExample, 'payoutExample')}
                  >
                    {copiedField === 'payoutExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                  {payoutExample}
                </pre>
              </TabsContent>

              <TabsContent value="callback" className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {language === 'zh' ? '回调处理示例 (Express.js)' : 'Callback Handler (Express.js)'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(callbackExample, 'callbackExample')}
                  >
                    {copiedField === 'callbackExample' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">
                  {callbackExample}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* API Base URL */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'zh' ? 'API 基础地址' : 'API Base URL'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                {apiBaseUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(apiBaseUrl, 'baseUrl')}
              >
                {copiedField === 'baseUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSDK;
