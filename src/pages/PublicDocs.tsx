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
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { toast } from 'sonner';

const PublicDocs = () => {
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();
  const isEnglish = language === 'en';

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

  const samplePayinRequest = `{
  "merchant_id": "your-merchant-id",
  "api_key": "your-api-key",
  "amount": 1000,
  "merchant_order_no": "ORDER_123456",
  "extra": "Optional extra data"
}`;

  const samplePayoutRequest = `{
  "merchant_id": "your-merchant-id",
  "payout_key": "your-payout-key",
  "amount": 500,
  "account_holder_name": "John Doe",
  "account_number": "1234567890",
  "bank_name": "Example Bank",
  "ifsc_code": "EXMP0001234",
  "merchant_order_no": "PAYOUT_123456"
}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      </div>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain shadow-lg" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold">{settings.gatewayName}</span>
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
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            {isEnglish ? 'API Documentation' : 'API 开发文档'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {isEnglish 
              ? 'Everything you need to integrate our payment gateway into your application.'
              : '集成我们支付网关所需的所有信息。'}
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Zap className="h-6 w-6 text-primary" />
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
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Code2 className="h-6 w-6 text-primary" />
            {isEnglish ? 'API Endpoints' : 'API 接口'}
          </h2>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <Card key={index} className="bg-card/50 border-border/50">
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
            ))}
          </div>
        </div>
      </section>

      {/* Sample Requests */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FileJson className="h-6 w-6 text-primary" />
            {isEnglish ? 'Sample Requests' : '请求示例'}
          </h2>

          {/* Pay-in Sample */}
          <Card className="bg-card/50 border-border/50 overflow-hidden">
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

          {/* Pay-out Sample */}
          <Card className="bg-card/50 border-border/50 overflow-hidden">
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
        </div>
      </section>

      {/* Response Codes */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            {isEnglish ? 'Response Codes' : '响应代码'}
          </h2>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[
                  { code: '200', status: 'Success', description: isEnglish ? 'Request processed successfully' : '请求处理成功' },
                  { code: '400', status: 'Bad Request', description: isEnglish ? 'Invalid request parameters' : '无效的请求参数' },
                  { code: '401', status: 'Unauthorized', description: isEnglish ? 'Invalid API credentials' : '无效的API凭证' },
                  { code: '500', status: 'Server Error', description: isEnglish ? 'Internal server error' : '服务器内部错误' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4">
                    <span className={`px-3 py-1 rounded-md font-mono text-sm font-bold ${
                      item.code === '200' ? 'bg-green-500/10 text-green-500' : 
                      item.code === '400' ? 'bg-yellow-500/10 text-yellow-500' :
                      item.code === '401' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {item.code}
                    </span>
                    <span className="font-medium">{item.status}</span>
                    <span className="text-muted-foreground ml-auto">{item.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Full Docs CTA */}
      <section className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isEnglish ? 'Need Full Documentation?' : '需要完整文档？'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isEnglish 
                ? 'Login to the merchant portal to access complete API documentation with interactive testing.'
                : '登录商户后台访问完整的API文档和交互式测试工具。'}
            </p>
            <Button asChild size="lg" className="h-12 px-8 gap-2">
              <Link to="/merchant-login">
                {isEnglish ? 'Access Merchant Portal' : '进入商户后台'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings.gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicDocs;
