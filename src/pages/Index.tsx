import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Store, 
  ArrowRight, 
  Zap, 
  Globe, 
  Lock, 
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const Index = () => {
  const { language } = useTranslation();
  const { settings, isLoading } = useGatewaySettings();
  const isEnglish = language === 'en';

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: isEnglish ? 'Instant Processing' : '即时处理',
      description: isEnglish ? 'Lightning-fast transaction processing with real-time settlement' : '闪电般的交易处理速度，实时结算',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: isEnglish ? 'Multi-Channel' : '多渠道支持',
      description: isEnglish ? 'Support for bank transfers, e-wallets, and crypto payments' : '支持银行转账、电子钱包和加密货币支付',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: isEnglish ? 'Enterprise Security' : '企业级安全',
      description: isEnglish ? 'Bank-grade encryption with 2FA authentication' : '银行级加密，双重身份验证',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: isEnglish ? 'Real-time Analytics' : '实时分析',
      description: isEnglish ? 'Comprehensive dashboard with live transaction insights' : '全面的仪表板，实时交易洞察',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: isEnglish ? '24/7 Availability' : '全天候服务',
      description: isEnglish ? 'Round-the-clock payment processing with 99.9% uptime' : '全天候支付处理，99.9%正常运行时间',
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: isEnglish ? 'Easy Integration' : '轻松集成',
      description: isEnglish ? 'Simple API with comprehensive documentation' : '简单API，完善文档支持',
    },
  ];

  const stats = [
    { value: '99.9%', label: isEnglish ? 'Uptime' : '正常运行' },
    { value: '<1s', label: isEnglish ? 'Processing' : '处理时间' },
    { value: '24/7', label: isEnglish ? 'Support' : '技术支持' },
    { value: '256-bit', label: isEnglish ? 'Encryption' : '加密保护' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="h-10 w-10 rounded-xl object-contain shadow-lg"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {settings.gatewayName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {isEnglish ? 'Professional Payment Gateway' : '专业支付网关'}
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            {isEnglish ? (
              <>
                Power Your Business with
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {settings.gatewayName}
                </span>
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {settings.gatewayName}
                </span>
                <br />
                为您的业务赋能
              </>
            )}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {isEnglish 
              ? 'Secure, fast, and reliable payment processing solution with instant settlement, multi-channel support, and enterprise-grade security.'
              : '安全、快速、可靠的支付处理解决方案，提供即时结算、多渠道支持和企业级安全保障。'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Link to="/admin-login">
                <ShieldCheck className="h-5 w-5 mr-2" />
                {isEnglish ? 'Admin Portal' : '管理员入口'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2 hover:bg-primary/5 transition-all">
              <Link to="/merchant-login">
                <Store className="h-5 w-5 mr-2" />
                {isEnglish ? 'Merchant Portal' : '商户入口'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isEnglish ? 'Why Choose Us' : '为什么选择我们'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isEnglish 
              ? 'Everything you need to process payments efficiently and securely'
              : '您所需的一切，高效安全地处理支付'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>
      </section>

      {/* Portal Cards Section */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Portal Card */}
          <Link to="/admin-login" className="group block">
            <Card className="h-full relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
              <CardContent className="p-8 text-center relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {isEnglish ? 'Admin Portal' : '管理员入口'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isEnglish ? 'Manage merchants, view transactions, and configure system settings' : '管理商户、查看交易、配置系统设置'}
                </p>
                <div className="flex items-center justify-center gap-2 text-blue-500 font-medium group-hover:gap-3 transition-all">
                  {isEnglish ? 'Access Admin Panel' : '进入管理后台'}
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
              {/* Background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500" />
            </Card>
          </Link>

          {/* Merchant Portal Card */}
          <Link to="/merchant-login" className="group block">
            <Card className="h-full relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
              <CardContent className="p-8 text-center relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {isEnglish ? 'Merchant Portal' : '商户入口'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isEnglish ? 'View transactions, manage withdrawals, and access API documentation' : '查看交易、管理提现、访问API文档'}
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-500 font-medium group-hover:gap-3 transition-all">
                  {isEnglish ? 'Access Merchant Panel' : '进入商户后台'}
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
              {/* Background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors duration-500" />
            </Card>
          </Link>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>{isEnglish ? 'SSL Encrypted' : 'SSL加密'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>{isEnglish ? 'PCI Compliant' : 'PCI合规'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>{isEnglish ? '2FA Security' : '双重认证'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>{isEnglish ? 'Real-time Monitoring' : '实时监控'}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold">{settings.gatewayName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {settings.gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
            </p>
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {settings.supportEmail}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
