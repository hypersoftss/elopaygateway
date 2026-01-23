import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Users, Globe, Sun, Moon, Shield, Lock, Zap, Server, ArrowRight, BarChart3, Settings, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Captcha } from '@/components/Captcha';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, initializeAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gatewayName: string;
  logoUrl: string | null;
}

const AdminLogin = () => {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, rememberMe, setRememberMe } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaValue, setCaptchaValue] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [settings, setSettings] = useState<GatewaySettings>({ gatewayName: '', logoUrl: null });
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-payment-link-merchant', {
          body: { get_gateway_settings: true }
        });
        if (!error && data?.gateway_settings) {
          setSettings({
            gatewayName: data.gateway_settings.gateway_name || 'PayGate',
            logoUrl: data.gateway_settings.logo_url
          });
        }
      } catch (err) {
        console.error('Failed to fetch gateway settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        toast({
          title: t('common.error'),
          description: language === 'zh' ? '此登录仅限管理员' : 'This login is for administrators only',
          variant: 'destructive',
        });
        supabase.auth.signOut();
      }
    }
  }, [user, isLoading, navigate, toast, t, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCaptchaValid) {
      toast({
        title: t('auth.loginFailed'),
        description: t('auth.invalidCaptcha'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t('auth.loginFailed'),
          description: t('auth.invalidCredentials'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('auth.loginFailed'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Left Side - Premium Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-600/20 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-full blur-3xl opacity-40" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Top - Logo & Branding */}
          <div>
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.gatewayName} 
                    className="relative h-16 w-16 object-contain rounded-2xl bg-white/10 backdrop-blur-xl p-2 border border-white/10" 
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
                  <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-white/10">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-tight">{settings.gatewayName}</h1>
                <p className="text-white/50 text-sm mt-1 font-medium">{language === 'zh' ? '管理控制中心' : 'Admin Control Center'}</p>
              </div>
            </div>
          </div>
          
          {/* Middle - Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                {language === 'zh' ? (
                  <>全方位<span className="text-primary">支付管理</span><br />一站式控制平台</>
                ) : (
                  <>Complete <span className="text-primary">Payment</span><br />Management Hub</>
                )}
              </h2>
              <p className="text-white/50 mt-4 text-lg max-w-md">
                {language === 'zh' 
                  ? '实时监控、智能分析、安全可靠的企业级支付解决方案'
                  : 'Real-time monitoring, intelligent analytics, and enterprise-grade security'}
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BarChart3, title: language === 'zh' ? '实时监控' : 'Live Analytics', desc: language === 'zh' ? '交易数据实时更新' : 'Real-time data updates' },
                { icon: Users, title: language === 'zh' ? '商户管理' : 'Merchants', desc: language === 'zh' ? '全面的商户控制' : 'Complete control' },
                { icon: Zap, title: language === 'zh' ? '即时结算' : 'Fast Settlement', desc: language === 'zh' ? '秒级资金处理' : 'Instant processing' },
                { icon: Settings, title: language === 'zh' ? '系统配置' : 'Configuration', desc: language === 'zh' ? '灵活的费率设置' : 'Flexible settings' },
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="group p-4 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                  <p className="text-white/40 text-xs mt-1">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Bottom - Stats */}
          <div className="flex items-center gap-8">
            {[
              { value: '99.99%', label: language === 'zh' ? '系统稳定性' : 'Uptime SLA' },
              { value: '< 50ms', label: language === 'zh' ? '响应速度' : 'Response Time' },
              { value: 'AES-256', label: language === 'zh' ? '数据加密' : 'Encryption' },
            ].map((stat, i) => (
              <div key={i} className="relative">
                <p className="text-2xl xl:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                {i < 2 && <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 h-8 w-px bg-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName} className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="font-bold text-foreground">{settings.gatewayName}</span>
              <p className="text-xs text-muted-foreground">{language === 'zh' ? '管理员' : 'Admin'}</p>
            </div>
          </div>
          <div className="hidden lg:block" />
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage}
              className="h-9 px-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm">{language === 'zh' ? 'EN' : '中文'}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-8 lg:px-16">
          <div className="w-full max-w-[400px]">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4">
                  <Fingerprint className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">
                {language === 'zh' ? '管理员登录' : 'Admin Login'}
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {language === 'zh' ? '安全登录到管理控制台' : 'Secure access to admin console'}
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 sm:p-8 shadow-xl shadow-black/5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    {t('auth.email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('auth.captcha')}</Label>
                  <Captcha
                    value={captchaValue}
                    onChange={setCaptchaValue}
                    onVerify={setIsCaptchaValid}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm cursor-pointer text-muted-foreground">
                      {t('auth.rememberMe')}
                    </Label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 mt-2" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('auth.login')}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </div>

            {/* Switch to Merchant */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <p className="text-sm text-muted-foreground text-center mb-3">
                {language === 'zh' ? '不是管理员？' : 'Not an admin?'}
              </p>
              <Button asChild variant="outline" className="w-full h-11 bg-background/50 hover:bg-background border-border/50">
                <Link to="/merchant-login">
                  <Users className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '商户登录入口' : 'Merchant Login'}
                </Link>
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>{language === 'zh' ? 'AES-256 加密保护' : 'AES-256 Encrypted'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 {settings.gatewayName}. {language === 'zh' ? '保留所有权利' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;