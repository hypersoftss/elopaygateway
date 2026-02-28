import { Link } from 'react-router-dom';
import { ShieldCheck, Store, ArrowRight, Zap, Globe, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// Floating gradient orb
const GradientOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <div 
    className={`absolute rounded-full blur-3xl animate-pulse ${className}`}
    style={{ animationDelay: `${delay}s`, animationDuration: '4s' }}
  />
);

const Landing = () => {
  const { language } = useTranslation();
  const { settings, isLoading } = useGatewaySettings();
  const isEnglish = language === 'en';

  useDocumentMeta({
    title: 'ELOPAY Gateway - Payment Gateway for India, Pakistan & Bangladesh',
    description: 'Secure payment gateway with UPI, bKash, JazzCash, Easypaisa & USDT. Instant payins & payouts for South Asia.',
    ogTitle: 'ELOPAY Gateway - Fast & Secure Payments',
    ogDescription: 'Accept payments via UPI, bKash, JazzCash, Easypaisa. Instant settlement for merchants.',
    ogImage: 'https://elopaygateway.in/og-image.png',
    keywords: 'payment gateway, UPI gateway, bKash gateway, JazzCash, Easypaisa, ELOPAY, South Asia payments',
    canonicalUrl: 'https://elopaygateway.in/',
  });

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: isEnglish ? 'Instant Processing' : '即时处理',
      description: isEnglish ? 'Lightning-fast payin & payout' : '闪电般的代收代付',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: isEnglish ? 'Multi-Channel' : '多渠道',
      description: isEnglish ? 'UPI, bank & e-wallets' : 'UPI、银行和电子钱包',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: isEnglish ? 'Enterprise Security' : '企业级安全',
      description: isEnglish ? '256-bit encryption + 2FA' : '256位加密 + 双重验证',
      gradient: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <GradientOrb className="w-[500px] h-[500px] -top-32 -left-32 bg-primary/30" delay={0} />
        <GradientOrb className="w-[400px] h-[400px] top-1/2 -right-24 bg-emerald-500/20" delay={1} />
        <GradientOrb className="w-[350px] h-[350px] bottom-0 left-1/4 bg-blue-500/20" delay={2} />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain shadow-lg" />
            ) : !isLoading ? (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            )}
            <span className="font-bold text-xl">{settings.gatewayName || 'ELOPAY'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary animate-fade-in">
            <Sparkles className="h-4 w-4" />
            {isEnglish ? 'Professional Payment Gateway' : '专业支付网关'}
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in">
            {isEnglish ? (
              <>
                Welcome to
                <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  {settings.gatewayName || 'ELOPAY'}
                </span>
              </>
            ) : (
              <>
                欢迎来到
                <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  {settings.gatewayName || 'ELOPAY'}
                </span>
              </>
            )}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            {isEnglish
              ? 'Secure, fast, and reliable payment processing for your business'
              : '为您的业务提供安全、快速、可靠的支付处理服务'}
          </p>

          {/* Login Options */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in">
            <Button 
              asChild 
              size="lg" 
              className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
            >
              <Link to="/xp7k9m2v-admin">
                <ShieldCheck className="h-5 w-5 mr-2" />
                {isEnglish ? 'Admin Login' : '管理员登录'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg font-semibold border-2 hover:-translate-y-0.5 transition-all"
            >
              <Link to="/merchant-login">
                <Store className="h-5 w-5 mr-2" />
                {isEnglish ? 'Merchant Login' : '商户登录'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto w-full animate-fade-in">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-center"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform mx-auto`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()} {settings.gatewayName || 'ELOPAY'}. {isEnglish ? 'All rights reserved.' : '保留所有权利。'}
      </footer>
    </div>
  );
};

export default Landing;
