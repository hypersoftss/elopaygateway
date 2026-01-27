import { Link } from 'react-router-dom';
import { ShieldCheck, Store, ArrowRight, Zap, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const Landing = () => {
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: language === 'zh' ? '快速支付' : 'Fast Payments',
      description: language === 'zh' ? '即时处理代收代付交易' : 'Instant payin & payout processing',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: language === 'zh' ? '全球覆盖' : 'Global Coverage',
      description: language === 'zh' ? '支持多种支付渠道' : 'Multiple payment channels supported',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: language === 'zh' ? '安全可靠' : 'Secure & Reliable',
      description: language === 'zh' ? '企业级安全保障' : 'Enterprise-grade security',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="font-bold text-xl">{settings.gatewayName || 'ELOPAY'}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {language === 'zh' ? (
              <>
                <span className="gradient-text">ELOPAY</span>
                <br />
                支付网关解决方案
              </>
            ) : (
              <>
                <span className="gradient-text">ELOPAY</span>
                <br />
                Payment Gateway Solution
              </>
            )}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === 'zh'
              ? '为您的业务提供安全、快速、可靠的支付处理服务'
              : 'Secure, fast, and reliable payment processing for your business'}
          </p>

          {/* Login Options */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="h-14 px-8 btn-gradient-primary text-lg font-medium">
              <Link to="/xp7k9m2v-admin">
                <ShieldCheck className="h-5 w-5 mr-2" />
                {language === 'zh' ? '管理员登录' : 'Admin Login'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-medium border-2">
              <Link to="/merchant-login">
                <Store className="h-5 w-5 mr-2" />
                {language === 'zh' ? '商户登录' : 'Merchant Login'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto w-full">
          {features.map((feature, index) => (
            <Card key={index} className="stat-card text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} ELOPAY. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
