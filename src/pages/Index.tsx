import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Store, ArrowRight, Zap, Globe, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';

const Index = () => {
  const { language } = useTranslation();
  const isEnglish = language === 'en';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">PayGate</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {isEnglish ? 'Professional Payment Gateway' : '专业支付网关解决方案'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {isEnglish ? 'Secure, fast, and reliable payment processing' : '安全、快速、可靠的支付处理服务'}
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/setup-admin">
              <Button size="lg" className="gap-2">
                {isEnglish ? 'Setup Admin' : '初始化管理员'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link to="/admin-login" className="block">
            <Card className="h-full border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {isEnglish ? 'Admin Portal' : '管理员入口'}
                </h3>
                <p className="text-muted-foreground">
                  {isEnglish ? 'Manage merchants and settings' : '管理商户和系统设置'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/merchant-login" className="block">
            <Card className="h-full border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {isEnglish ? 'Merchant Portal' : '商户入口'}
                </h3>
                <p className="text-muted-foreground">
                  {isEnglish ? 'View transactions and withdrawals' : '查看交易和提现'}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} PayGate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
