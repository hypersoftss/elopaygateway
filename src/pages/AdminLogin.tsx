import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';
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

const AdminLogin = () => {
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

  useEffect(() => {
    initializeAuth();
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-xl">{settings.gatewayName}</span>
            <p className="text-xs text-muted-foreground">
              {language === 'zh' ? '管理员入口' : 'Admin Portal'}
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
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {language === 'zh' ? '管理员登录' : 'Admin Login'}
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '使用管理员账户登录系统' : 'Sign in with your admin account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
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
                  className="w-full h-11 btn-gradient-primary font-medium" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.loading') : t('auth.login')}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {language === 'zh' ? '不是管理员？' : 'Not an admin?'}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/merchant-login">
                    <Users className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '商户登录' : 'Merchant Login'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
