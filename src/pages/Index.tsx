import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Store, 
  ArrowRight, 
  Zap, 
  Globe, 
  Lock, 
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Wallet,
  BadgeCheck,
  CircleDollarSign,
  Shield,
  Banknote
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

// Floating icon component
const FloatingIcon = ({ 
  icon: Icon, 
  className, 
  delay = 0 
}: { 
  icon: React.ElementType; 
  className: string; 
  delay?: number;
}) => (
  <div 
    className={`absolute text-primary/20 animate-float ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    <Icon className="h-8 w-8" />
  </div>
);

const Index = () => {
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();
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
      {/* Animated Background with Floating Icons */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        
        {/* Floating Icons */}
        <FloatingIcon icon={CreditCard} className="top-[10%] left-[10%]" delay={0} />
        <FloatingIcon icon={Wallet} className="top-[20%] right-[15%]" delay={1.5} />
        <FloatingIcon icon={CircleDollarSign} className="top-[60%] left-[8%]" delay={0.5} />
        <FloatingIcon icon={Shield} className="top-[40%] right-[10%]" delay={2} />
        <FloatingIcon icon={Banknote} className="bottom-[20%] left-[20%]" delay={1} />
        <FloatingIcon icon={BadgeCheck} className="bottom-[30%] right-[20%]" delay={2.5} />
        <FloatingIcon icon={Globe} className="top-[30%] left-[25%]" delay={3} />
        <FloatingIcon icon={Zap} className="bottom-[15%] right-[30%]" delay={0.8} />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary animate-fade-in">
            <Sparkles className="h-4 w-4" />
            {isEnglish ? 'Professional Payment Gateway' : '专业支付网关'}
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight animate-fade-in">
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

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in">
            {isEnglish 
              ? 'Secure, fast, and reliable payment processing solution with instant settlement, multi-channel support, and enterprise-grade security.'
              : '安全、快速、可靠的支付处理解决方案，提供即时结算、多渠道支持和企业级安全保障。'}
          </p>

          {/* CTA Button - Only Merchant Login */}
          <div className="flex items-center justify-center pt-4 animate-fade-in">
            <Button asChild size="lg" className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover-scale">
              <Link to="/merchant-login">
                <Store className="h-5 w-5 mr-2" />
                {isEnglish ? 'Merchant Login' : '商户登录'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
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
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
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

      {/* Merchant Portal Highlight */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <Link to="/merchant-login" className="group block">
            <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500">
              <CardContent className="p-10 text-center relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-12 h-12 text-primary-foreground" />
                </div>
                <h3 className="text-3xl font-bold mb-4">
                  {isEnglish ? 'Merchant Portal' : '商户入口'}
                </h3>
                <p className="text-muted-foreground mb-6 text-lg">
                  {isEnglish 
                    ? 'Access your dashboard, view transactions, manage withdrawals, and integrate our API'
                    : '访问您的仪表板、查看交易、管理提现并集成我们的API'}
                </p>
                <div className="inline-flex items-center gap-2 text-primary font-semibold text-lg group-hover:gap-3 transition-all">
                  {isEnglish ? 'Login Now' : '立即登录'}
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
              {/* Background glow */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-500" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />
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
            
            <div className="flex items-center gap-6 text-sm">
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                {isEnglish ? 'About Us' : '关于我们'}
              </Link>
              <Link to="/docs" className="text-muted-foreground hover:text-primary transition-colors">
                {isEnglish ? 'Documentation' : '开发文档'}
              </Link>
              {settings.supportEmail && (
                <a href={`mailto:${settings.supportEmail}`} className="text-muted-foreground hover:text-primary transition-colors">
                  {isEnglish ? 'Contact' : '联系我们'}
                </a>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {settings.gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
