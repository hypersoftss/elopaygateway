import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Key, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MerchantSecurity = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasWithdrawalPassword, setHasWithdrawalPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    password: '',
    confirm: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('withdrawal_password')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setHasWithdrawalPassword(!!data.withdrawal_password);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.merchantId]);

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;

      toast({ title: 'Success', description: 'Password updated successfully' });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetWithdrawalPassword = async () => {
    if (withdrawalForm.password !== withdrawalForm.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (withdrawalForm.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (!user?.merchantId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ withdrawal_password: withdrawalForm.password })
        .eq('id', user.merchantId);

      if (error) throw error;

      setHasWithdrawalPassword(true);
      toast({ title: 'Success', description: 'Withdrawal password set successfully' });
      setWithdrawalForm({ password: '', confirm: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account passwords and security</p>
        </div>

        {/* Password Cards - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login Password */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Login Password</h3>
                  <p className="text-sm text-muted-foreground">Change your account login password</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Current Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isSaving || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
                    className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                  >
                    Update Password
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal Password */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[hsl(var(--warning))]/10 to-transparent p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/20">
                  <Key className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <h3 className="font-semibold">Withdrawal Password</h3>
                  <p className="text-sm text-muted-foreground">Set a separate password for withdrawals</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Withdrawal Password</Label>
                    <Input
                      type="password"
                      value={withdrawalForm.password}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Confirm Password</Label>
                    <Input
                      type="password"
                      value={withdrawalForm.confirm}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, confirm: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <Button
                    onClick={handleSetWithdrawalPassword}
                    disabled={isSaving || !withdrawalForm.password || !withdrawalForm.confirm}
                    variant="outline"
                    className="w-full"
                  >
                    Set Withdrawal Password
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Tips */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Security Tips</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>Use a strong, unique password</li>
                  <li>Enable 2FA for additional security</li>
                  <li>Never share your passwords with anyone</li>
                  <li>Change passwords regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSecurity;
