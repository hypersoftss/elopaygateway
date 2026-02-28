import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Store, 
  ArrowRight, 
  ArrowUp,
  Zap, 
  Globe, 
  Lock, 
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Shield,
  ChevronRight,
  Users,
  BarChart3,
  Wallet,
  ArrowUpRight,
  Play,
  Star,
  Quote,
  HelpCircle,
  Building2,
  Landmark,
  Smartphone,
  CircleDollarSign,
  ShieldCheck,
  Code2,
  Settings,
  Rocket,
  Check,
  X,
  Crown,
  Gem,
  Medal,
  Menu,
  Send,
  Mail,
  User,
  MessageSquare
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { CookieConsent } from '@/components/CookieConsent';
import { useState, useEffect } from 'react';

// Partner logo component
const PartnerLogo = ({ icon: Icon, name }: { icon: React.ElementType; name: string }) => (
  <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm shrink-0">
    <Icon className="h-6 w-6 text-primary" />
    <span className="font-semibold text-foreground/80 whitespace-nowrap">{name}</span>
  </div>
);

// Infinite scroll marquee component
const LogoMarquee = ({ children, direction = 'left' }: { children: React.ReactNode; direction?: 'left' | 'right' }) => (
  <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
    <div 
      className={`flex gap-6 animate-marquee ${direction === 'right' ? 'animate-marquee-reverse' : ''}`}
      style={{ 
        animationDuration: '30s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}
    >
      {children}
      {children}
    </div>
  </div>
);

// Animated counter component
const AnimatedCounter = ({ value, suffix = '' }: { value: string; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = numValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setCount(numValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [numValue]);
  
  return <span>{count.toLocaleString()}{suffix}</span>;
};

// Floating gradient orb
const GradientOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <div 
    className={`absolute rounded-full blur-3xl animate-pulse ${className}`}
    style={{ animationDelay: `${delay}s`, animationDuration: '4s' }}
  />
);

const Index = () => {
  const { language } = useTranslation();
  const { settings, isLoading } = useGatewaySettings();
  const isEnglish = language === 'en';

  const gatewayName = settings.gatewayName || 'ELOPAY';
  const logoUrl = settings.logoUrl;

  // Back to top button visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useDocumentMeta({
    title: `ELOPAY Gateway - #1 Payment Gateway for India, Pakistan & Bangladesh | UPI, JazzCash, bKash`,
    description: 'ELOPAY Gateway - Leading payment gateway for INR, PKR, BDT. Accept UPI, JazzCash, EasyPaisa, bKash, Nagad payments. Instant settlements, 99.9% uptime, enterprise security.',
    ogTitle: 'ELOPAY Gateway - #1 Payment Gateway for India, Pakistan & Bangladesh',
    ogDescription: 'ELOPAY Gateway - Leading payment gateway for INR, PKR, BDT. Accept UPI, JazzCash, EasyPaisa, bKash, Nagad payments with instant settlements.',
    ogImage: 'https://elopaygateway.in/og-image.png',
  });

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: isEnglish ? 'Lightning Fast' : '闪电般快速',
      description: isEnglish ? 'Process transactions in under 1 second with real-time settlement' : '1秒内处理交易，实时结算',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: isEnglish ? 'Bank-Grade Security' : '银行级安全',
      description: isEnglish ? '256-bit encryption with advanced fraud detection' : '256位加密，高级欺诈检测',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: isEnglish ? 'Multi-Channel' : '多渠道',
      description: isEnglish ? 'UPI, bank transfers, e-wallets, and crypto support' : 'UPI、银行转账、电子钱包、加密货币',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: isEnglish ? 'Smart Analytics' : '智能分析',
      description: isEnglish ? 'Real-time insights and comprehensive reporting' : '实时洞察和全面报告',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: isEnglish ? '99.9% Uptime' : '99.9%正常运行',
      description: isEnglish ? 'Enterprise-grade infrastructure, always available' : '企业级基础设施，始终可用',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: isEnglish ? '24/7 Support' : '全天候支持',
      description: isEnglish ? 'Dedicated support team at your service' : '专属支持团队为您服务',
      gradient: 'from-rose-500 to-red-600',
    },
  ];

  const stats = [
    { value: '50', suffix: 'M+', label: isEnglish ? 'Transactions' : '交易笔数' },
    { value: '99.9', suffix: '%', label: isEnglish ? 'Uptime' : '正常运行' },
    { value: '500', suffix: '+', label: isEnglish ? 'Merchants' : '商户' },
    { value: '3', suffix: '', label: isEnglish ? 'Countries' : '国家' },
  ];

  const trustedBy = [
    { name: 'India', flag: '🇮🇳', currency: 'INR' },
    { name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
    { name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT' },
  ];

  const testimonials = [
    {
      name: isEnglish ? 'Rahul Sharma' : 'Rahul Sharma',
      role: isEnglish ? 'CEO, TechVentures' : 'CEO, TechVentures',
      avatar: '🇮🇳',
      rating: 5,
      quote: isEnglish 
        ? 'ELOPAY transformed our payment processing. Settlement is instant and the dashboard gives us complete visibility into our transactions.'
        : 'ELOPAY 改变了我们的支付处理。结算是即时的，仪表板让我们完全了解我们的交易。',
    },
    {
      name: isEnglish ? 'Ahmed Hassan' : 'Ahmed Hassan',
      role: isEnglish ? 'Founder, PayEasy' : '创始人, PayEasy',
      avatar: '🇵🇰',
      rating: 5,
      quote: isEnglish 
        ? 'The multi-channel support is incredible. Our customers can pay via JazzCash, Easypaisa, or bank transfer - all through one integration.'
        : '多渠道支持令人难以置信。我们的客户可以通过JazzCash、Easypaisa或银行转账付款 - 全部通过一个集成。',
    },
    {
      name: isEnglish ? 'Fatima Begum' : 'Fatima Begum',
      role: isEnglish ? 'CFO, GlobalTrade' : 'CFO, GlobalTrade',
      avatar: '🇧🇩',
      rating: 5,
      quote: isEnglish 
        ? 'Security was our top concern. With 2FA and bank-grade encryption, we feel confident processing millions in transactions daily.'
        : '安全是我们最关心的问题。通过双重认证和银行级加密，我们有信心每天处理数百万笔交易。',
    },
    {
      name: isEnglish ? 'Priya Patel' : 'Priya Patel',
      role: isEnglish ? 'CTO, FastCommerce' : 'CTO, FastCommerce',
      avatar: '🇮🇳',
      rating: 5,
      quote: isEnglish 
        ? 'API integration was seamless. We were live in less than a day. The documentation is comprehensive and support team is responsive.'
        : 'API集成是无缝的。我们在不到一天的时间内就上线了。文档全面，支持团队响应迅速。',
    },
    {
      name: isEnglish ? 'Karim Ali' : 'Karim Ali',
      role: isEnglish ? 'Director, QuickPay' : '总监, QuickPay',
      avatar: '🇵🇰',
      rating: 5,
      quote: isEnglish 
        ? 'The real-time analytics help us make data-driven decisions. We can see exactly where our revenue is coming from.'
        : '实时分析帮助我们做出数据驱动的决策。我们可以确切地看到收入来自哪里。',
    },
    {
      name: isEnglish ? 'Nadia Rahman' : 'Nadia Rahman',
      role: isEnglish ? 'Operations Head, BizPay' : '运营主管, BizPay',
      avatar: '🇧🇩',
      rating: 5,
      quote: isEnglish 
        ? '24/7 support means we never worry about downtime. Any issue is resolved within minutes. Truly enterprise-grade service.'
        : '全天候支持意味着我们从不担心停机。任何问题都能在几分钟内解决。真正的企业级服务。',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <GradientOrb className="w-[600px] h-[600px] -top-48 -left-48 bg-primary/30" delay={0} />
        <GradientOrb className="w-[500px] h-[500px] top-1/3 -right-32 bg-emerald-500/20" delay={1} />
        <GradientOrb className="w-[400px] h-[400px] bottom-0 left-1/3 bg-blue-500/20" delay={2} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        showBackToTop 
          ? 'border-border/60 bg-background/90 backdrop-blur-xl shadow-lg shadow-black/5' 
          : 'border-border/40 bg-background/60 backdrop-blur-xl'
      }`}>
        <div className={`container mx-auto px-4 flex items-center justify-between transition-all duration-300 ${
          showBackToTop ? 'h-14' : 'h-16'
        }`}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className={`rounded-xl object-contain transition-all duration-300 ${
                showBackToTop ? 'h-7 w-7' : 'h-9 w-9'
              }`} />
            ) : !isLoading ? (
              <div className={`rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-300 ${
                showBackToTop ? 'h-7 w-7' : 'h-9 w-9'
              }`}>
                <Zap className={`text-primary-foreground transition-all duration-300 ${
                  showBackToTop ? 'h-4 w-4' : 'h-5 w-5'
                }`} />
              </div>
            ) : (
              <div className={`rounded-xl bg-muted animate-pulse transition-all duration-300 ${
                showBackToTop ? 'h-7 w-7' : 'h-9 w-9'
              }`} />
            )}
            <span className={`font-bold transition-all duration-300 ${
              showBackToTop ? 'text-lg' : 'text-xl'
            }`}>{gatewayName}</span>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {[
              { href: '#features', label: isEnglish ? 'Features' : '特性' },
              { href: '#pricing', label: isEnglish ? 'Pricing' : '定价' },
              { href: '#testimonials', label: isEnglish ? 'Reviews' : '评价' },
              { href: '#faq', label: isEnglish ? 'FAQ' : '常见问题' },
              { href: '#contact', label: isEnglish ? 'Contact' : '联系' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageSwitch />
            <Button asChild variant="default" size="sm" className="hidden sm:flex">
              <Link to="/merchant-login">
                {isEnglish ? 'Login' : '登录'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-xl object-contain" />
                    ) : (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    {gatewayName}
                  </SheetTitle>
                </SheetHeader>
                
                <nav className="flex flex-col gap-1 mt-8">
                  {[
                    { href: '#features', label: isEnglish ? 'Features' : '特性', icon: Sparkles },
                    { href: '#pricing', label: isEnglish ? 'Pricing' : '定价', icon: Crown },
                    { href: '#testimonials', label: isEnglish ? 'Reviews' : '评价', icon: Star },
                    { href: '#faq', label: isEnglish ? 'FAQ' : '常见问题', icon: HelpCircle },
                    { href: '#contact', label: isEnglish ? 'Contact' : '联系', icon: Mail },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                        // Close the sheet by clicking outside or using escape
                        const closeButton = document.querySelector('[data-radix-collection-item]');
                        if (closeButton instanceof HTMLElement) closeButton.click();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-colors"
                    >
                      <link.icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{link.label}</span>
                    </a>
                  ))}
                </nav>
                
                <div className="mt-8 pt-6 border-t border-border">
                  <Button asChild className="w-full" size="lg">
                    <Link to="/merchant-login">
                      <Store className="h-5 w-5 mr-2" />
                      {isEnglish ? 'Merchant Login' : '商户登录'}
                    </Link>
                  </Button>
                </div>
                
                <div className="mt-6 flex flex-col gap-4 text-sm text-muted-foreground">
                  <Link to="/docs" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Play className="h-4 w-4" />
                    {isEnglish ? 'Documentation' : '文档'}
                  </Link>
                  {settings.supportEmail && (
                    <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      <HelpCircle className="h-4 w-4" />
                      {isEnglish ? 'Contact Support' : '联系支持'}
                    </a>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              {isEnglish ? 'Trusted by 500+ businesses' : '500+企业信赖'}
              <ChevronRight className="h-4 w-4" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              {isEnglish ? (
                <>
                  The Future of
                  <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                    Digital Payments
                  </span>
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                    数字支付
                  </span>
                  <span className="block mt-2">的未来</span>
                </>
              )}
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed">
              {isEnglish 
                ? 'Accept payments from India, Pakistan & Bangladesh with instant settlement, zero hassle, and enterprise-grade security.'
                : '接受来自印度、巴基斯坦和孟加拉国的付款，即时结算，零麻烦，企业级安全。'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
              <Button 
                asChild 
                size="lg" 
                className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
              >
                <Link to="/merchant-login">
                  <Store className="h-5 w-5 mr-2" />
                  {isEnglish ? 'Start Accepting Payments' : '开始接受付款'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-lg font-semibold border-2 hover:-translate-y-0.5 transition-all"
              >
                <Link to="/docs">
                  <Play className="h-5 w-5 mr-2" />
                  {isEnglish ? 'View Documentation' : '查看文档'}
                </Link>
              </Button>
            </div>

            {/* Regions */}
            <div className="flex flex-wrap items-center justify-center gap-6 animate-fade-in">
              <span className="text-sm text-muted-foreground">{isEnglish ? 'Available in:' : '可用地区:'}</span>
              {trustedBy.map((region, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm"
                >
                  <span className="text-xl">{region.flag}</span>
                  <span className="font-medium">{region.name}</span>
                  <span className="text-xs text-muted-foreground">({region.currency})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm md:text-base text-muted-foreground mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <Rocket className="h-4 w-4" />
              {isEnglish ? 'Simple Integration' : '简单集成'}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {isEnglish ? 'How It Works' : '工作原理'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isEnglish 
                ? 'Get started in minutes with our simple 4-step integration process'
                : '通过我们简单的4步集成流程，几分钟内即可开始'}
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6 relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              
              {[
                {
                  step: 1,
                  icon: <Users className="h-6 w-6" />,
                  title: isEnglish ? 'Create Account' : '创建账户',
                  description: isEnglish ? 'Sign up and get your merchant credentials instantly' : '注册并立即获取商户凭证',
                },
                {
                  step: 2,
                  icon: <Code2 className="h-6 w-6" />,
                  title: isEnglish ? 'Integrate API' : '集成API',
                  description: isEnglish ? 'Use our SDK or REST API with comprehensive docs' : '使用我们的SDK或REST API及全面文档',
                },
                {
                  step: 3,
                  icon: <Settings className="h-6 w-6" />,
                  title: isEnglish ? 'Configure' : '配置',
                  description: isEnglish ? 'Set up payment methods, callbacks & webhooks' : '设置支付方式、回调和Webhooks',
                },
                {
                  step: 4,
                  icon: <Rocket className="h-6 w-6" />,
                  title: isEnglish ? 'Go Live' : '上线',
                  description: isEnglish ? 'Start accepting payments from customers' : '开始接受客户付款',
                },
              ].map((item, index) => (
                <div key={index} className="relative text-center group">
                  {/* Step number circle */}
                  <div className="relative mx-auto mb-6 w-32 h-32 rounded-full bg-gradient-to-br from-card to-card/50 border border-border/50 flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 group-hover:-translate-y-2">
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                      {item.step}
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <Button asChild size="lg" className="h-12 px-8 shadow-lg">
                <Link to="/docs">
                  <Play className="h-5 w-5 mr-2" />
                  {isEnglish ? 'View Integration Guide' : '查看集成指南'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {isEnglish ? 'Everything You Need' : '您所需的一切'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isEnglish 
                ? 'Powerful features to help you accept payments and grow your business'
                : '强大的功能帮助您接受付款并发展业务'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                <ArrowUpRight className="absolute top-6 right-6 h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-gradient-to-b from-transparent via-card/30 to-transparent scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <Crown className="h-4 w-4" />
              {isEnglish ? 'Pricing Plans' : '定价方案'}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {isEnglish ? 'Simple, Transparent Pricing' : '简单透明的定价'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isEnglish 
                ? 'Choose the plan that fits your business needs'
                : '选择适合您业务需求的方案'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: isEnglish ? 'Starter' : '入门版',
                icon: <Medal className="h-6 w-6" />,
                price: isEnglish ? 'Contact Us' : '联系我们',
                description: isEnglish ? 'Perfect for small businesses' : '适合小型企业',
                gradient: 'from-slate-500 to-slate-600',
                features: [
                  { name: isEnglish ? 'Up to ₹5L monthly volume' : '每月最高₹50万交易量', included: true },
                  { name: isEnglish ? 'Standard payin fee' : '标准代收费率', included: true },
                  { name: isEnglish ? 'Standard payout fee' : '标准代付费率', included: true },
                  { name: isEnglish ? 'Email support' : '邮件支持', included: true },
                  { name: isEnglish ? 'Basic analytics' : '基础分析', included: true },
                  { name: isEnglish ? 'Priority support' : '优先支持', included: false },
                  { name: isEnglish ? 'Custom integration' : '定制集成', included: false },
                ],
                popular: false,
              },
              {
                name: isEnglish ? 'Business' : '商业版',
                icon: <Gem className="h-6 w-6" />,
                price: isEnglish ? 'Contact Us' : '联系我们',
                description: isEnglish ? 'For growing businesses' : '适合成长型企业',
                gradient: 'from-primary to-blue-600',
                features: [
                  { name: isEnglish ? 'Up to ₹50L monthly volume' : '每月最高₹500万交易量', included: true },
                  { name: isEnglish ? 'Reduced payin fee' : '优惠代收费率', included: true },
                  { name: isEnglish ? 'Reduced payout fee' : '优惠代付费率', included: true },
                  { name: isEnglish ? '24/7 support' : '全天候支持', included: true },
                  { name: isEnglish ? 'Advanced analytics' : '高级分析', included: true },
                  { name: isEnglish ? 'Priority support' : '优先支持', included: true },
                  { name: isEnglish ? 'Custom integration' : '定制集成', included: false },
                ],
                popular: true,
              },
              {
                name: isEnglish ? 'Enterprise' : '企业版',
                icon: <Crown className="h-6 w-6" />,
                price: isEnglish ? 'Custom' : '定制',
                description: isEnglish ? 'For large organizations' : '适合大型企业',
                gradient: 'from-amber-500 to-orange-600',
                features: [
                  { name: isEnglish ? 'Unlimited monthly volume' : '无限月交易量', included: true },
                  { name: isEnglish ? 'Custom payin fee' : '定制代收费率', included: true },
                  { name: isEnglish ? 'Custom payout fee' : '定制代付费率', included: true },
                  { name: isEnglish ? 'Dedicated account manager' : '专属客户经理', included: true },
                  { name: isEnglish ? 'Real-time analytics' : '实时分析', included: true },
                  { name: isEnglish ? 'Priority support' : '优先支持', included: true },
                  { name: isEnglish ? 'Custom integration' : '定制集成', included: true },
                ],
                popular: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative p-6 rounded-2xl bg-card border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  plan.popular 
                    ? 'border-primary shadow-xl shadow-primary/10 scale-105' 
                    : 'border-border/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {isEnglish ? 'Most Popular' : '最受欢迎'}
                  </div>
                )}
                
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${plan.gradient} text-white mb-4 shadow-lg`}>
                  {plan.icon}
                </div>
                
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  asChild 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  <Link to="/merchant-login">
                    {isEnglish ? 'Get Started' : '开始使用'}
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {isEnglish 
              ? 'All plans include SSL encryption, 2FA security, and API access. Contact us for volume-based discounts.'
              : '所有方案均包含SSL加密、双重验证和API访问。联系我们了解批量折扣。'}
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-gradient-to-b from-transparent via-card/30 to-transparent scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <Star className="h-4 w-4 fill-current" />
              {isEnglish ? 'Customer Reviews' : '客户评价'}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {isEnglish ? 'Loved by Businesses' : '深受企业喜爱'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isEnglish 
                ? 'See what our merchants say about their experience with us'
                : '看看我们的商户对他们的体验有什么看法'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
                
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                {/* Quote */}
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
                  "{testimonial.quote}"
                </p>
                
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex -space-x-2">
                {['🇮🇳', '🇵🇰', '🇧🇩'].map((flag, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-lg">
                    {flag}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium ml-2">
                {isEnglish ? '500+ happy merchants' : '500+ 满意商户'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {isEnglish ? '4.9/5 average rating' : '4.9/5 平均评分'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Logos Carousel */}
      <section className="py-16 border-y border-border/40 bg-card/20 overflow-hidden">
        <div className="container mx-auto px-4 mb-10">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {isEnglish ? 'Trusted Payment Methods' : '信任的支付方式'}
            </p>
          </div>
        </div>
        
        {/* First row - left scroll */}
        <div className="mb-6">
          <LogoMarquee direction="left">
            <PartnerLogo icon={Landmark} name="Bank Transfer" />
            <PartnerLogo icon={Smartphone} name="JazzCash" />
            <PartnerLogo icon={CreditCard} name="Easypaisa" />
            <PartnerLogo icon={CircleDollarSign} name="bKash" />
            <PartnerLogo icon={Wallet} name="Nagad" />
            <PartnerLogo icon={Building2} name="UPI" />
            <PartnerLogo icon={ShieldCheck} name="IMPS" />
            <PartnerLogo icon={Globe} name="NEFT" />
          </LogoMarquee>
        </div>
        
        {/* Second row - right scroll */}
        <LogoMarquee direction="right">
          <PartnerLogo icon={CreditCard} name="Visa" />
          <PartnerLogo icon={CreditCard} name="Mastercard" />
          <PartnerLogo icon={Building2} name="RTGS" />
          <PartnerLogo icon={Smartphone} name="PhonePe" />
          <PartnerLogo icon={Wallet} name="Paytm" />
          <PartnerLogo icon={CircleDollarSign} name="Google Pay" />
          <PartnerLogo icon={Landmark} name="Net Banking" />
          <PartnerLogo icon={ShieldCheck} name="USDT" />
        </LogoMarquee>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <HelpCircle className="h-4 w-4" />
              {isEnglish ? 'FAQ' : '常见问题'}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {isEnglish ? 'Frequently Asked Questions' : '常见问题解答'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isEnglish 
                ? 'Everything you need to know about our payment gateway'
                : '关于我们支付网关您需要了解的一切'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'How do I integrate the payment gateway?' : '如何集成支付网关？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'Integration is simple! We provide comprehensive API documentation with code examples in PHP, JavaScript, and other languages. Most merchants complete integration within a day. Our support team is available 24/7 to assist you.'
                    : '集成非常简单！我们提供全面的API文档，包含PHP、JavaScript和其他语言的代码示例。大多数商户在一天内完成集成。我们的支持团队全天候为您提供帮助。'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'What payment methods are supported?' : '支持哪些支付方式？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'We support a wide range of payment methods including UPI, bank transfers (IMPS, NEFT, RTGS), e-wallets (JazzCash, Easypaisa, bKash, Nagad), and USDT cryptocurrency. Payment options vary by region.'
                    : '我们支持广泛的支付方式，包括UPI、银行转账（IMPS、NEFT、RTGS）、电子钱包（JazzCash、Easypaisa、bKash、Nagad）和USDT加密货币。支付选项因地区而异。'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'How fast are settlements?' : '结算速度有多快？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'We offer instant settlement for most transactions. Your funds are available in your merchant balance immediately after a successful payment, and you can withdraw to your bank account anytime.'
                    : '我们为大多数交易提供即时结算。成功付款后，您的资金立即可用于商户余额，您可以随时提现到银行账户。'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'What are the fees?' : '费用是多少？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'Our fees are competitive and transparent. We charge a small percentage per transaction for payins and a flat fee for payouts. Volume discounts are available for high-volume merchants. Contact us for a custom quote.'
                    : '我们的费用具有竞争力且透明。我们对代收收取少量百分比，对代付收取固定费用。高交易量商户可享受批量折扣。联系我们获取定制报价。'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'Is my data secure?' : '我的数据安全吗？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'Absolutely. We use 256-bit SSL encryption, implement strict 2FA authentication, and follow industry best practices for data security. Your sensitive information is never stored on our servers and all transactions are monitored for fraud.'
                    : '绝对安全。我们使用256位SSL加密，实施严格的双重身份验证，并遵循数据安全的行业最佳实践。您的敏感信息永远不会存储在我们的服务器上，所有交易都会受到欺诈监控。'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {isEnglish ? 'Which countries do you support?' : '您支持哪些国家？'}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {isEnglish 
                    ? 'We currently support merchants accepting payments in India (INR), Pakistan (PKR), and Bangladesh (BDT). Each region has localized payment methods optimized for the local market.'
                    : '我们目前支持在印度（INR）、巴基斯坦（PKR）和孟加拉国（BDT）接受付款的商户。每个地区都有针对当地市场优化的本地化支付方式。'}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-32 bg-gradient-to-b from-transparent via-card/30 to-transparent scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left side - Info */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
                  <MessageSquare className="h-4 w-4" />
                  {isEnglish ? 'Get In Touch' : '联系我们'}
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  {isEnglish ? 'Contact Us' : '联系我们'}
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  {isEnglish 
                    ? 'Have questions about our payment gateway? Want to discuss custom pricing? Our team is here to help.'
                    : '对我们的支付网关有疑问？想讨论定制价格？我们的团队随时为您提供帮助。'}
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{isEnglish ? 'Email Us' : '发送邮件'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {settings.supportEmail || 'support@elopay.com'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{isEnglish ? 'Response Time' : '响应时间'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isEnglish ? 'We typically respond within 24 hours' : '我们通常在24小时内回复'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{isEnglish ? 'Regions' : '服务地区'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isEnglish ? 'India • Pakistan • Bangladesh' : '印度 • 巴基斯坦 • 孟加拉国'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Form */}
              <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-xl">
                <form 
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name');
                    const email = formData.get('email');
                    const message = formData.get('message');
                    const subject = `Business Inquiry from ${name}`;
                    const body = `Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AMessage:%0D%0A${message}`;
                    window.location.href = `mailto:${settings.supportEmail || 'support@elopay.com'}?subject=${encodeURIComponent(subject as string)}&body=${body}`;
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {isEnglish ? 'Your Name' : '您的姓名'}
                    </Label>
                    <Input 
                      id="name" 
                      name="name"
                      placeholder={isEnglish ? 'John Doe' : '张三'}
                      required
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {isEnglish ? 'Email Address' : '电子邮箱'}
                    </Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email"
                      placeholder={isEnglish ? 'john@company.com' : 'zhang@company.com'}
                      required
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      {isEnglish ? 'Your Message' : '您的留言'}
                    </Label>
                    <Textarea 
                      id="message" 
                      name="message"
                      placeholder={isEnglish ? 'Tell us about your business and how we can help...' : '告诉我们您的业务以及我们如何能帮助您...'}
                      required
                      className="min-h-[120px] resize-none"
                    />
                  </div>
                  
                  <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold">
                    <Send className="h-5 w-5 mr-2" />
                    {isEnglish ? 'Send Message' : '发送消息'}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    {isEnglish 
                      ? 'By submitting, you agree to our terms of service and privacy policy.'
                      : '提交即表示您同意我们的服务条款和隐私政策。'}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-600 to-primary" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
            
            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
              <Wallet className="h-16 w-16 mx-auto mb-6 text-white/90" />
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                {isEnglish ? 'Ready to Get Started?' : '准备开始了吗？'}
              </h2>
              <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                {isEnglish 
                  ? 'Join 500+ businesses already using our platform to accept payments seamlessly.'
                  : '加入500+已经使用我们平台无缝接受付款的企业。'}
              </p>
              <Button 
                asChild 
                size="lg" 
                variant="secondary"
                className="h-14 px-10 text-lg font-semibold shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Link to="/merchant-login">
                  {isEnglish ? 'Access Merchant Portal' : '访问商户门户'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="ELOPAY Gateway Logo" className="h-10 w-10 rounded-lg object-contain" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <span className="font-bold text-lg">{gatewayName}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isEnglish 
                  ? 'Leading payment gateway for India, Pakistan & Bangladesh. UPI, JazzCash, EasyPaisa, bKash, Nagad payments.'
                  : '印度、巴基斯坦和孟加拉国领先的支付网关。UPI、JazzCash、EasyPaisa、bKash、Nagad支付。'}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">{isEnglish ? 'Quick Links' : '快速链接'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'Features' : '特性'}
                  </a>
                </li>
                <li>
                  <a href="#pricing" onClick={(e) => { e.preventDefault(); document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'Pricing' : '定价'}
                  </a>
                </li>
                <li>
                  <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'API Documentation' : 'API文档'}
                  </Link>
                </li>
                <li>
                  <a href="#faq" onClick={(e) => { e.preventDefault(); document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'FAQ' : '常见问题'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">{isEnglish ? 'Legal' : '法律'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'Privacy Policy' : '隐私政策'}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'Terms & Conditions' : '服务条款'}
                  </Link>
                </li>
                <li>
                  <a href="#contact" onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isEnglish ? 'Contact Support' : '联系支持'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect - Telegram */}
            <div>
              <h4 className="font-semibold mb-4">{isEnglish ? 'Connect With Us' : '联系我们'}</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a 
                    href="https://t.me/EloPayGateway" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    {isEnglish ? 'Direct Support' : '直接支持'}
                  </a>
                </li>
                <li>
                  <a 
                    href="https://t.me/EloPayGatewayOfficial" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {isEnglish ? 'Official Channel' : '官方频道'}
                  </a>
                </li>
                <li>
                  <a 
                    href="https://t.me/EloPayGateway_bot" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    {isEnglish ? 'Telegram Bot' : 'Telegram 机器人'}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {gatewayName}. {isEnglish ? 'All rights reserved.' : '保留所有权利。'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>🇮🇳 INR</span>
              <span>•</span>
              <span>🇵🇰 PKR</span>
              <span>•</span>
              <span>🇧🇩 BDT</span>
              <span>•</span>
              <span>💎 USDT</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      {/* Cookie Consent Banner */}
      <CookieConsent isEnglish={isEnglish} />
    </div>
  );
};

export default Index;
