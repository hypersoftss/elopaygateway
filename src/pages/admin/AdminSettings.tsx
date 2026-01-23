import { useState, useEffect } from 'react';
import { Save, Settings, CreditCard, Percent, Eye, EyeOff, Upload, AlertTriangle, Globe, Mail, Image, Bell, Shield, Server, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminSettings {
  id: string;
  master_merchant_id: string;
  master_api_key: string;
  master_payout_key: string;
  bondpay_base_url: string;
  default_payin_fee: number;
  default_payout_fee: number;
  gateway_name: string;
  gateway_domain: string | null;
  logo_url: string | null;
  support_email: string | null;
  large_payin_threshold: number;
  large_payout_threshold: number;
  large_withdrawal_threshold: number;
}

const AdminSettingsPage = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPayoutKey, setShowPayoutKey] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        setSettings({
          ...data[0],
          large_payin_threshold: data[0].large_payin_threshold || 10000,
          large_payout_threshold: data[0].large_payout_threshold || 5000,
          large_withdrawal_threshold: data[0].large_withdrawal_threshold || 10000,
        } as AdminSettings);
        setLogoPreview(data[0].logo_url);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
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

      const { error } = await supabase
        .from('admin_settings')
        .update({
          master_merchant_id: settings.master_merchant_id,
          master_api_key: settings.master_api_key,
          master_payout_key: settings.master_payout_key,
          bondpay_base_url: settings.bondpay_base_url,
          default_payin_fee: settings.default_payin_fee,
          default_payout_fee: settings.default_payout_fee,
          gateway_name: settings.gateway_name,
          gateway_domain: settings.gateway_domain,
          logo_url: logoUrl,
          support_email: settings.support_email,
          large_payin_threshold: settings.large_payin_threshold,
          large_payout_threshold: settings.large_payout_threshold,
          large_withdrawal_threshold: settings.large_withdrawal_threshold,
        })
        .eq('id', settings.id);

      if (error) throw error;

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
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Settings className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('settings.title')}</h1>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'zh' ? '配置网关品牌、API凭证和默认费率' : 'Configure your gateway branding, API credentials, and default fees'}
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-white text-slate-800 hover:bg-white/90">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('common.loading') : (language === 'zh' ? '保存所有更改' : 'Save All Changes')}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 gap-1">
            <TabsTrigger value="branding" className="flex items-center gap-2 py-2.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '网关品牌' : 'Branding'}</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2 py-2.5">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2 py-2.5">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '费率' : 'Fees'}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 py-2.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '通知' : 'Alerts'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Gateway Branding Tab */}
          <TabsContent value="branding" className="mt-6">
            <Card className="premium-card">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
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
                  <Label className="flex items-center gap-2 text-base">
                    <Image className="h-4 w-4" />
                    {language === 'zh' ? '网关Logo' : 'Gateway Logo'}
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
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
                      <p className="text-xs text-muted-foreground mt-2">
                        {language === 'zh' ? '推荐: 200x200px PNG或SVG, 最大2MB' : 'Recommended: 200x200px PNG or SVG. Max 2MB.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {language === 'zh' ? '网关名称' : 'Gateway Name'}
                    </Label>
                    <Input
                      value={settings?.gateway_name || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, gateway_name: e.target.value } : null)}
                      placeholder="PayGate"
                      className="h-11"
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
                      className="h-11"
                    />
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
                    className="h-11"
                  />
                </div>

                {/* Preview */}
                <div className="border-t pt-6">
                  <Label className="text-sm text-muted-foreground mb-3 block">{language === 'zh' ? '预览' : 'Preview'}</Label>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-xl">{settings?.gateway_name?.charAt(0) || 'P'}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg">{settings?.gateway_name || 'PayGate'}</p>
                      <p className="text-sm text-muted-foreground">{settings?.gateway_domain || 'https://your-gateway.com'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BondPay API Tab */}
          <TabsContent value="api" className="mt-6">
            <Card className="premium-card">
              <CardHeader className="border-b bg-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Server className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? 'BondPay API配置' : 'BondPay API Configuration'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '用于处理支付的主凭证' : 'Master credentials for processing payments'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    {language === 'zh' 
                      ? '请妥善保管这些凭证。它们拥有处理支付的完全访问权限。'
                      : 'Keep these credentials secure. They have full access to process payments.'}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? 'BondPay基础URL' : 'BondPay Base URL'}</Label>
                  <Input
                    value={settings?.bondpay_base_url || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, bondpay_base_url: e.target.value } : null)}
                    placeholder="https://api.bond-pays.com"
                    className="h-11 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '主商户ID' : 'Master Merchant ID'}</Label>
                  <Input
                    value={settings?.master_merchant_id || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, master_merchant_id: e.target.value } : null)}
                    placeholder="100888140"
                    className="h-11 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '主Payin API密钥' : 'Master Payin API Key'}</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings?.master_api_key || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, master_api_key: e.target.value } : null)}
                      className="h-11 font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '主Payout API密钥' : 'Master Payout API Key'}</Label>
                  <div className="relative">
                    <Input
                      type={showPayoutKey ? 'text' : 'password'}
                      value={settings?.master_payout_key || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, master_payout_key: e.target.value } : null)}
                      className="h-11 font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPayoutKey(!showPayoutKey)}
                    >
                      {showPayoutKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Default Fees Tab */}
          <TabsContent value="fees" className="mt-6">
            <Card className="premium-card">
              <CardHeader className="border-b bg-green-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
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
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {language === 'zh' ? '默认代收费率 (%)' : 'Default Payin Fee (%)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings?.default_payin_fee ?? ''}
                      onChange={(e) => setSettings(s => s ? { ...s, default_payin_fee: parseFloat(e.target.value) || 0 } : null)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '创建新商户时的默认代收费率' : 'Default pay-in fee when creating new merchants'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {language === 'zh' ? '默认代付费率 (%)' : 'Default Payout Fee (%)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings?.default_payout_fee ?? ''}
                      onChange={(e) => setSettings(s => s ? { ...s, default_payout_fee: parseFloat(e.target.value) || 0 } : null)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '创建新商户时的默认代付费率' : 'Default payout fee when creating new merchants'}
                    </p>
                  </div>
                </div>

                {/* Current Defaults Preview */}
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-sm font-medium mb-3">{language === 'zh' ? '当前默认值' : 'Current Defaults'}</p>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="text-base py-1.5 px-3">
                      <span className="text-primary font-bold">{settings?.default_payin_fee || 0}%</span>
                      <span className="text-muted-foreground ml-1">{language === 'zh' ? '代收' : 'Pay-in'}</span>
                    </Badge>
                    <Badge variant="outline" className="text-base py-1.5 px-3">
                      <span className="text-orange-500 font-bold">{settings?.default_payout_fee || 0}%</span>
                      <span className="text-muted-foreground ml-1">{language === 'zh' ? '代付' : 'Payout'}</span>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Thresholds Tab */}
          <TabsContent value="alerts" className="mt-6">
            <Card className="premium-card">
              <CardHeader className="border-b bg-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Bell className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '大额交易通知' : 'Large Transaction Alerts'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '超过阈值的交易将触发管理员通知' : 'Transactions exceeding thresholds will trigger admin notifications'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '大额代收阈值 (₹)' : 'Large Payin Threshold (₹)'}</Label>
                    <Input
                      type="number"
                      value={settings?.large_payin_threshold ?? ''}
                      onChange={(e) => setSettings(s => s ? { ...s, large_payin_threshold: parseInt(e.target.value) || 0 } : null)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '大额代付阈值 (₹)' : 'Large Payout Threshold (₹)'}</Label>
                    <Input
                      type="number"
                      value={settings?.large_payout_threshold ?? ''}
                      onChange={(e) => setSettings(s => s ? { ...s, large_payout_threshold: parseInt(e.target.value) || 0 } : null)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '大额提现阈值 (₹)' : 'Large Withdrawal Threshold (₹)'}</Label>
                    <Input
                      type="number"
                      value={settings?.large_withdrawal_threshold ?? ''}
                      onChange={(e) => setSettings(s => s ? { ...s, large_withdrawal_threshold: parseInt(e.target.value) || 0 } : null)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{language === 'zh' ? '安全提示' : 'Security Note'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'zh' 
                          ? '当任何交易金额超过设定阈值时，系统将自动创建通知提醒管理员审核。' 
                          : 'When any transaction exceeds the threshold, the system will automatically create a notification for admin review.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettingsPage;
