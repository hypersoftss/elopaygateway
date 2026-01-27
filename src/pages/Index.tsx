import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  Shield,
  ChevronRight,
  Users,
  BarChart3,
  Wallet,
  ArrowUpRight,
  Play,
  Star,
  Quote
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useState, useEffect } from 'react';

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

  useDocumentMeta({
    title: gatewayName ? `${gatewayName} - ${isEnglish ? 'Next-Gen Payment Gateway' : '新一代支付网关'}` : undefined,
    description: gatewayName 
      ? (isEnglish 
          ? `${gatewayName} - The future of digital payments. Secure, instant, and borderless transactions.`
          : `${gatewayName} - 数字支付的未来。安全、即时、无国界交易。`)
      : undefined,
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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-xl object-contain" />
            ) : !isLoading ? (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            )}
            <span className="text-xl font-bold">{gatewayName}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitch />
            <Button asChild variant="default" size="sm" className="hidden sm:flex">
              <Link to="/merchant-login">
                {isEnglish ? 'Login' : '登录'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
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

      {/* Features Section */}
      <section className="py-20 md:py-32">
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

      {/* Testimonials Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-transparent via-card/30 to-transparent">
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
      <footer className="py-8 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold">{gatewayName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {gatewayName}. {isEnglish ? 'All rights reserved.' : '保留所有权利。'}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isEnglish ? 'Documentation' : '文档'}
              </Link>
              {settings.supportEmail && (
                <a href={`mailto:${settings.supportEmail}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {isEnglish ? 'Support' : '支持'}
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
