import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Users, Globe, Sun, Moon, Shield, Lock, Zap, Server } from 'lucide-react';
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
    
    // Fetch gateway settings via edge function
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
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Side - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white/10 blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute top-1/2 left-10 w-24 h-24 rounded-full bg-blue-400/20 blur-xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName} className="h-16 w-16 object-contain rounded-2xl bg-white/10 p-2 backdrop-blur-sm" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl xl:text-4xl font-bold">{settings.gatewayName}</h1>
              <p className="text-white/70 text-sm mt-1">{language === 'zh' ? '管理控制台' : 'Admin Console'}</p>
            </div>
          </div>
          
          {/* Features */}
          <div className="space-y-5">
            <h2 className="text-2xl xl:text-3xl font-semibold mb-8">
              {language === 'zh' ? '全面掌控您的支付系统' : 'Complete Payment Control'}
            </h2>
            
            {[
              { icon: Server, zh: '实时交易监控与分析', en: 'Real-time transaction monitoring' },
              { icon: Users, zh: '商户管理与费率配置', en: 'Merchant management & rates' },
              { icon: Zap, zh: '即时结算与提款', en: 'Instant settlements & withdrawals' },
              { icon: Shield, zh: '多层安全防护体系', en: 'Multi-layer security system' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-white/90">
                <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-base xl:text-lg">{language === 'zh' ? feature.zh : feature.en}</span>
              </div>
            ))}
          </div>
          
          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-8">
            {[
              { value: '99.99%', label: language === 'zh' ? '系统稳定' : 'Uptime' },
              { value: '24/7', label: language === 'zh' ? '全天监控' : 'Monitor' },
              { value: 'AES-256', label: language === 'zh' ? '数据加密' : 'Encryption' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl xl:text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName} className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
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
        <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-12">
          <div className="w-full max-w-sm sm:max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600/10 mb-4">
                <Lock className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {language === 'zh' ? '管理员登录' : 'Admin Login'}
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {language === 'zh' ? '使用管理员账户登录系统' : 'Sign in with your admin account'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-12"
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
                    className="h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
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

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="rememberMe" className="text-sm cursor-pointer text-muted-foreground">
                  {t('auth.rememberMe')}
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-2" 
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.loading') : t('auth.login')}
              </Button>
            </form>

            {/* Switch to Merchant */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center mb-3">
                {language === 'zh' ? '不是管理员？' : 'Not an admin?'}
              </p>
              <Button asChild variant="outline" className="w-full h-11">
                <Link to="/merchant-login">
                  <Users className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '商户登录' : 'Merchant Login'}
                </Link>
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span>{language === 'zh' ? 'AES-256加密保护' : 'AES-256 encrypted'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 {settings.gatewayName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;