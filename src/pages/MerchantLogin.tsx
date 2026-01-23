import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Store, Smartphone, Shield, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Captcha } from '@/components/Captcha';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, initializeAuth } from '@/lib/auth';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as OTPAuth from 'otpauth';

const MerchantLogin = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, rememberMe, setRememberMe } = useAuthStore();
  const { settings } = useGatewaySettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaValue, setCaptchaValue] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA State
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingSession, setPendingSession] = useState<{ userId: string; merchantId: string; secret: string } | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

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
        issuer: settings.gatewayName || 'PayGate',
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-pulse text-slate-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <span className="font-bold text-lg text-white">{settings.gatewayName}</span>
            <p className="text-xs text-slate-400">
              {language === 'zh' ? '商户入口' : 'Merchant Portal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Top Gradient Line */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
            
            {/* Header */}
            <div className="text-center pt-8 pb-4 px-6">
              <div className="mx-auto mb-4 relative inline-block">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  {show2FAStep ? (
                    <Smartphone className="h-8 w-8 text-white" />
                  ) : (
                    <Store className="h-8 w-8 text-white" />
                  )}
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">
                {show2FAStep
                  ? (language === 'zh' ? '双重认证' : 'Two-Factor Auth')
                  : (language === 'zh' ? '商户登录' : 'Merchant Login')}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {show2FAStep
                  ? (language === 'zh' ? '请输入验证码' : 'Enter verification code')
                  : (language === 'zh' ? '登录您的商户账户' : 'Sign in to your account')}
              </p>
            </div>

            {/* Form Content */}
            <div className="px-6 pb-8">
              {show2FAStep ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">
                      {language === 'zh' ? '验证码' : 'Code'}
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-14 text-center text-2xl tracking-[0.4em] font-mono bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={handle2FAVerify}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
                    disabled={isSubmitting || twoFACode.length !== 6}
                  >
                    {isSubmitting ? t('common.loading') : (language === 'zh' ? '验证' : 'Verify')}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white"
                    onClick={handleBack}
                  >
                    {language === 'zh' ? '返回' : 'Back'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">{t('auth.email')}</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      className="h-12 bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-12 bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">{t('auth.captcha')}</Label>
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
                      className="border-slate-600 data-[state=checked]:bg-emerald-500"
                    />
                    <Label htmlFor="rememberMe" className="text-sm cursor-pointer text-slate-400">
                      {t('auth.rememberMe')}
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20" 
                    disabled={isSubmitting}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {isSubmitting ? t('common.loading') : t('auth.login')}
                  </Button>
                </form>
              )}

              {/* Security Badge */}
              <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{language === 'zh' ? '安全加密' : 'Secure & Encrypted'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-xs text-slate-500">
            {language === 'zh' ? '由' : 'Powered by'} {settings.gatewayName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantLogin;