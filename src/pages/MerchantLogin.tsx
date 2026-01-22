import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Store, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

      // Check if user is a merchant and has 2FA enabled
      if (authData.user) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select('id, is_2fa_enabled, google_2fa_secret')
          .eq('user_id', authData.user.id)
          .limit(1);

        const merchant = merchants?.[0];
        
        if (merchant?.is_2fa_enabled && merchant?.google_2fa_secret) {
          // Sign out temporarily and require 2FA
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
      // Verify the 2FA code
      const totp = new OTPAuth.TOTP({
        issuer: 'PayGate',
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

      // Code is valid, sign in again
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
        // Successfully logged in
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[hsl(var(--success)/0.05)] via-background to-[hsl(var(--success)/0.1)]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--success))] to-[hsl(var(--success)/0.7)] flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <span className="font-bold text-xl">{settings.gatewayName}</span>
            <p className="text-xs text-muted-foreground">
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="login-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--success))] to-[hsl(var(--success)/0.7)] flex items-center justify-center">
                {show2FAStep ? (
                  <Smartphone className="h-8 w-8 text-white" />
                ) : (
                  <Store className="h-8 w-8 text-white" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold">
                {show2FAStep
                  ? (language === 'zh' ? '双重认证' : 'Two-Factor Authentication')
                  : (language === 'zh' ? '商户登录' : 'Merchant Login')}
              </CardTitle>
              <CardDescription>
                {show2FAStep
                  ? (language === 'zh' ? '请输入Google Authenticator中的验证码' : 'Enter the code from your Google Authenticator app')
                  : (language === 'zh' ? '使用商户账户登录系统' : 'Sign in with your merchant account')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {show2FAStep ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="2fa-code">{language === 'zh' ? '验证码' : 'Authentication Code'}</Label>
                    <Input
                      id="2fa-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-14 text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {language === 'zh' ? '打开Google Authenticator应用获取6位验证码' : 'Open your Google Authenticator app to get the 6-digit code'}
                    </p>
                  </div>

                  <Button
                    onClick={handle2FAVerify}
                    className="w-full h-11 btn-gradient-success font-medium"
                    disabled={isSubmitting || twoFACode.length !== 6}
                  >
                    {isSubmitting ? t('common.loading') : (language === 'zh' ? '验证并登录' : 'Verify & Login')}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleBack}
                  >
                    {language === 'zh' ? '返回登录' : 'Back to Login'}
                  </Button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="merchant@example.com"
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t('auth.password')}</Label>
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
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('auth.captcha')}</Label>
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
                      <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
                        {t('auth.rememberMe')}
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 btn-gradient-success font-medium" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('common.loading') : t('auth.login')}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'zh' ? '是管理员？' : 'Are you an admin?'}
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/admin-login">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '管理员登录' : 'Admin Login'}
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MerchantLogin;
