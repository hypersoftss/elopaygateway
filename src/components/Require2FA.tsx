import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { Shield, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Require2FAProps {
  children: React.ReactNode;
}

export const Require2FA = ({ children }: Require2FAProps) => {
  const { user } = useAuthStore();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check2FA = async () => {
      if (!user?.merchantId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('is_2fa_enabled')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setIs2FAEnabled(!!data.is_2fa_enabled);
      } catch (error) {
        console.error('Error checking 2FA:', error);
        setIs2FAEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    check2FA();
  }, [user?.merchantId]);

  // Allow access to security page even without 2FA
  if (location.pathname === '/merchant/security') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Admin users don't need this check
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  // If 2FA is not enabled, show prompt
  if (!is2FAEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'zh' ? '需要启用双重认证' : 'Two-Factor Authentication Required'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'zh' 
                ? '为了保护您的账户安全，请先启用Google Authenticator双重认证后再继续使用。' 
                : 'For your account security, please enable Google Authenticator two-factor authentication before continuing.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    {language === 'zh' ? '安全提示' : 'Security Notice'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {language === 'zh' 
                      ? '双重认证可以有效防止未授权访问，保护您的资金安全。' 
                      : '2FA effectively prevents unauthorized access and protects your funds.'}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              className="w-full btn-gradient-primary" 
              size="lg"
              onClick={() => navigate('/merchant/security')}
            >
              <Shield className="h-4 w-4 mr-2" />
              {language === 'zh' ? '立即设置双重认证' : 'Setup 2FA Now'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
