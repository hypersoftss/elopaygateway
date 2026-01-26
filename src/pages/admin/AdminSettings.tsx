import { useState, useEffect } from 'react';
import { Save, Settings, Percent, Eye, EyeOff, Upload, AlertTriangle, Globe, Mail, Image, Bell, Shield, Smartphone, Check, X, QrCode, Loader2, CheckCircle2, XCircle, Database, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';
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

interface AdminSettings {
  id: string;
  default_payin_fee: number;
  default_payout_fee: number;
  gateway_name: string;
  gateway_domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string | null;
  large_payin_threshold: number;
  large_payout_threshold: number;
  large_withdrawal_threshold: number;
  admin_telegram_chat_id: string | null;
  telegram_bot_token: string | null;
  telegram_webhook_url: string | null;
  balance_threshold_inr: number;
  balance_threshold_pkr: number;
  balance_threshold_bdt: number;
}


const AdminSettingsPage = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Domain test state
  const [isTestingDomain, setIsTestingDomain] = useState(false);
  const [domainTestResult, setDomainTestResult] = useState<'success' | 'error' | null>(null);
  
  // Database export state
  const [isExporting, setIsExporting] = useState(false);

  // Test gateway domain connectivity
  const testDomainConnection = async () => {
    const domain = settings?.gateway_domain?.replace(/\/+$/, '');
    if (!domain) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请先输入域名' : 'Please enter a domain first',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(domain);
    } catch {
      toast({
        title: language === 'zh' ? '无效URL' : 'Invalid URL',
        description: language === 'zh' ? '请输入有效的URL格式' : 'Please enter a valid URL format',
        variant: 'destructive',
      });
      setDomainTestResult('error');
      return;
    }

    setIsTestingDomain(true);
    setDomainTestResult(null);

    try {
      // Try to fetch the domain with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(domain, {
        method: 'HEAD',
        mode: 'no-cors', // Allow cross-origin requests without CORS
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // no-cors mode always returns opaque response, but if it doesn't throw, the domain is reachable
      setDomainTestResult('success');
      toast({
        title: language === 'zh' ? '连接成功' : 'Connection Successful',
        description: language === 'zh' ? `${domain} 可访问` : `${domain} is reachable`,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: language === 'zh' ? '连接超时' : 'Connection Timeout',
          description: language === 'zh' ? '域名响应时间过长' : 'Domain took too long to respond',
          variant: 'destructive',
        });
      } else {
        toast({
          title: language === 'zh' ? '连接失败' : 'Connection Failed',
          description: language === 'zh' ? '无法访问该域名' : 'Could not reach the domain',
          variant: 'destructive',
        });
      }
      setDomainTestResult('error');
    } finally {
      setIsTestingDomain(false);
    }
  };


  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        const settingsData = data[0] as any;
        setSettings({
          ...settingsData,
          large_payin_threshold: settingsData.large_payin_threshold || 10000,
          large_payout_threshold: settingsData.large_payout_threshold || 5000,
          large_withdrawal_threshold: settingsData.large_withdrawal_threshold || 10000,
          favicon_url: settingsData.favicon_url || null,
          admin_telegram_chat_id: settingsData.admin_telegram_chat_id || null,
          telegram_bot_token: settingsData.telegram_bot_token || null,
          telegram_webhook_url: settingsData.telegram_webhook_url || null,
          balance_threshold_inr: settingsData.balance_threshold_inr || 10000,
          balance_threshold_pkr: settingsData.balance_threshold_pkr || 50000,
          balance_threshold_bdt: settingsData.balance_threshold_bdt || 50000,
        } as AdminSettings);
        setLogoPreview(settingsData.logo_url);
        setFaviconPreview(settingsData.favicon_url);
      }

      // Fetch admin 2FA status
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('admin_profiles')
          .select('is_2fa_enabled')
          .eq('user_id', user.id)
          .limit(1);
        
        if (profileData && profileData.length > 0) {
          setIs2FAEnabled(!!profileData[0].is_2fa_enabled);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  // 2FA Functions
  const generateTOTPSecret = () => {
    const gatewayName = settings?.gateway_name || 'PayGate';
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: gatewayName,
      label: 'Admin',
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
    if (!user?.id || verificationCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const gatewayName = settings?.gateway_name || 'PayGate';
      const totp = new OTPAuth.TOTP({
        issuer: gatewayName,
        label: 'Admin',
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

      // Save to admin_profiles
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          google_2fa_secret: totpSecret,
          is_2fa_enabled: true,
        })
        .eq('user_id', user.id);

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
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          google_2fa_secret: null,
          is_2fa_enabled: false,
        })
        .eq('user_id', user.id);

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

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      let logoUrl = settings.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gateway-assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gateway-assets')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      let faviconUrl = settings.favicon_url;
      if (faviconFile) {
        const fileExt = faviconFile.name.split('.').pop();
        const fileName = `favicon-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gateway-assets')
          .upload(fileName, faviconFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gateway-assets')
          .getPublicUrl(fileName);

        faviconUrl = urlData.publicUrl;
      }

      // Sanitize gateway domain - remove trailing slashes
      const sanitizedDomain = settings.gateway_domain?.replace(/\/+$/, '') || null;

      const { error } = await supabase
        .from('admin_settings')
        .update({
          default_payin_fee: settings.default_payin_fee,
          default_payout_fee: settings.default_payout_fee,
          gateway_name: settings.gateway_name?.trim() || 'PayGate',
          gateway_domain: sanitizedDomain,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          support_email: settings.support_email?.trim() || null,
          large_payin_threshold: settings.large_payin_threshold,
          large_payout_threshold: settings.large_payout_threshold,
          large_withdrawal_threshold: settings.large_withdrawal_threshold,
          admin_telegram_chat_id: settings.admin_telegram_chat_id?.trim() || null,
          telegram_bot_token: settings.telegram_bot_token?.trim() || null,
          telegram_webhook_url: settings.telegram_webhook_url?.trim() || null,
          balance_threshold_inr: settings.balance_threshold_inr,
          balance_threshold_pkr: settings.balance_threshold_pkr,
          balance_threshold_bdt: settings.balance_threshold_bdt,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;

      // Clear the gateway settings cache so new settings are fetched
      const { clearGatewaySettingsCache } = await import('@/hooks/useGatewaySettings');
      clearGatewaySettingsCache();

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '设置已保存' : 'Settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '配置网关品牌、API凭证和默认费率' : 'Configure your gateway branding, API credentials, and default fees'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.loading') : (language === 'zh' ? '保存所有更改' : 'Save All Changes')}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '品牌' : 'Brand'}</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '费率' : 'Fees'}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '通知' : 'Alerts'}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '安全' : 'Security'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Gateway Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '网关品牌' : 'Gateway Branding'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '自定义您的支付网关标识' : 'Customize your payment gateway identity'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {language === 'zh' ? '网关Logo' : 'Gateway Logo'}
                  </Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted overflow-hidden">
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="logo" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {language === 'zh' ? '上传Logo' : 'Upload Logo'}
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'zh' ? '推荐: 200x200px PNG或SVG, 最大2MB' : 'Recommended: 200x200px PNG or SVG. Max 2MB.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {language === 'zh' ? '网站图标 (Favicon)' : 'Favicon'}
                  </Label>
                  <div className="flex items-center gap-4">
                    {faviconPreview && (
                      <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-muted overflow-hidden">
                        <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <Input
                        id="favicon"
                        type="file"
                        accept="image/*,.ico"
                        onChange={handleFaviconChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="favicon" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {language === 'zh' ? '上传图标' : 'Upload Favicon'}
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'zh' ? '推荐: 32x32px或64x64px PNG/ICO' : 'Recommended: 32x32px or 64x64px PNG/ICO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {language === 'zh' ? '网关名称' : 'Gateway Name'}
                    </Label>
                    <Input
                      value={settings?.gateway_name || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, gateway_name: e.target.value } : null)}
                      placeholder="PayGate"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '此名称将显示在文档和商户仪表板中' : 'This name will appear in docs and merchant dashboard'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {language === 'zh' ? '网关域名' : 'Gateway Domain'}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={settings?.gateway_domain || ''}
                          onChange={(e) => {
                            // Auto-remove trailing slashes on input and reset test result
                            const value = e.target.value.replace(/\/+$/, '');
                            setSettings(s => s ? { ...s, gateway_domain: value } : null);
                            setDomainTestResult(null);
                          }}
                          placeholder="https://your-gateway.com"
                          className={domainTestResult === 'success' ? 'border-green-500 pr-10' : domainTestResult === 'error' ? 'border-destructive pr-10' : ''}
                        />
                        {domainTestResult && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {domainTestResult === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testDomainConnection}
                        disabled={isTestingDomain || !settings?.gateway_domain}
                      >
                        {isTestingDomain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          language === 'zh' ? '测试连接' : 'Test'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '您网关的公共URL，用于API文档（无需末尾斜杠）' : "Your gateway's public URL for API documentation (no trailing slash)"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {language === 'zh' ? '客服邮箱' : 'Support Email'}
                  </Label>
                  <Input
                    type="email"
                    value={settings?.support_email || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, support_email: e.target.value } : null)}
                    placeholder="support@your-gateway.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '向商户显示的客服联系邮箱' : 'Contact email shown to merchants for support'}
                  </p>
                </div>

                {/* Preview */}
                <div className="border-t pt-6">
                  <Label className="text-sm text-muted-foreground mb-3 block">{language === 'zh' ? '预览' : 'Preview'}</Label>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain" />
                    )}
                    <div>
                      <p className="font-semibold">{settings?.gateway_name || 'PayGate'}</p>
                      <p className="text-xs text-muted-foreground">{settings?.gateway_domain || 'https://your-gateway.com'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Default Fees Tab */}
          <TabsContent value="fees">
            <Card>
              <CardHeader className="bg-green-500/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Percent className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '默认费率配置' : 'Default Fee Configuration'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '为新商户设置默认费率（可按商户自定义）' : 'Set default fees for new merchants (can be customized per merchant)'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 border-green-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">IN</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? 'Pay-In费率' : 'Pay-In Fee'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '收款时收取' : 'Charged on incoming payments'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '默认Payin费率 (%)' : 'Default Payin Fee (%)'}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings?.default_payin_fee || 0}
                        onChange={(e) => setSettings(s => s ? { ...s, default_payin_fee: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-orange-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">OUT</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? 'Pay-Out费率' : 'Pay-Out Fee'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '提现时收取' : 'Charged on withdrawals'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '默认Payout费率 (%)' : 'Default Payout Fee (%)'}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings?.default_payout_fee || 0}
                        onChange={(e) => setSettings(s => s ? { ...s, default_payout_fee: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                </div>

                <Alert className="mt-6">
                  <AlertDescription className="text-muted-foreground">
                    💡 {language === 'zh' 
                      ? '这些费率将应用于新商户。您可以在商户编辑页面为各个商户自定义费率。'
                      : "These fees will be applied to new merchants. You can customize fees for individual merchants in their edit page."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Notification Thresholds Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader className="bg-amber-500/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '通知阈值配置' : 'Notification Threshold Configuration'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '设置大额交易通知的触发阈值' : 'Set thresholds for large transaction alerts'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    {language === 'zh' 
                      ? '当交易金额超过设定阈值时，系统将自动发送通知提醒。'
                      : 'When transaction amounts exceed these thresholds, you will receive automatic notifications.'}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-2 border-[hsl(var(--success))]/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[hsl(var(--success))] rounded-lg flex items-center justify-center text-white text-xs font-bold">IN</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额Pay-In' : 'Large Pay-In'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '收款超过此金额通知' : 'Notify when pay-in exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_payin_threshold || 10000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_payin_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="10000"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-[hsl(var(--warning))]/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[hsl(var(--warning))] rounded-lg flex items-center justify-center text-white text-xs font-bold">OUT</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额Pay-Out' : 'Large Pay-Out'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '付款超过此金额通知' : 'Notify when payout exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_payout_threshold || 5000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_payout_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="5000"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-destructive/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center text-white text-xs font-bold">WD</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额提现' : 'Large Withdrawal'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '提现超过此金额通知' : 'Notify when withdrawal exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_withdrawal_threshold || 10000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_withdrawal_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="10000"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Gateway Balance Thresholds */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    💰 {language === 'zh' ? '网关余额告警阈值' : 'Gateway Balance Alert Thresholds'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'zh' 
                      ? '当网关余额低于设定阈值时，将发送Telegram告警通知' 
                      : 'Telegram alerts will be sent when gateway balance falls below these thresholds'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-2 border-amber-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">INR</div>
                          <div>
                            <CardTitle className="text-base">India (INR)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '印度卢比阈值' : 'Indian Rupee threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_inr || 10000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_inr: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="10000"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">PKR</div>
                          <div>
                            <CardTitle className="text-base">Pakistan (PKR)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '巴基斯坦卢比阈值' : 'Pakistani Rupee threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (Rs.)' : 'Threshold (Rs.)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_pkr || 50000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_pkr: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="50000"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-teal-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">BDT</div>
                          <div>
                            <CardTitle className="text-base">Bangladesh (BDT)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '孟加拉塔卡阈值' : 'Bangladeshi Taka threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (৳)' : 'Threshold (৳)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_bdt || 50000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_bdt: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="50000"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
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
                          <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
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
                {is2FAEnabled ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-[hsl(var(--success))]" />
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

            {/* Database Backup */}
            <Card className="border-2 border-primary/20 overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'zh' ? '完整数据库导出' : 'Complete Database Export'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' 
                        ? '下载包含Schema + RLS + 数据的完整SQL文件' 
                        : 'Download complete SQL with Schema + RLS + Data'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Download className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '一键导出全部' : 'Export Everything'}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'zh' ? 'Tables + Functions + RLS Policies + Data' : 'Tables + Functions + RLS Policies + Data'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (!sessionData.session) {
                          throw new Error('Not authenticated');
                        }
                        
                        const response = await supabase.functions.invoke('export-database', {
                          headers: {
                            Authorization: `Bearer ${sessionData.session.access_token}`,
                          },
                        });
                        
                        if (response.error) throw response.error;
                        
                        // Create download
                        const blob = new Blob([response.data], { type: 'application/sql' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `hyper_softs_backup_${new Date().toISOString().split('T')[0]}.sql`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: language === 'zh' ? '导出成功' : 'Export Successful',
                          description: language === 'zh' ? 'SQL备份已下载' : 'SQL backup downloaded',
                        });
                      } catch (err: any) {
                        toast({
                          title: language === 'zh' ? '导出失败' : 'Export Failed',
                          description: err.message,
                          variant: 'destructive',
                        });
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'zh' ? '导出中...' : 'Exporting...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '下载完整SQL' : 'Download Complete SQL'}
                      </>
                    )}
                  </Button>
                </div>
                
                <Alert className="mt-4 border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <AlertDescription className="text-sm">
                    {language === 'zh' 
                      ? '此SQL包含完整数据库：Enums + Functions + Tables + RLS Policies + Storage + Data。直接在新Supabase项目SQL编辑器运行即可。' 
                      : 'This SQL contains everything: Enums + Functions + Tables + RLS Policies + Storage + Data. Run directly in new Supabase SQL Editor.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Security Tips */}
            <Card className="bg-card border-border mt-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{language === 'zh' ? '安全提示' : 'Security Tips'}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>{language === 'zh' ? '使用强大、唯一的密码' : 'Use a strong, unique password'}</li>
                      <li>{language === 'zh' ? '启用2FA以获得额外安全' : 'Enable 2FA for additional security'}</li>
                      <li>{language === 'zh' ? '切勿与任何人分享您的密码' : 'Never share your passwords with anyone'}</li>
                      <li>{language === 'zh' ? '定期更改密码' : 'Change passwords regularly'}</li>
                      <li>{language === 'zh' ? '定期备份数据库' : 'Backup database regularly'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

export default AdminSettingsPage;