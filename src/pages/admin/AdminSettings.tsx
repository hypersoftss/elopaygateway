import { useState, useEffect } from 'react';
import { Save, Settings, Percent, Eye, EyeOff, Upload, AlertTriangle, Globe, Mail, Image, Bell, Shield, Smartphone, Check, X, QrCode, Send, Layers, Plus, Trash2, Edit, Power } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
}

interface PaymentGateway {
  id: string;
  gateway_code: string;
  gateway_name: string;
  gateway_type: string;
  base_url: string;
  app_id: string;
  api_key: string;
  payout_key: string | null;
  currency: string;
  trade_type: string | null;
  is_active: boolean;
  created_at: string;
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
  
  // Telegram Bot State
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);

  // Gateway Management State
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [isLoadingGateways, setIsLoadingGateways] = useState(false);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [showGatewayApiKey, setShowGatewayApiKey] = useState<Set<string>>(new Set());
  const [newGateway, setNewGateway] = useState({
    gateway_code: '',
    gateway_name: '',
    gateway_type: 'lgpay',
    base_url: 'https://www.lg-pay.com',
    app_id: '',
    api_key: '',
    payout_key: '',
    currency: 'INR',
    trade_type: '',
  });

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

  const fetchGateways = async () => {
    setIsLoadingGateways(true);
    try {
      const { data } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('created_at', { ascending: false });
      setGateways(data || []);
    } catch (error) {
      console.error('Error fetching gateways:', error);
    } finally {
      setIsLoadingGateways(false);
    }
  };

  const handleSaveGateway = async () => {
    try {
      if (editingGateway) {
        const { error } = await supabase
          .from('payment_gateways')
          .update({
            gateway_code: newGateway.gateway_code,
            gateway_name: newGateway.gateway_name,
            gateway_type: newGateway.gateway_type,
            base_url: newGateway.base_url,
            app_id: newGateway.app_id,
            api_key: newGateway.api_key,
            payout_key: newGateway.payout_key || null,
            currency: newGateway.currency,
            trade_type: newGateway.trade_type || null,
          })
          .eq('id', editingGateway.id);
        if (error) throw error;
        toast({
          title: t('common.success'),
          description: language === 'zh' ? '网关已更新' : 'Gateway updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('payment_gateways')
          .insert({
            gateway_code: newGateway.gateway_code,
            gateway_name: newGateway.gateway_name,
            gateway_type: newGateway.gateway_type,
            base_url: newGateway.base_url,
            app_id: newGateway.app_id,
            api_key: newGateway.api_key,
            payout_key: newGateway.payout_key || null,
            currency: newGateway.currency,
            trade_type: newGateway.trade_type || null,
          });
        if (error) throw error;
        toast({
          title: t('common.success'),
          description: language === 'zh' ? '网关已创建' : 'Gateway created successfully',
        });
      }
      setShowGatewayDialog(false);
      setEditingGateway(null);
      setNewGateway({
        gateway_code: '',
        gateway_name: '',
        gateway_type: 'lgpay',
        base_url: 'https://www.lg-pay.com',
        app_id: '',
        api_key: '',
        payout_key: '',
        currency: 'INR',
        trade_type: '',
      });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleGatewayStatus = async (gateway: PaymentGateway) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_active: !gateway.is_active })
        .eq('id', gateway.id);
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: gateway.is_active 
          ? (language === 'zh' ? '网关已禁用' : 'Gateway disabled')
          : (language === 'zh' ? '网关已启用' : 'Gateway enabled'),
      });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGateway = async (gateway: PaymentGateway) => {
    if (!confirm(language === 'zh' ? '确定删除此网关吗?' : 'Are you sure you want to delete this gateway?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('id', gateway.id);
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: language === 'zh' ? '网关已删除' : 'Gateway deleted successfully',
      });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditGateway = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setNewGateway({
      gateway_code: gateway.gateway_code,
      gateway_name: gateway.gateway_name,
      gateway_type: gateway.gateway_type,
      base_url: gateway.base_url,
      app_id: gateway.app_id,
      api_key: gateway.api_key,
      payout_key: gateway.payout_key || '',
      currency: gateway.currency,
      trade_type: gateway.trade_type || '',
    });
    setShowGatewayDialog(true);
  };

  const toggleGatewayApiKeyVisibility = (id: string) => {
    const newSet = new Set(showGatewayApiKey);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setShowGatewayApiKey(newSet);
  };

  useEffect(() => {
    fetchSettings();
    fetchGateways();
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

      const { error } = await supabase
        .from('admin_settings')
        .update({
          default_payin_fee: settings.default_payin_fee,
          default_payout_fee: settings.default_payout_fee,
          gateway_name: settings.gateway_name,
          gateway_domain: settings.gateway_domain,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          support_email: settings.support_email,
          large_payin_threshold: settings.large_payin_threshold,
          large_payout_threshold: settings.large_payout_threshold,
          large_withdrawal_threshold: settings.large_withdrawal_threshold,
          admin_telegram_chat_id: settings.admin_telegram_chat_id,
          telegram_bot_token: settings.telegram_bot_token,
          telegram_webhook_url: settings.telegram_webhook_url,
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '品牌' : 'Brand'}</span>
            </TabsTrigger>
            <TabsTrigger value="gateways" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '网关' : 'Gateways'}</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '费率' : 'Fees'}</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Telegram</span>
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
                    <Input
                      value={settings?.gateway_domain || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, gateway_domain: e.target.value } : null)}
                      placeholder="https://your-gateway.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '您网关的公共URL，用于API文档' : "Your gateway's public URL for API documentation"}
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

          {/* Gateway Management Tab */}
          <TabsContent value="gateways">
            <Card>
              <CardHeader className="bg-purple-500/5 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Layers className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle>{language === 'zh' ? '支付网关管理' : 'Payment Gateway Management'}</CardTitle>
                      <CardDescription>
                        {language === 'zh' ? '管理所有支付网关配置和凭证' : 'Manage all payment gateway configurations and credentials'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => { setEditingGateway(null); setNewGateway({ gateway_code: '', gateway_name: '', gateway_type: 'lgpay', base_url: 'https://www.lg-pay.com', app_id: '', api_key: '', payout_key: '', currency: 'INR', trade_type: '' }); setShowGatewayDialog(true); }} className="btn-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '添加网关' : 'Add Gateway'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{language === 'zh' ? '网关名称' : 'Gateway Name'}</TableHead>
                      <TableHead>{language === 'zh' ? '类型' : 'Type'}</TableHead>
                      <TableHead>{language === 'zh' ? '货币' : 'Currency'}</TableHead>
                      <TableHead>{language === 'zh' ? 'App ID' : 'App ID'}</TableHead>
                      <TableHead>{language === 'zh' ? 'API Key' : 'API Key'}</TableHead>
                      <TableHead className="text-center">{language === 'zh' ? '状态' : 'Status'}</TableHead>
                      <TableHead>{language === 'zh' ? '操作' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingGateways ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : gateways.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === 'zh' ? '暂无网关配置' : 'No gateways configured'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      gateways.map((gw) => (
                        <TableRow key={gw.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{gw.gateway_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{gw.gateway_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={gw.gateway_type === 'bondpay' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}>
                              {gw.gateway_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{gw.currency}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{gw.app_id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {showGatewayApiKey.has(gw.id) ? gw.api_key.slice(0, 16) + '...' : '••••••••••••'}
                              </span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleGatewayApiKeyVisibility(gw.id)}>
                                {showGatewayApiKey.has(gw.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={gw.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-muted text-muted-foreground'}>
                              {gw.is_active ? (language === 'zh' ? '启用' : 'Active') : (language === 'zh' ? '禁用' : 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditGateway(gw)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleGatewayStatus(gw)}>
                                <Power className={`h-4 w-4 ${gw.is_active ? 'text-red-500' : 'text-green-500'}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteGateway(gw)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {language === 'zh' 
                  ? 'BondPay 仅支持 INR (印度)。LG Pay 支持 INR, PKR (巴基斯坦), BDT (孟加拉)。' 
                  : 'BondPay supports INR (India) only. LG Pay supports INR, PKR (Pakistan), BDT (Bangladesh).'}
              </AlertDescription>
            </Alert>
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

          {/* Telegram Bot Tab */}
          <TabsContent value="telegram">
            <div className="space-y-6">
              {/* Bot Token Card */}
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Send className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {language === 'zh' ? 'Telegram Bot 配置' : 'Telegram Bot Configuration'}
                      </CardTitle>
                      <CardDescription>
                        {language === 'zh' 
                          ? '配置您的 Telegram Bot Token 和 Webhook' 
                          : 'Configure your Telegram Bot Token and Webhook'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Bot Token */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      🤖 {language === 'zh' ? 'Bot Token' : 'Bot Token'}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showBotToken ? 'text' : 'password'}
                        value={settings?.telegram_bot_token || ''}
                        onChange={(e) => setSettings(s => s ? { ...s, telegram_bot_token: e.target.value || null } : null)}
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        className="bg-muted/50 border-border font-mono pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowBotToken(!showBotToken)}
                      >
                        {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' 
                        ? '从 @BotFather 获取 Bot Token' 
                        : 'Get Bot Token from @BotFather on Telegram'}
                    </p>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      🔗 {language === 'zh' ? 'Webhook URL' : 'Webhook URL'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings?.telegram_webhook_url || `https://ttywuskboaranphxxgtr.supabase.co/functions/v1/telegram-bot`}
                        onChange={(e) => setSettings(s => s ? { ...s, telegram_webhook_url: e.target.value || null } : null)}
                        placeholder="https://your-domain.com/functions/v1/telegram-bot"
                        className="bg-muted/50 border-border font-mono flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const webhookUrl = settings?.telegram_webhook_url || `https://ttywuskboaranphxxgtr.supabase.co/functions/v1/telegram-bot`;
                          const botToken = settings?.telegram_bot_token;
                          
                          if (!botToken) {
                            toast({
                              title: language === 'zh' ? '错误' : 'Error',
                              description: language === 'zh' ? '请先输入 Bot Token' : 'Please enter Bot Token first',
                              variant: 'destructive',
                            });
                            return;
                          }
                          
                          setIsSettingWebhook(true);
                          try {
                            const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ url: webhookUrl }),
                            });
                            const result = await response.json();
                            
                            if (result.ok) {
                              toast({
                                title: language === 'zh' ? 'Webhook 设置成功' : 'Webhook Set Successfully',
                                description: language === 'zh' ? 'Bot 已连接' : 'Bot is now connected',
                              });
                            } else {
                              throw new Error(result.description || 'Failed to set webhook');
                            }
                          } catch (error: any) {
                            toast({
                              title: language === 'zh' ? '错误' : 'Error',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } finally {
                            setIsSettingWebhook(false);
                          }
                        }}
                        disabled={isSettingWebhook || !settings?.telegram_bot_token}
                      >
                        {isSettingWebhook ? '...' : (language === 'zh' ? '设置 Webhook' : 'Set Webhook')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' 
                        ? '点击"设置 Webhook"按钮激活 Bot' 
                        : 'Click "Set Webhook" button to activate the bot'}
                    </p>
                  </div>

                  {/* Admin Group ID */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      👑 {language === 'zh' ? 'Admin Group ID' : 'Admin Group ID'}
                    </Label>
                    <Input
                      value={settings?.admin_telegram_chat_id || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, admin_telegram_chat_id: e.target.value || null } : null)}
                      placeholder="-1001234567890"
                      className="bg-muted/50 border-border font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' 
                        ? '在群组中使用 /tg_id 获取群组 ID' 
                        : 'Use /tg_id in your group to get the Group ID'}
                    </p>
                  </div>

                  <Alert className="border-blue-500/30 bg-blue-500/10">
                    <Send className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-600 dark:text-blue-400">
                      <b>{language === 'zh' ? '设置步骤:' : 'Setup Steps:'}</b>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>{language === 'zh' ? '从 @BotFather 创建 Bot 并获取 Token' : 'Create a bot with @BotFather and get the Token'}</li>
                        <li>{language === 'zh' ? '将 Token 粘贴到上方' : 'Paste the Token above'}</li>
                        <li>{language === 'zh' ? '点击"保存所有更改"' : 'Click "Save All Changes"'}</li>
                        <li>{language === 'zh' ? '点击"设置 Webhook"激活 Bot' : 'Click "Set Webhook" to activate the bot'}</li>
                        <li>{language === 'zh' ? '将 Bot 添加到您的 Admin 群组' : 'Add the bot to your Admin group'}</li>
                        <li>{language === 'zh' ? '在群组中发送 /tg_id 获取群组 ID' : 'Send /tg_id in the group to get Group ID'}</li>
                        <li>{language === 'zh' ? '将群组 ID 填入上方并保存' : 'Enter the Group ID above and save'}</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Bot Commands Reference */}
              <Card className="border-border">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    📋 {language === 'zh' ? 'Bot 命令参考' : 'Bot Commands Reference'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground">📋 General</h4>
                      <div className="space-y-1 font-mono text-xs">
                        <p><code>/tg_id</code> - Get chat/group ID</p>
                        <p><code>/help</code> - Show all commands</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground">👤 Merchant</h4>
                      <div className="space-y-1 font-mono text-xs">
                        <p><code>/create_merchant "Name" email group_id</code></p>
                        <p><code>/merchants</code> - List all</p>
                        <p><code>/merchant [account_no]</code> - Details</p>
                        <p><code>/search [name]</code> - Search</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground">💰 Transactions</h4>
                      <div className="space-y-1 font-mono text-xs">
                        <p><code>/balance [account_no]</code></p>
                        <p><code>/history [account_no]</code></p>
                        <p><code>/status [order_no]</code></p>
                        <p><code>/today [account_no]</code></p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground">🔧 Actions</h4>
                      <div className="space-y-1 font-mono text-xs">
                        <p><code>/reset_2fa [account_no]</code></p>
                        <p><code>/reset_password [account_no]</code></p>
                        <p><code>/set_fee [acc] [type] [%]</code></p>
                        <p><code>/activate [account_no]</code></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

      {/* Gateway Add/Edit Dialog */}
      <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {editingGateway 
                ? (language === 'zh' ? '编辑网关' : 'Edit Gateway')
                : (language === 'zh' ? '添加网关' : 'Add Gateway')}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh' 
                ? '配置支付网关凭证和设置' 
                : 'Configure payment gateway credentials and settings'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关代码' : 'Gateway Code'}</Label>
                <Input
                  value={newGateway.gateway_code}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_code: e.target.value }))}
                  placeholder="lgpay_inr"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关名称' : 'Gateway Name'}</Label>
                <Input
                  value={newGateway.gateway_name}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_name: e.target.value }))}
                  placeholder="LG Pay INR"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关类型' : 'Gateway Type'}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newGateway.gateway_type}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_type: e.target.value }))}
                >
                  <option value="lgpay">LG Pay</option>
                  <option value="bondpay">BondPay</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '货币' : 'Currency'}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newGateway.currency}
                  onChange={(e) => setNewGateway(g => ({ ...g, currency: e.target.value }))}
                >
                  <option value="INR">INR (India)</option>
                  <option value="PKR">PKR (Pakistan)</option>
                  <option value="BDT">BDT (Bangladesh)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'zh' ? '基础URL' : 'Base URL'}</Label>
              <Input
                value={newGateway.base_url}
                onChange={(e) => setNewGateway(g => ({ ...g, base_url: e.target.value }))}
                placeholder="https://www.lg-pay.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>App ID</Label>
                <Input
                  value={newGateway.app_id}
                  onChange={(e) => setNewGateway(g => ({ ...g, app_id: e.target.value }))}
                  placeholder="PKR3202"
                />
              </div>
              <div className="space-y-2">
                <Label>Trade Type</Label>
                <Input
                  value={newGateway.trade_type}
                  onChange={(e) => setNewGateway(g => ({ ...g, trade_type: e.target.value }))}
                  placeholder="test"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key (Payin)</Label>
              <Input
                type="password"
                value={newGateway.api_key}
                onChange={(e) => setNewGateway(g => ({ ...g, api_key: e.target.value }))}
                placeholder="Enter API Key"
              />
            </div>

            <div className="space-y-2">
              <Label>Payout Key ({language === 'zh' ? '可选' : 'Optional'})</Label>
              <Input
                type="password"
                value={newGateway.payout_key}
                onChange={(e) => setNewGateway(g => ({ ...g, payout_key: e.target.value }))}
                placeholder="Enter Payout Key"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGatewayDialog(false)}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSaveGateway} 
              disabled={!newGateway.gateway_code || !newGateway.gateway_name || !newGateway.app_id || !newGateway.api_key}
              className="btn-gradient-primary"
            >
              {editingGateway 
                ? (language === 'zh' ? '更新网关' : 'Update Gateway')
                : (language === 'zh' ? '创建网关' : 'Create Gateway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSettingsPage;