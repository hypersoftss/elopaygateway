import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  Zap,
  BookOpen,
  Code2,
  FileJson,
  ArrowRight,
  Copy
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { ScrollReveal } from '@/hooks/useScrollReveal';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const PublicDocs = () => {
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();
  const isEnglish = language === 'en';

  useDocumentMeta({
    title: 'API Documentation - ELOPAY Gateway',
    description: 'Integrate ELOPAY payment gateway with our simple REST API. Support for UPI, bKash, JazzCash, Easypaisa. Get started in minutes.',
    ogTitle: 'API Documentation - ELOPAY Gateway',
    ogDescription: 'Easy-to-use payment API for India, Pakistan & Bangladesh. Complete integration guide with code examples.',
    ogImage: 'https://elopaygateway.in/og-image.webp',
    keywords: 'ELOPAY API, payment API documentation, UPI API, bKash API, JazzCash API, payment integration',
    canonicalUrl: 'https://elopaygateway.in/docs',
  });

  // Use gateway name from settings
  const gatewayName = settings.gatewayName || 'ELOPAY';
  const logoUrl = settings.logoUrl;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isEnglish ? 'Copied to clipboard!' : '已复制到剪贴板！');
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/payin',
      description: isEnglish ? 'Create a new pay-in order' : '创建代收订单',
    },
    {
      method: 'POST',
      path: '/payout',
      description: isEnglish ? 'Create a new pay-out order' : '创建代付订单',
    },
    {
      method: 'POST',
      path: '/callback-handler',
      description: isEnglish ? 'Handle payment callbacks' : '处理支付回调',
    },
  ];

  const samplePayinRequest = `// Pay-in Request (INR/PKR/BDT)
POST /payin
Content-Type: application/json

{
  "merchant_id": "100000001",
  "amount": "1000.00",
  "merchant_order_no": "ORDER_${Date.now()}",
  "callback_url": "https://yoursite.com/callback",
  "trade_type": "easypaisa",  // PKR: easypaisa/jazzcash, BDT: nagad/bkash
  "sign": "MD5_SIGNATURE"
}

// Response
{
  "success": true,
  "data": {
    "order_no": "PI1737569847123",
    "payment_url": "https://pay...",
    "status": "pending"
  }
}`;

  const samplePayoutRequest = `// Pay-out Request (Bank/Wallet)
POST /payout
Content-Type: application/json

{
  "merchant_id": "100000001",
  "amount": 5000,
  "transaction_id": "TXN_${Date.now()}",
  "account_number": "1234567890",
  "name": "Account Holder",
  "bank_name": "HDFC Bank",
  "ifsc": "HDFC0001234",
  "callback_url": "https://yoursite.com/callback",
  "sign": "MD5_SIGNATURE"
}

// Response
{
  "success": true,
  "data": {
    "order_no": "PO1737569847456",
    "status": "pending"
  }
}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain shadow-lg ring-2 ring-primary/20" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-primary/20">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold">{gatewayName}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mx-auto px-4 pt-8">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            {isEnglish ? 'Back to Home' : '返回首页'}
          </Link>
        </Button>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 shadow-lg">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              {isEnglish ? `${gatewayName} API Documentation` : `${gatewayName} API 开发文档`}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isEnglish 
                ? 'Everything you need to integrate our payment gateway into your application.'
                : '集成我们支付网关所需的所有信息。'}
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 py-8">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  {isEnglish ? 'Quick Start' : '快速开始'}
                </h2>
                <div className="space-y-4">
                  {[
                    isEnglish ? 'Create a merchant account and get your API credentials' : '创建商户账户并获取API凭证',
                    isEnglish ? 'Configure your callback URL in the merchant portal' : '在商户后台配置回调URL',
                    isEnglish ? 'Use the API endpoints to create pay-in and pay-out orders' : '使用API接口创建代收和代付订单',
                    isEnglish ? 'Handle callbacks to update order status in your system' : '处理回调以更新您系统中的订单状态',
                  ].map((step, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/25">
                        {index + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </section>

      {/* API Endpoints */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              {isEnglish ? 'API Endpoints' : 'API 接口'}
            </h2>
          </ScrollReveal>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-md bg-primary/10 text-primary font-mono text-sm font-bold">
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm">{endpoint.path}</code>
                      <span className="text-muted-foreground ml-auto">{endpoint.description}</span>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Requests */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <ScrollReveal>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
                <FileJson className="h-5 w-5 text-primary" />
              </div>
              {isEnglish ? 'Sample Requests' : '请求示例'}
            </h2>
          </ScrollReveal>

          {/* Pay-in Sample */}
          <ScrollReveal delay={100}>
            <Card className="bg-card/50 border-border/50 overflow-hidden backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{isEnglish ? 'Pay-in Request' : '代收请求'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(samplePayinRequest)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {isEnglish ? 'Copy' : '复制'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 overflow-x-auto text-sm">
                  <code>{samplePayinRequest}</code>
                </pre>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Pay-out Sample */}
          <ScrollReveal delay={200}>
            <Card className="bg-card/50 border-border/50 overflow-hidden backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{isEnglish ? 'Pay-out Request' : '代付请求'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(samplePayoutRequest)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {isEnglish ? 'Copy' : '复制'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 overflow-x-auto text-sm">
                  <code>{samplePayoutRequest}</code>
                </pre>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Response Codes */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-6">
              {isEnglish ? 'Response Codes' : '响应代码'}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {[
                    { code: '200', status: 'Success', description: isEnglish ? 'Request processed successfully' : '请求处理成功', color: 'text-green-500 bg-green-500/10' },
                    { code: '400', status: 'Bad Request', description: isEnglish ? 'Invalid request parameters' : '无效的请求参数', color: 'text-yellow-500 bg-yellow-500/10' },
                    { code: '401', status: 'Unauthorized', description: isEnglish ? 'Invalid API credentials' : '无效的API凭证', color: 'text-orange-500 bg-orange-500/10' },
                    { code: '500', status: 'Server Error', description: isEnglish ? 'Internal server error' : '服务器内部错误', color: 'text-red-500 bg-red-500/10' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                      <span className={`px-3 py-1 rounded-md font-mono text-sm font-bold ${item.color}`}>
                        {item.code}
                      </span>
                      <span className="font-medium">{item.status}</span>
                      <span className="text-muted-foreground ml-auto">{item.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Full Docs CTA */}
      <section className="container mx-auto px-4 py-12">
        <ScrollReveal>
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 shadow-2xl shadow-primary/10">
            <CardContent className="p-10 text-center">
              <h2 className="text-2xl font-bold mb-4">
                {isEnglish ? 'Need Full Documentation?' : '需要完整文档？'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {isEnglish 
                  ? `Login to the ${gatewayName} merchant portal to access complete API documentation with interactive testing.`
                  : `登录${gatewayName}商户后台访问完整的API文档和交互式测试工具。`}
              </p>
              <Button asChild size="lg" className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all gap-2">
                <Link to="/merchant-login">
                  {isEnglish ? 'Access Merchant Portal' : '进入商户后台'}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold">{gatewayName}</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                {isEnglish ? 'Home' : '首页'}
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                {isEnglish ? 'About' : '关于我们'}
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicDocs;
