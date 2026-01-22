import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Bell, Key, Eye, EyeOff, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  is_2fa_enabled: boolean;
  notify_new_transactions: boolean;
  notify_balance_changes: boolean;
  notify_status_updates: boolean;
  withdrawal_password: string | null;
}

const MerchantSecurity = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings>({
    is_2fa_enabled: false,
    notify_new_transactions: true,
    notify_balance_changes: true,
    notify_status_updates: true,
    withdrawal_password: null,
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
    showCurrent: false,
    showNew: false,
  });
  const [withdrawalPasswordForm, setWithdrawalPasswordForm] = useState({
    password: '',
    confirm: '',
    show: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('is_2fa_enabled, notify_new_transactions, notify_balance_changes, notify_status_updates, withdrawal_password')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (error) {
        console.error('Error fetching security settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.merchantId]);

  const handleToggle = async (field: keyof SecuritySettings, value: boolean) => {
    if (!user?.merchantId) return;
    
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ [field]: value })
        .eq('id', user.merchantId);

      if (error) throw error;

      setSettings({ ...settings, [field]: value });
      toast({
        title: t('common.success'),
        description: t('merchant.settingsUpdated'),
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('auth.passwordChanged'),
      });

      setPasswordForm({ current: '', new: '', confirm: '', showCurrent: false, showNew: false });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('errors.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetWithdrawalPassword = async () => {
    if (withdrawalPasswordForm.password !== withdrawalPasswordForm.confirm) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (withdrawalPasswordForm.password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    if (!user?.merchantId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ withdrawal_password: withdrawalPasswordForm.password })
        .eq('id', user.merchantId);

      if (error) throw error;

      setSettings({ ...settings, withdrawal_password: withdrawalPasswordForm.password });
      toast({
        title: t('common.success'),
        description: t('merchant.withdrawalPasswordSet'),
      });

      setWithdrawalPasswordForm({ password: '', confirm: '', show: false });
    } catch (error) {
      console.error('Error setting withdrawal password:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const securityScore = () => {
    let score = 0;
    if (settings.is_2fa_enabled) score += 30;
    if (settings.withdrawal_password) score += 30;
    if (settings.notify_new_transactions) score += 15;
    if (settings.notify_balance_changes) score += 15;
    if (settings.notify_status_updates) score += 10;
    return score;
  };

  const score = securityScore();
  const scoreColor = score >= 80 ? 'text-[hsl(var(--success))]' : score >= 50 ? 'text-[hsl(var(--warning))]' : 'text-destructive';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
            <Shield className="h-6 w-6 text-[hsl(var(--success))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('merchant.security')}</h1>
            <p className="text-sm text-muted-foreground">{t('merchant.securityDesc')}</p>
          </div>
        </div>

        {/* Security Score */}
        <Card className="overflow-hidden">
          <div className={`h-2 ${score >= 80 ? 'bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(142_76%_45%)]' : score >= 50 ? 'bg-gradient-to-r from-[hsl(var(--warning))] to-yellow-500' : 'bg-gradient-to-r from-destructive to-red-400'}`} />
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.securityScore')}</p>
                  <p className={`text-4xl font-bold ${scoreColor}`}>{score}%</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {score >= 80 ? t('merchant.scoreExcellent') : score >= 50 ? t('merchant.scoreGood') : t('merchant.scoreNeedsImprovement')}
                  </p>
                </div>
                <div className={`p-4 rounded-full ${score >= 80 ? 'bg-[hsl(var(--success))]/10' : score >= 50 ? 'bg-[hsl(var(--warning))]/10' : 'bg-destructive/10'}`}>
                  {score >= 80 ? (
                    <CheckCircle className={`h-8 w-8 ${scoreColor}`} />
                  ) : (
                    <AlertTriangle className={`h-8 w-8 ${scoreColor}`} />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 2FA Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('merchant.twoFactorAuth')}
              </CardTitle>
              <CardDescription>{t('merchant.twoFactorAuthDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${settings.is_2fa_enabled ? 'bg-[hsl(var(--success))]/10' : 'bg-muted'}`}>
                      <Shield className={`h-4 w-4 ${settings.is_2fa_enabled ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{t('merchant.enable2FA')}</p>
                      <p className="text-sm text-muted-foreground">{t('merchant.enable2FADesc')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.is_2fa_enabled}
                    onCheckedChange={(checked) => handleToggle('is_2fa_enabled', checked)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('merchant.notifications')}
              </CardTitle>
              <CardDescription>{t('merchant.notificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">{t('merchant.notifyNewTx')}</span>
                    <Switch
                      checked={settings.notify_new_transactions}
                      onCheckedChange={(checked) => handleToggle('notify_new_transactions', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">{t('merchant.notifyBalance')}</span>
                    <Switch
                      checked={settings.notify_balance_changes}
                      onCheckedChange={(checked) => handleToggle('notify_balance_changes', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">{t('merchant.notifyStatus')}</span>
                    <Switch
                      checked={settings.notify_status_updates}
                      onCheckedChange={(checked) => handleToggle('notify_status_updates', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('auth.changePassword')}
              </CardTitle>
              <CardDescription>{t('auth.changePasswordDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    type={passwordForm.showNew ? 'text' : 'password'}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setPasswordForm({ ...passwordForm, showNew: !passwordForm.showNew })}
                  >
                    {passwordForm.showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isSaving || !passwordForm.new || !passwordForm.confirm}
                className="w-full btn-gradient-success"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('auth.updatePassword')}
              </Button>
            </CardContent>
          </Card>

          {/* Withdrawal Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('merchant.withdrawalPassword')}
                {settings.withdrawal_password && (
                  <Badge className="bg-[hsl(var(--success))] text-white ml-2">{t('common.set')}</Badge>
                )}
              </CardTitle>
              <CardDescription>{t('merchant.withdrawalPasswordDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{settings.withdrawal_password ? t('merchant.newWithdrawalPassword') : t('merchant.setWithdrawalPassword')}</Label>
                <div className="relative">
                  <Input
                    type={withdrawalPasswordForm.show ? 'text' : 'password'}
                    value={withdrawalPasswordForm.password}
                    onChange={(e) => setWithdrawalPasswordForm({ ...withdrawalPasswordForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setWithdrawalPasswordForm({ ...withdrawalPasswordForm, show: !withdrawalPasswordForm.show })}
                  >
                    {withdrawalPasswordForm.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={withdrawalPasswordForm.confirm}
                  onChange={(e) => setWithdrawalPasswordForm({ ...withdrawalPasswordForm, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button
                onClick={handleSetWithdrawalPassword}
                disabled={isSaving || !withdrawalPasswordForm.password || !withdrawalPasswordForm.confirm}
                className="w-full btn-gradient-success"
              >
                <Save className="h-4 w-4 mr-2" />
                {settings.withdrawal_password ? t('merchant.updateWithdrawalPassword') : t('merchant.setWithdrawalPassword')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSecurity;
