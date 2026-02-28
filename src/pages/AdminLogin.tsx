import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Users, Globe, Sun, Moon, Shield, ArrowRight, BarChart3, Wallet, Activity, Smartphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Captcha } from '@/components/Captcha';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, initializeAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getLoginErrorMessage } from '@/lib/loginErrors';
import * as OTPAuth from 'otpauth';

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

  // 2FA State
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingSession, setPendingSession] = useState<{ userId: string; secret: string } | null>(null);

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
    // Only redirect if:
    // 1. Not loading
    // 2. User exists
    // 3. Not in 2FA step
    // 4. Not currently submitting (prevents race condition during 2FA check)
    // 5. No pending 2FA session
    if (!isLoading && user && !show2FAStep && !isSubmitting && !pendingSession) {
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
  }, [user, isLoading, navigate, toast, t, language, show2FAStep, isSubmitting, pendingSession]);

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
          description: getLoginErrorMessage(error, language, t('auth.invalidCredentials')),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        // Check if admin has 2FA enabled
        const { data: adminProfiles } = await supabase
          .from('admin_profiles')
          .select('is_2fa_enabled, google_2fa_secret')
          .eq('user_id', authData.user.id)
          .limit(1);

        const adminProfile = adminProfiles?.[0];
        
        if (adminProfile?.is_2fa_enabled && adminProfile?.google_2fa_secret) {
          await supabase.auth.signOut();
          setPendingSession({
            userId: authData.user.id,
            secret: adminProfile.google_2fa_secret,
          });
          setShow2FAStep(true);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      const errorMessage = getLoginErrorMessage(error as { message?: string } | null, language, t('auth.invalidCredentials'));
      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
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

      // Reset 2FA step BEFORE re-login so the redirect works
      setShow2FAStep(false);
      setPendingSession(null);
      setTwoFACode('');

      // Re-login after successful 2FA
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t('auth.loginFailed'),
          description: getLoginErrorMessage(error, language, t('auth.invalidCredentials')),
          variant: 'destructive',
        });
        // Restore 2FA step on error
        setShow2FAStep(true);
      }
    } catch (error) {
      const errorMessage = getLoginErrorMessage(error as { message?: string } | null, language, t('auth.invalidCredentials'));
      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setShow2FAStep(false);
    setTwoFACode('');
    setPendingSession(null);
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // 2FA Verification Step
  if (show2FAStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">
              {language === 'zh' ? '双重认证' : 'Two-Factor Authentication'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {language === 'zh' 
                ? '请输入Google Authenticator中的6位验证码' 
                : 'Enter the 6-digit code from Google Authenticator'}
            </p>
          </div>

          {/* Code Input */}
          <div className="space-y-4">
            <Input
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-3xl font-mono tracking-[0.5em] h-14"
              maxLength={6}
              autoFocus
            />

            <Button 
              onClick={handle2FAVerify}
              disabled={twoFACode.length !== 6 || isSubmitting}
              className="w-full h-12"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {language === 'zh' ? '验证中...' : 'Verifying...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {language === 'zh' ? '验证并登录' : 'Verify & Login'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'zh' ? '返回登录' : 'Back to Login'}
            </Button>
          </div>

          {/* Troubleshooting Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {language === 'zh' ? '验证码无效？' : 'Code not working?'}
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>
                  {language === 'zh' 
                    ? '检查手机时间是否同步 - 打开设置 > 日期与时间 > 自动设置时间' 
                    : 'Check phone time sync - Go to Settings > Date & Time > Enable automatic time'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>
                  {language === 'zh' 
                    ? '在Google Authenticator中点击右上角菜单 > 时间校正 > 立即同步' 
                    : 'In Google Authenticator, tap menu > Time correction > Sync now'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>
                  {language === 'zh' 
                    ? '确保输入时验证码未过期（30秒有效期）' 
                    : 'Make sure the code hasn\'t expired (30 second validity)'}
                </span>
              </li>
            </ul>
          </div>

          {/* Security Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-primary" />
              <span>{language === 'zh' ? '安全验证' : 'Secure Verification'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-slate-900 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Accent Gradient */}
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full h-full">
          {/* Header */}
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.gatewayName} 
                className="h-12 w-12 object-contain rounded-xl bg-white/10 p-1.5" 
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{settings.gatewayName}</h1>
              <p className="text-xs text-white/50">{language === 'zh' ? '管理控制台' : 'Admin Console'}</p>
            </div>
          </div>
          
          {/* Center Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                {language === 'zh' ? (
                  <>全方位<br/><span className="text-primary">支付管理平台</span></>
                ) : (
                  <>Complete<br/><span className="text-primary">Payment Control</span></>
                )}
              </h2>
              <p className="text-white/50 mt-4 text-sm xl:text-base max-w-sm">
                {language === 'zh' 
                  ? '实时监控交易、管理商户、配置费率，一站式解决方案'
                  : 'Monitor transactions, manage merchants, and configure rates in real-time'}
              </p>
            </div>
            
            {/* Feature List */}
            <div className="space-y-3">
              {[
                { icon: BarChart3, text: language === 'zh' ? '实时数据分析' : 'Real-time Analytics' },
                { icon: Users, text: language === 'zh' ? '商户管理系统' : 'Merchant Management' },
                { icon: Wallet, text: language === 'zh' ? '资金结算处理' : 'Fund Settlement' },
                { icon: Activity, text: language === 'zh' ? '交易状态监控' : 'Transaction Monitoring' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-white/70 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer Stats */}
          <div className="flex items-center gap-6">
            {[
              { value: '99.9%', label: language === 'zh' ? '稳定性' : 'Uptime' },
              { value: '24/7', label: language === 'zh' ? '监控' : 'Support' },
              { value: 'AES-256', label: language === 'zh' ? '加密' : 'Security' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-lg xl:text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.gatewayName} className="h-9 w-9 object-contain rounded-lg" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
            )}
            <span className="font-semibold text-foreground text-sm">{settings.gatewayName}</span>
          </div>
          <div className="hidden lg:block" />
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage}
              className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground text-xs"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === 'zh' ? 'EN' : '中文'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {language === 'zh' ? '管理员登录' : 'Admin Login'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {language === 'zh' ? '登录管理控制台' : 'Sign in to admin console'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">{t('auth.captcha')}</Label>
                <Captcha
                  value={captchaValue}
                  onChange={setCaptchaValue}
                  onVerify={setIsCaptchaValid}
                />
              </div>

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

              <Button 
                type="submit" 
                className="w-full h-11 font-medium" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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

            {/* Security Badge */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-primary" />
                <span>{language === 'zh' ? 'AES-256 加密' : 'AES-256 Encrypted'}</span>
              </div>
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