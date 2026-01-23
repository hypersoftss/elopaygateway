import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Lock, Key, AlertCircle, Shield, Smartphone, Check, X, QrCode, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const MerchantSecurity = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasWithdrawalPassword, setHasWithdrawalPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [gatewayName, setGatewayName] = useState('PayGate');
  const [telegramChatId, setTelegramChatId] = useState('');

  // 2FA State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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
        // Fetch merchant data
        const { data, error } = await supabase
          .from('merchants')
          .select('withdrawal_password, is_2fa_enabled, google_2fa_secret, merchant_name, telegram_chat_id')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setHasWithdrawalPassword(!!data.withdrawal_password);
        setIs2FAEnabled(!!data.is_2fa_enabled);
        setMerchantName(data.merchant_name || 'Merchant');
        setTelegramChatId(data.telegram_chat_id || '');

        // Fetch gateway name from admin_settings
        const { data: settingsData } = await supabase
          .from('admin_settings')
          .select('gateway_name')
          .limit(1);
        
        if (settingsData && settingsData.length > 0) {
          setGatewayName(settingsData[0].gateway_name || 'PayGate');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.merchantId]);

  const generateTOTPSecret = () => {
    // Generate a random secret
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: gatewayName,
      label: merchantName,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });
    
    setTotpSecret(secret.base32);
    setTotpUri(totp.toString());
    setShow2FASetup(true);
  };

  const verifyAndEnable2FA = async () => {
    if (!user?.merchantId || verificationCode.length !== 6) return;

    setIsVerifying(true);
    try {
      // Verify the code
      const totp = new OTPAuth.TOTP({
        issuer: gatewayName,
        label: merchantName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret),
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

      if (!isValid) {
        toast({
          title: language === 'zh' ? '验证失败' : 'Verification Failed',
          description: language === 'zh' ? '验证码不正确，请重试' : 'Invalid code, please try again',
          variant: 'destructive',
        });
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('merchants')
        .update({
          google_2fa_secret: totpSecret,
          is_2fa_enabled: true,
        })
        .eq('id', user.merchantId);

      if (error) throw error;

      setIs2FAEnabled(true);
      setShow2FASetup(false);
      setVerificationCode('');
      toast({
        title: language === 'zh' ? '2FA已启用' : '2FA Enabled',
        description: language === 'zh' ? '双重认证已成功启用' : 'Two-factor authentication is now active',
      });
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!user?.merchantId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          google_2fa_secret: null,
          is_2fa_enabled: false,
        })
        .eq('id', user.merchantId);

      if (error) throw error;

      setIs2FAEnabled(false);
      toast({
        title: language === 'zh' ? '2FA已禁用' : '2FA Disabled',
        description: language === 'zh' ? '双重认证已关闭' : 'Two-factor authentication has been disabled',
      });
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Error', description: language === 'zh' ? '密码不匹配' : 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({ title: 'Error', description: language === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;

      toast({ title: t('common.success'), description: language === 'zh' ? '密码已更新' : 'Password updated successfully' });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetWithdrawalPassword = async () => {
    if (withdrawalForm.password !== withdrawalForm.confirm) {
      toast({ title: 'Error', description: language === 'zh' ? '密码不匹配' : 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (withdrawalForm.password.length < 6) {
      toast({ title: 'Error', description: language === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters', variant: 'destructive' });
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
      toast({ title: t('common.success'), description: language === 'zh' ? '提现密码已设置' : 'Withdrawal password set successfully' });
      setWithdrawalForm({ password: '', confirm: '' });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
    setIsSaving(false);
    }
  };

  const handleSaveTelegramId = async () => {
    if (!user?.merchantId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ telegram_chat_id: telegramChatId || null })
        .eq('id', user.merchantId);

      if (error) throw error;

      toast({ 
        title: t('common.success'), 
        description: language === 'zh' ? 'Telegram ID 已保存' : 'Telegram ID saved successfully' 
      });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('security.title')}</h1>
            <p className="text-muted-foreground">
              {language === 'zh' ? '管理您的账户密码和安全设置' : 'Manage your account passwords and security settings'}
            </p>
          </div>
        </div>

        {/* 2FA Card */}
        <Card className="border-2 border-primary/20 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {language === 'zh' ? 'Google双重认证 (2FA)' : 'Google Two-Factor Authentication'}
                    {is2FAEnabled ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        <Check className="h-3 w-3 mr-1" />
                        {language === 'zh' ? '已启用' : 'Enabled'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="h-3 w-3 mr-1" />
                        {language === 'zh' ? '未启用' : 'Disabled'}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {language === 'zh' 
                      ? '使用Google Authenticator添加额外的安全层' 
                      : 'Add an extra layer of security using Google Authenticator'}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : is2FAEnabled ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'zh' ? '2FA已激活' : '2FA is Active'}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '您的账户受到双重认证保护' : 'Your account is protected with 2FA'}
                    </p>
                  </div>
                </div>
                <Button variant="destructive" onClick={disable2FA} disabled={isSaving}>
                  {language === 'zh' ? '禁用2FA' : 'Disable 2FA'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <QrCode className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'zh' ? '启用2FA保护' : 'Enable 2FA Protection'}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '扫描二维码设置Google Authenticator' : 'Scan QR code to setup Google Authenticator'}
                    </p>
                  </div>
                </div>
                <Button onClick={generateTOTPSecret} className="btn-gradient-primary">
                  <Smartphone className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '设置2FA' : 'Setup 2FA'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Cards - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login Password */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{language === 'zh' ? '登录密码' : 'Login Password'}</CardTitle>
                  <CardDescription className="text-sm">{language === 'zh' ? '更改账户登录密码' : 'Change your account login password'}</CardDescription>
                </div>
              </div>
            </CardHeader>
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
                    <Label className="text-muted-foreground text-xs">{language === 'zh' ? '当前密码' : 'Current Password'}</Label>
                    <Input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">{language === 'zh' ? '新密码' : 'New Password'}</Label>
                    <Input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">{language === 'zh' ? '确认新密码' : 'Confirm New Password'}</Label>
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
                    className="w-full btn-gradient-success"
                  >
                    {language === 'zh' ? '更新密码' : 'Update Password'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal Password */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[hsl(var(--warning))]/10 to-transparent border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/20">
                  <Key className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <CardTitle className="text-base">{language === 'zh' ? '提现密码' : 'Withdrawal Password'}</CardTitle>
                  <CardDescription className="text-sm">{language === 'zh' ? '设置单独的提现密码' : 'Set a separate password for withdrawals'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {hasWithdrawalPassword && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {language === 'zh' ? '提现密码已设置' : 'Withdrawal password is set'}
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {hasWithdrawalPassword 
                        ? (language === 'zh' ? '新提现密码' : 'New Withdrawal Password')
                        : (language === 'zh' ? '提现密码' : 'Withdrawal Password')}
                    </Label>
                    <Input
                      type="password"
                      value={withdrawalForm.password}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">{language === 'zh' ? '确认密码' : 'Confirm Password'}</Label>
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
                    {hasWithdrawalPassword 
                      ? (language === 'zh' ? '更新提现密码' : 'Update Withdrawal Password')
                      : (language === 'zh' ? '设置提现密码' : 'Set Withdrawal Password')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Telegram Notifications Card */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {language === 'zh' ? 'Telegram 通知' : 'Telegram Notifications'}
                </CardTitle>
                <CardDescription>
                  {language === 'zh' 
                    ? '设置Telegram群组接收交易通知' 
                    : 'Set up Telegram group to receive transaction notifications'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    {language === 'zh' ? 'Telegram 群组/频道 ID' : 'Telegram Group/Channel ID'}
                  </Label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder={language === 'zh' ? '例如: -1001234567890' : 'e.g., -1001234567890'}
                    className="bg-muted/50 border-border font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' 
                      ? '从 @userinfobot 获取群组ID，将机器人添加到群组后发送消息获取' 
                      : 'Get group ID from @userinfobot - add bot to group and send a message'}
                  </p>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {language === 'zh' 
                      ? '💡 您将收到: 充值成功、提现状态更新、余额变动等通知' 
                      : '💡 You will receive: Deposit success, withdrawal status updates, balance changes'}
                  </p>
                </div>

                <Button
                  onClick={handleSaveTelegramId}
                  disabled={isSaving}
                  className="w-full"
                  variant="outline"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '保存 Telegram ID' : 'Save Telegram ID'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{language === 'zh' ? '安全提示' : 'Security Tips'}</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>{language === 'zh' ? '使用强大、唯一的密码' : 'Use a strong, unique password'}</li>
                  <li>{language === 'zh' ? '启用2FA以获得额外安全' : 'Enable 2FA for additional security'}</li>
                  <li>{language === 'zh' ? '切勿与任何人分享您的密码' : 'Never share your passwords with anyone'}</li>
                  <li>{language === 'zh' ? '定期更改密码' : 'Change passwords regularly'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {language === 'zh' ? '设置Google Authenticator' : 'Setup Google Authenticator'}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh' 
                ? '使用Google Authenticator应用扫描下方二维码' 
                : 'Scan the QR code below with your Google Authenticator app'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {totpUri && (
                <QRCodeSVG value={totpUri} size={200} level="H" />
              )}
            </div>

            {/* Manual entry */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {language === 'zh' ? '或手动输入密钥:' : 'Or enter this code manually:'}
              </Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all text-center">
                {totpSecret}
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <Label>
                {language === 'zh' ? '输入6位验证码' : 'Enter 6-digit verification code'}
              </Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShow2FASetup(false)}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button 
              onClick={verifyAndEnable2FA} 
              disabled={verificationCode.length !== 6 || isVerifying}
              className="btn-gradient-primary"
            >
              {isVerifying ? (language === 'zh' ? '验证中...' : 'Verifying...') : (language === 'zh' ? '验证并启用' : 'Verify & Enable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MerchantSecurity;
