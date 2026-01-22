import { useState, useEffect } from 'react';
import { Save, Settings, CreditCard, Percent, Eye, EyeOff, Upload, AlertTriangle, Globe, Mail, Image, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
              {language === 'zh' ? '网关品牌' : 'Branding'}
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {language === 'zh' ? 'API' : 'API'}
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              {language === 'zh' ? '费率' : 'Fees'}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {language === 'zh' ? '通知' : 'Alerts'}
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

          {/* BondPay API Tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader className="bg-orange-500/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-orange-500" />
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '主商户ID' : 'Master Merchant ID'}</Label>
                  <Input
                    value={settings?.master_merchant_id || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, master_merchant_id: e.target.value } : null)}
                    placeholder="100888140"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '主Payin API密钥' : 'Master Payin API Key'}</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings?.master_api_key || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, master_api_key: e.target.value } : null)}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettingsPage;