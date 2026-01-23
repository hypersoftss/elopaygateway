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
  Banknote,
  Coins,
  PiggyBank,
  Receipt,
  Landmark,
  DollarSign,
  Bitcoin
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { ScrollReveal } from '@/hooks/useScrollReveal';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// Enhanced floating particle component with 3D effects
const FloatingParticle = ({ 
  icon: Icon, 
  className, 
  delay = 0,
  size = 'md',
  opacity = 'medium'
}: { 
  icon: React.ElementType; 
  className: string; 
  delay?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  opacity?: 'low' | 'medium' | 'high';
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };
  
  const opacityClasses = {
    low: 'text-primary/10',
    medium: 'text-primary/20',
    high: 'text-primary/30',
  };

  return (
    <div 
      className={`absolute animate-float ${opacityClasses[opacity]} ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
        animationDuration: `${6 + delay}s`,
      }}
    >
      <Icon className={sizeClasses[size]} />
    </div>
  );
};

// 3D Floating orb component
const FloatingOrb = ({ 
  className, 
  size = 200,
  color = 'primary',
  delay = 0 
}: { 
  className: string; 
  size?: number;
  color?: 'primary' | 'secondary' | 'accent';
  delay?: number;
}) => {
  const colorClasses = {
    primary: 'from-primary/30 via-primary/10 to-transparent',
    secondary: 'from-blue-500/20 via-blue-500/5 to-transparent',
    accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  };

  return (
    <div 
      className={`absolute rounded-full bg-gradient-radial ${colorClasses[color]} blur-3xl animate-pulse ${className}`}
      style={{ 
        width: size, 
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: `${4 + delay}s`,
      }}
    />
  );
};

const Index = () => {
  const { language } = useTranslation();
  const { settings, isLoading } = useGatewaySettings();
  const isEnglish = language === 'en';

  // Use gateway name and logo from settings
  const gatewayName = settings.gatewayName;
  const logoUrl = settings.logoUrl;

  // Dynamic document meta
  useDocumentMeta({
    title: gatewayName ? `${gatewayName} - ${isEnglish ? 'Professional Payment Gateway' : '专业支付网关'}` : undefined,
    description: gatewayName 
      ? (isEnglish 
          ? `${gatewayName} - Secure, fast, and reliable payment processing with instant settlement and enterprise-grade security.`
          : `${gatewayName} - 安全、快速、可靠的支付处理，即时结算，企业级安全。`)
      : undefined,
    ogTitle: gatewayName ? `${gatewayName} - ${isEnglish ? 'Payment Gateway' : '支付网关'}` : undefined,
    ogDescription: gatewayName
      ? (isEnglish
          ? `Power your business with ${gatewayName}. Multi-channel payments, real-time analytics, and 24/7 support.`
          : `使用${gatewayName}为您的业务赋能。多渠道支付、实时分析和全天候支持。`)
      : undefined,
    ogImage: logoUrl || undefined,
  });

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
      {/* Enhanced 3D Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden" style={{ perspective: '1000px' }}>
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        
        {/* 3D Grid Effect */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'center top',
          }}
        />
        
        {/* Floating Orbs - 3D depth effect */}
        <FloatingOrb className="top-[-10%] left-[-5%]" size={400} color="primary" delay={0} />
        <FloatingOrb className="top-[20%] right-[-10%]" size={350} color="secondary" delay={1.5} />
        <FloatingOrb className="bottom-[-10%] left-[20%]" size={450} color="accent" delay={0.5} />
        <FloatingOrb className="top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2" size={600} color="primary" delay={2} />
        <FloatingOrb className="bottom-[10%] right-[10%]" size={250} color="secondary" delay={1} />
        
        {/* Floating Particles - Multiple sizes and opacities */}
        {/* Large particles */}
        <FloatingParticle icon={CreditCard} className="top-[8%] left-[8%]" delay={0} size="xl" opacity="high" />
        <FloatingParticle icon={Wallet} className="top-[15%] right-[12%]" delay={1.5} size="lg" opacity="medium" />
        <FloatingParticle icon={CircleDollarSign} className="top-[55%] left-[5%]" delay={0.5} size="xl" opacity="medium" />
        <FloatingParticle icon={Shield} className="top-[35%] right-[8%]" delay={2} size="lg" opacity="high" />
        
        {/* Medium particles */}
        <FloatingParticle icon={Banknote} className="bottom-[25%] left-[15%]" delay={1} size="md" opacity="medium" />
        <FloatingParticle icon={BadgeCheck} className="bottom-[35%] right-[18%]" delay={2.5} size="md" opacity="high" />
        <FloatingParticle icon={Globe} className="top-[25%] left-[22%]" delay={3} size="md" opacity="low" />
        <FloatingParticle icon={Zap} className="bottom-[20%] right-[25%]" delay={0.8} size="lg" opacity="medium" />
        <FloatingParticle icon={Coins} className="top-[45%] left-[12%]" delay={1.2} size="md" opacity="medium" />
        <FloatingParticle icon={PiggyBank} className="top-[70%] right-[10%]" delay={2.2} size="lg" opacity="low" />
        
        {/* Small particles - scattered */}
        <FloatingParticle icon={DollarSign} className="top-[12%] left-[35%]" delay={0.3} size="sm" opacity="low" />
        <FloatingParticle icon={Receipt} className="top-[30%] right-[30%]" delay={1.8} size="sm" opacity="low" />
        <FloatingParticle icon={Landmark} className="bottom-[40%] left-[30%]" delay={2.8} size="sm" opacity="medium" />
        <FloatingParticle icon={Bitcoin} className="top-[60%] right-[35%]" delay={0.6} size="sm" opacity="low" />
        <FloatingParticle icon={Lock} className="bottom-[15%] left-[40%]" delay={3.2} size="sm" opacity="low" />
        <FloatingParticle icon={TrendingUp} className="top-[75%] left-[25%]" delay={1.4} size="sm" opacity="medium" />
        <FloatingParticle icon={Clock} className="top-[20%] left-[60%]" delay={2.1} size="sm" opacity="low" />
        <FloatingParticle icon={CreditCard} className="bottom-[60%] right-[40%]" delay={0.9} size="sm" opacity="low" />
        
        {/* Extra tiny sparkles */}
        <FloatingParticle icon={Sparkles} className="top-[5%] right-[45%]" delay={1.6} size="sm" opacity="low" />
        <FloatingParticle icon={Sparkles} className="bottom-[10%] left-[55%]" delay={2.4} size="sm" opacity="low" />
        <FloatingParticle icon={Sparkles} className="top-[40%] left-[45%]" delay={0.4} size="sm" opacity="low" />
      </div>

      {/* Header with glass effect */}
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 w-10 rounded-xl object-contain shadow-lg ring-2 ring-primary/20"
              />
            ) : !isLoading ? (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            )}
            {gatewayName ? (
              <span className="text-xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                {gatewayName}
              </span>
            ) : (
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Hero Section with 3D card effect */}
      <section className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge with glow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary animate-fade-in shadow-lg shadow-primary/10">
            <Sparkles className="h-4 w-4" />
            {isEnglish ? 'Professional Payment Gateway' : '专业支付网关'}
          </div>

          {/* Main Heading with 3D text effect */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight animate-fade-in">
            {isEnglish ? (
              <>
                Power Your Business with
                <br />
                <span 
                  className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent drop-shadow-sm"
                  style={{ 
                    textShadow: '0 4px 12px hsl(var(--primary) / 0.3)',
                  }}
                >
                  {gatewayName || <span className="inline-block h-12 w-48 bg-muted/50 rounded animate-pulse" />}
                </span>
              </>
            ) : (
              <>
                <span 
                  className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent"
                  style={{ 
                    textShadow: '0 4px 12px hsl(var(--primary) / 0.3)',
                  }}
                >
                  {gatewayName || <span className="inline-block h-12 w-48 bg-muted/50 rounded animate-pulse" />}
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

          {/* CTA Button with 3D hover effect */}
          <div className="flex items-center justify-center pt-4 animate-fade-in">
            <Button 
              asChild 
              size="lg" 
              className="h-16 px-12 text-lg font-semibold shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-r from-primary to-primary/90 border-t border-primary-foreground/20"
            >
              <Link to="/merchant-login">
                <Store className="h-6 w-6 mr-3" />
                {isEnglish ? 'Merchant Login' : '商户登录'}
                <ArrowRight className="h-6 w-6 ml-3" />
              </Link>
            </Button>
          </div>

          {/* Stats with 3D cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group text-center p-5 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border border-border/50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  transform: 'perspective(1000px)',
                }}
              >
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with 3D grid */}
      <section className="relative container mx-auto px-4 py-20">
        <ScrollReveal>
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
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Card 
                className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 h-full"
                style={{ transform: 'perspective(1000px)' }}
              >
                <CardContent className="p-6 relative z-10">
                  <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground transition-all duration-500 shadow-lg group-hover:shadow-primary/25 group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
                {/* 3D shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -inset-px bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Merchant Portal Highlight with 3D effect */}
      <section className="relative container mx-auto px-4 py-20">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto" style={{ perspective: '1000px' }}>
            <Link to="/merchant-login" className="group block">
              <Card 
                className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/5 hover:border-primary/50 transition-all duration-700 hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.4)]"
                style={{
                  transform: 'rotateX(2deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <CardContent className="p-10 text-center relative z-10">
                  <div 
                    className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                    style={{ transform: 'translateZ(20px)' }}
                  >
                    <Store className="w-14 h-14 text-primary-foreground" />
                  </div>
                  <h3 
                    className="text-3xl font-bold mb-4"
                    style={{ transform: 'translateZ(10px)' }}
                  >
                    {isEnglish ? 'Merchant Portal' : '商户入口'}
                  </h3>
                  <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                    {isEnglish 
                      ? 'Access your dashboard, view transactions, manage withdrawals, and integrate our API'
                      : '访问您的仪表板、查看交易、管理提现并集成我们的API'}
                  </p>
                  <div className="inline-flex items-center gap-3 text-primary font-semibold text-xl bg-primary/10 px-6 py-3 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    {isEnglish ? 'Login Now' : '立即登录'}
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
                
                {/* 3D glow effects */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-700" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Card>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Trust Indicators with 3D badges */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
          {[
            { icon: CheckCircle2, text: isEnglish ? 'SSL Encrypted' : 'SSL加密' },
            { icon: CheckCircle2, text: isEnglish ? 'PCI Compliant' : 'PCI合规' },
            { icon: CheckCircle2, text: isEnglish ? '2FA Security' : '双重认证' },
            { icon: CheckCircle2, text: isEnglish ? 'Real-time Monitoring' : '实时监控' },
          ].map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
            >
              <item.icon className="h-5 w-5 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer with glass effect */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : !isLoading ? (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              )}
              <span className="font-semibold">{gatewayName}</span>
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
              © {new Date().getFullYear()} {gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
