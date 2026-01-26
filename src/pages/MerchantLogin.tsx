import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Store, Smartphone, Shield, Lock, ArrowRight, Globe, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Captcha } from '@/components/Captcha';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, initializeAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as OTPAuth from 'otpauth';

interface GatewaySettings {
  gatewayName: string;
  logoUrl: string | null;
}

const MerchantLogin = () => {
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

  // 2FA State
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingSession, setPendingSession] = useState<{ userId: string; merchantId: string; secret: string } | null>(null);

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
            gatewayName: data.gateway_settings.gateway_name || 'ELOPAY',
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
    if (!isLoading && user && !show2FAStep) {
      if (user.role === 'merchant') {
        navigate('/merchant');
      } else {
        toast({
          title: t('common.error'),
          description: language === 'zh' ? '此登录仅限商户' : 'This login is for merchants only',
          variant: 'destructive',
        });
        supabase.auth.signOut();
      }
    }
  }, [user, isLoading, navigate, toast, t, language, show2FAStep]);

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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t('auth.loginFailed'),
          description: t('auth.invalidCredentials'),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select('id, is_2fa_enabled, google_2fa_secret')
          .eq('user_id', authData.user.id)
          .limit(1);

        const merchant = merchants?.[0];
        
        if (merchant?.is_2fa_enabled && merchant?.google_2fa_secret) {
          await supabase.auth.signOut();
          setPendingSession({
            userId: authData.user.id,
            merchantId: merchant.id,
            secret: merchant.google_2fa_secret,
          });
          setShow2FAStep(true);
          setIsSubmitting(false);
          return;
        }
        
        // Log merchant login (without 2FA)
        if (merchant?.id) {
          try {
            await supabase.from('merchant_activity_logs').insert({
              merchant_id: merchant.id,
              admin_user_id: null,
              action_type: 'login',
              action_details: { timestamp: new Date().toISOString(), with_2fa: false },
            });
          } catch (logErr) {
            console.error('Failed to log login:', logErr);
          }
        }
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

  const handle2FAVerify = async () => {
    if (!pendingSession || twoFACode.length !== 6) return;

    setIsSubmitting(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: settings.gatewayName || 'ELOPAY',
        label: email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(pendingSession.secret),
      });

      const isValid = totp.validate({ token: twoFACode, window: 1 }) !== null;

      if (!isValid) {
        toast({
          title: language === 'zh' ? '验证失败' : 'Verification Failed',
          description: language === 'zh' ? '验证码不正确' : 'Invalid authentication code',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

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
      } else {
        // Log merchant login
        try {
          await supabase.from('merchant_activity_logs').insert({
            merchant_id: pendingSession.merchantId,
            admin_user_id: null,
            action_type: 'login',
            action_details: { timestamp: new Date().toISOString(), with_2fa: true },
          });
        } catch (logErr) {
          console.error('Failed to log login:', logErr);
        }
        
        setShow2FAStep(false);
        setPendingSession(null);
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

  const handleBack = () => {
    setShow2FAStep(false);
    setPendingSession(null);
    setTwoFACode('');
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
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 overflow-hidden">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white/10 blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName || 'Logo'} className="h-14 w-14 object-contain rounded-xl bg-white/10 p-1.5" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Store className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold">{settings.gatewayName || 'ELOPAY'}</h1>
              <p className="text-white/70 text-sm">{language === 'zh' ? '商户支付平台' : 'Merchant Platform'}</p>
            </div>
          </div>
          
          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-xl xl:text-2xl font-semibold mb-6">
              {language === 'zh' ? '安全 • 快速 • 可靠' : 'Secure • Fast • Reliable'}
            </h2>
            
            {[
              { zh: '实时交易监控', en: 'Real-time monitoring' },
              { zh: '多种支付渠道', en: 'Multiple channels' },
              { zh: '企业级安全', en: 'Enterprise security' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90 text-sm xl:text-base">
                <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>{language === 'zh' ? feature.zh : feature.en}</span>
              </div>
            ))}
          </div>
          
          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '99.9%', label: language === 'zh' ? '稳定' : 'Uptime' },
              { value: '50ms', label: language === 'zh' ? '响应' : 'Speed' },
              { value: '256-bit', label: language === 'zh' ? '加密' : 'SSL' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-xl xl:text-2xl font-bold">{stat.value}</p>
                <p className="text-xs xl:text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-3 sm:p-4">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName || 'Logo'} className="h-9 w-9 object-contain rounded-lg" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-foreground">{settings.gatewayName || 'ELOPAY'}</span>
          </div>
          <div className="hidden lg:block" />
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage}
              className="h-9 px-2 sm:px-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{language === 'zh' ? 'EN' : '中文'}</span>
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
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 mb-3 sm:mb-4">
                {show2FAStep ? (
                  <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                ) : (
                  <Lock className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {show2FAStep
                  ? (language === 'zh' ? '双重认证' : 'Two-Factor Auth')
                  : (language === 'zh' ? '商户登录' : 'Merchant Login')}
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 sm:mt-2">
                {show2FAStep
                  ? (language === 'zh' ? '请输入验证码' : 'Enter authenticator code')
                  : (language === 'zh' ? '欢迎回来' : 'Welcome back')}
              </p>
            </div>

            {/* Form */}
            {show2FAStep ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {language === 'zh' ? '6位验证码' : '6-digit code'}
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="h-12 sm:h-14 text-center text-xl sm:text-2xl tracking-[0.4em] sm:tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handle2FAVerify}
                  className="w-full h-11 sm:h-12 font-semibold"
                  disabled={isSubmitting || twoFACode.length !== 6}
                >
                  {isSubmitting ? t('common.loading') : (language === 'zh' ? '验证' : 'Verify')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={handleBack}
                >
                  {language === 'zh' ? '返回' : 'Back'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="h-11 sm:h-12"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 sm:h-12 pr-12"
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

                <div className="space-y-1.5 sm:space-y-2">
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
                  className="w-full h-11 sm:h-12 font-semibold mt-2" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.loading') : t('auth.login')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {/* Security Notice */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>{language === 'zh' ? '256位SSL加密保护' : '256-bit SSL protected'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 {settings.gatewayName || 'PayGate'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantLogin;