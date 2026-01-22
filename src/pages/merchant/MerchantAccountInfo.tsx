import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Hash, Calendar, Key, Copy, Check, Eye, EyeOff, RefreshCw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MerchantInfo {
  id: string;
  account_number: string;
  merchant_name: string;
  api_key: string;
  payout_key: string;
  callback_url: string | null;
  is_active: boolean;
  created_at: string;
}

const MerchantAccountInfo = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [info, setInfo] = useState<MerchantInfo | null>(null);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPayoutKey, setShowPayoutKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!user?.merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id, account_number, merchant_name, api_key, payout_key, callback_url, is_active, created_at')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setInfo(data);
        setCallbackUrl(data.callback_url || '');
      } catch (error) {
        console.error('Error fetching merchant info:', error);
        toast({
          title: t('common.error'),
          description: t('errors.fetchFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [user?.merchantId]);

  const handleSaveCallback = async () => {
    if (!info) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ callback_url: callbackUrl || null })
        .eq('id', info.id);

      if (error) throw error;

      setInfo({ ...info, callback_url: callbackUrl || null });
      toast({
        title: t('common.success'),
        description: t('merchant.callbackUpdated'),
      });
    } catch (error) {
      console.error('Error updating callback URL:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateKey = async (keyType: 'api_key' | 'payout_key') => {
    if (!info) return;
    
    try {
      // Generate new UUID for the key
      const newKey = crypto.randomUUID();
      
      const { error } = await supabase
        .from('merchants')
        .update({ [keyType]: newKey })
        .eq('id', info.id);

      if (error) throw error;

      setInfo({ ...info, [keyType]: newKey });
      toast({
        title: t('common.success'),
        description: t('merchant.keyRegenerated'),
      });
    } catch (error) {
      console.error('Error regenerating key:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: t('common.copied'),
      description: t('common.copiedToClipboard'),
    });
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    return key.slice(0, 8) + '••••••••' + key.slice(-4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
            <User className="h-6 w-6 text-[hsl(var(--success))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('merchant.accountInfo')}</h1>
            <p className="text-sm text-muted-foreground">{t('merchant.accountInfoDesc')}</p>
          </div>
        </div>

        {/* Account Status Card */}
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(142_76%_45%)]" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('merchant.accountStatus')}</CardTitle>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge 
                  className={info?.is_active 
                    ? "bg-[hsl(var(--success))] text-white" 
                    : "bg-destructive text-white"
                  }
                >
                  {info?.is_active ? t('status.active') : t('status.inactive')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : info && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('merchant.merchantName')}</p>
                    <p className="font-semibold">{info.merchant_name}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{t('merchant.accountNumber')}</p>
                    <p className="font-mono font-semibold">{info.account_number}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(info.account_number, 'account')}
                  >
                    {copiedField === 'account' ? (
                      <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                    <p className="font-semibold">{user?.email}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('merchant.memberSince')}</p>
                    <p className="font-semibold">{format(new Date(info.created_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('merchant.apiKeys')}
            </CardTitle>
            <CardDescription>{t('merchant.apiKeysDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : info && (
              <>
                {/* API Key */}
                <div className="space-y-2">
                  <Label>{t('merchant.apiKey')}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={showApiKey ? info.api_key : maskKey(info.api_key)}
                        readOnly
                        className="font-mono pr-20"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(info.api_key, 'api')}
                    >
                      {copiedField === 'api' ? (
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerateKey('api_key')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Payout Key */}
                <div className="space-y-2">
                  <Label>{t('merchant.payoutKey')}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={showPayoutKey ? info.payout_key : maskKey(info.payout_key)}
                        readOnly
                        className="font-mono pr-20"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPayoutKey(!showPayoutKey)}
                      >
                        {showPayoutKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(info.payout_key, 'payout')}
                    >
                      {copiedField === 'payout' ? (
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerateKey('payout_key')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Callback URL Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('merchant.callbackUrl')}</CardTitle>
            <CardDescription>{t('merchant.callbackUrlDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="https://your-server.com/callback"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveCallback}
                  disabled={isSaving}
                  className="btn-gradient-success"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-2">{t('common.save')}</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantAccountInfo;
