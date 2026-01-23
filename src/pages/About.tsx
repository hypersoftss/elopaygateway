import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft,
  Zap, 
  Globe, 
  Lock, 
  Users,
  Target,
  Award,
  CheckCircle2,
  Building2,
  Headphones
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';

const About = () => {
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();
  const isEnglish = language === 'en';

  const values = [
    {
      icon: <Lock className="h-6 w-6" />,
      title: isEnglish ? 'Security First' : '安全第一',
      description: isEnglish 
        ? 'Bank-grade encryption and multi-layer security protocols protect every transaction.'
        : '银行级加密和多层安全协议保护每一笔交易。',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: isEnglish ? 'Lightning Fast' : '极速处理',
      description: isEnglish 
        ? 'Process thousands of transactions per second with sub-second settlement times.'
        : '每秒处理数千笔交易，亚秒级结算时间。',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: isEnglish ? 'Global Reach' : '全球覆盖',
      description: isEnglish 
        ? 'Support for multiple payment channels and currencies across different regions.'
        : '支持多种支付渠道和货币，覆盖不同地区。',
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: isEnglish ? '24/7 Support' : '全天候支持',
      description: isEnglish 
        ? 'Dedicated support team available around the clock to assist with any issues.'
        : '专业支持团队全天候待命，解决任何问题。',
    },
  ];

  const stats = [
    { value: '1M+', label: isEnglish ? 'Transactions' : '交易量' },
    { value: '500+', label: isEnglish ? 'Merchants' : '商户数' },
    { value: '99.9%', label: isEnglish ? 'Uptime' : '正常运行' },
    { value: '24/7', label: isEnglish ? 'Support' : '技术支持' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            {isEnglish ? 'About ' : '关于 '}
            <span className="text-primary">{settings.gatewayName}</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {isEnglish 
              ? 'We are a leading payment gateway provider, dedicated to delivering secure, fast, and reliable payment solutions for businesses of all sizes.'
              : '我们是领先的支付网关提供商，致力于为各类规模的企业提供安全、快速、可靠的支付解决方案。'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 md:p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  {isEnglish ? 'Our Mission' : '我们的使命'}
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {isEnglish 
                  ? 'To empower businesses with cutting-edge payment technology that simplifies transactions, enhances security, and accelerates growth. We believe that seamless payments should be accessible to everyone, from startups to enterprises.'
                  : '为企业提供前沿的支付技术，简化交易流程、增强安全性并加速增长。我们相信，无缝支付应该惠及每一个人，从初创企业到大型企业。'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            {isEnglish ? 'Our Core Values' : '我们的核心价值'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isEnglish 
              ? 'These principles guide everything we do and how we serve our merchants.'
              : '这些原则指导着我们的一切工作，以及我们如何服务商户。'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {values.map((value, index) => (
            <Card key={index} className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {isEnglish ? 'Why Merchants Choose Us' : '商户选择我们的原因'}
            </h2>
          </div>

          <div className="grid gap-4">
            {[
              isEnglish ? 'Competitive transaction fees with transparent pricing' : '具有竞争力的交易费率，价格透明',
              isEnglish ? 'Real-time settlement and instant notifications' : '实时结算和即时通知',
              isEnglish ? 'Comprehensive API documentation for easy integration' : '完善的API文档，便于集成',
              isEnglish ? 'Advanced fraud detection and prevention' : '先进的欺诈检测和预防机制',
              isEnglish ? 'Multi-currency and multi-channel support' : '多币种和多渠道支持',
              isEnglish ? 'Dedicated account manager for each merchant' : '每位商户配备专属客户经理',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isEnglish ? 'Ready to Get Started?' : '准备开始了吗？'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isEnglish 
                ? 'Join hundreds of merchants who trust us with their payments.'
                : '加入数百家信任我们处理支付的商户行列。'}
            </p>
            <Button asChild size="lg" className="h-12 px-8">
              <Link to="/merchant-login">
                {isEnglish ? 'Login to Merchant Portal' : '登录商户后台'}
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

export default About;
