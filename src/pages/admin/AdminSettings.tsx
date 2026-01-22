import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
}

const AdminSettings = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        setSettings(data[0] as AdminSettings);
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

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      // Upload logo if changed
      let logoUrl = settings.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gateway-assets')
          .upload(fileName, logoFile);

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
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '设置已保存' : 'Settings saved',
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
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.loading') : t('common.save')}
          </Button>
        </div>

        {/* Master Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.masterCredentials')}</CardTitle>
            <CardDescription>
              {language === 'zh' ? 'BondPay主账户配置' : 'BondPay master account configuration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings.masterMerchantId')}</Label>
                <Input
                  value={settings?.master_merchant_id || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, master_merchant_id: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.baseUrl')}</Label>
                <Input
                  value={settings?.bondpay_base_url || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, bondpay_base_url: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.masterApiKey')}</Label>
                <Input
                  type="password"
                  value={settings?.master_api_key || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, master_api_key: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.masterPayoutKey')}</Label>
                <Input
                  type="password"
                  value={settings?.master_payout_key || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, master_payout_key: e.target.value } : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Fees */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.defaultFees')}</CardTitle>
            <CardDescription>
              {language === 'zh' ? '新商户的默认费率' : 'Default fees for new merchants'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('merchants.payinFee')} (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.default_payin_fee || 0}
                  onChange={(e) => setSettings(s => s ? { ...s, default_payin_fee: parseFloat(e.target.value) } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('merchants.payoutFee')} (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.default_payout_fee || 0}
                  onChange={(e) => setSettings(s => s ? { ...s, default_payout_fee: parseFloat(e.target.value) } : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.branding')}</CardTitle>
            <CardDescription>
              {language === 'zh' ? '自定义网关品牌' : 'Customize gateway branding'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings.gatewayName')}</Label>
                <Input
                  value={settings?.gateway_name || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, gateway_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.gatewayDomain')}</Label>
                <Input
                  value={settings?.gateway_domain || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, gateway_domain: e.target.value } : null)}
                  placeholder="https://pay.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.supportEmail')}</Label>
                <Input
                  type="email"
                  value={settings?.support_email || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, support_email: e.target.value } : null)}
                  placeholder="support@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.logo')}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                {settings?.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="h-12 mt-2 object-contain" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
