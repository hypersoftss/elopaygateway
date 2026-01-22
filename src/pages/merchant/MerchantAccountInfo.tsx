import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Key, Copy, Eye, EyeOff, Bell, ArrowRightLeft, Wallet, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MerchantInfo {
  id: string;
  account_number: string;
  merchant_name: string;
  api_key: string;
  payout_key: string;
  callback_url: string | null;
  payin_fee: number;
  payout_fee: number;
  notify_new_transactions: boolean;
  notify_balance_changes: boolean;
  notify_status_updates: boolean;
}

const MerchantAccountInfo = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState<MerchantInfo | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPayoutKey, setShowPayoutKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!user?.merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id, account_number, merchant_name, api_key, payout_key, callback_url, payin_fee, payout_fee, notify_new_transactions, notify_balance_changes, notify_status_updates')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setInfo(data);
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

  const handleToggle = async (field: keyof MerchantInfo, value: boolean) => {
    if (!info) return;
    
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ [field]: value })
        .eq('id', info.id);

      if (error) throw error;

      setInfo({ ...info, [field]: value });
      toast({ title: 'Success', description: 'Settings updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    return '•'.repeat(32);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Account Information</h1>
          <p className="text-muted-foreground">View your merchant account details and API credentials</p>
        </div>

        {/* Basic Information */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(174_62%_47%)/0.1] to-transparent p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/20">
                <Shield className="h-5 w-5 text-[hsl(var(--warning))]" />
              </div>
              <div>
                <h3 className="font-semibold">Basic Information</h3>
                <p className="text-sm text-muted-foreground">Your merchant account details</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : info && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Merchant Name</Label>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium">{info.merchant_name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Merchant ID (API)</Label>
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                      <p className="font-mono font-medium">{info.account_number}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(info.account_number, 'account')}
                      >
                        {copiedField === 'account' ? (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="text-[hsl(var(--success))]">%</span> Payin Fee (%)
                    </Label>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-bold text-[hsl(var(--success))]">{info.payin_fee}%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="text-[hsl(var(--warning))]">%</span> Payout Fee (%)
                    </Label>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-bold text-[hsl(var(--warning))]">{info.payout_fee}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    🔗 Callback URL
                  </Label>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-mono text-sm">{info.callback_url || 'Not configured'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(174_62%_47%)/0.1] to-transparent p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--success))]/20">
                <Key className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <h3 className="font-semibold">API Credentials</h3>
                <p className="text-sm text-muted-foreground">Your API keys for integration</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : info && (
              <>
                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">API Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-lg p-3">
                      <p className="font-mono text-sm text-[hsl(var(--warning))]">
                        {showApiKey ? info.api_key : maskKey(info.api_key)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => copyToClipboard(info.api_key, 'api')}
                    >
                      {copiedField === 'api' ? (
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Payout Key */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Payout Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-lg p-3">
                      <p className="font-mono text-sm text-[hsl(var(--warning))]">
                        {showPayoutKey ? info.payout_key : maskKey(info.payout_key)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setShowPayoutKey(!showPayoutKey)}
                    >
                      {showPayoutKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => copyToClipboard(info.payout_key, 'payout')}
                    >
                      {copiedField === 'payout' ? (
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(174_62%_47%)/0.1] to-transparent p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Control which real-time alerts you receive</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : info && (
              <>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">New Transactions</p>
                      <p className="text-xs text-muted-foreground">Get notified when a new deposit or withdrawal is initiated</p>
                    </div>
                  </div>
                  <Switch
                    checked={info.notify_new_transactions}
                    onCheckedChange={(checked) => handleToggle('notify_new_transactions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10">
                      <Wallet className="h-4 w-4 text-[hsl(var(--success))]" />
                    </div>
                    <div>
                      <p className="font-medium">Balance Changes</p>
                      <p className="text-xs text-muted-foreground">Get notified when your account balance changes</p>
                    </div>
                  </div>
                  <Switch
                    checked={info.notify_balance_changes}
                    onCheckedChange={(checked) => handleToggle('notify_balance_changes', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/10">
                      <CheckCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
                    </div>
                    <div>
                      <p className="font-medium">Transaction Status</p>
                      <p className="text-xs text-muted-foreground">Get notified when transactions succeed or fail</p>
                    </div>
                  </div>
                  <Switch
                    checked={info.notify_status_updates}
                    onCheckedChange={(checked) => handleToggle('notify_status_updates', checked)}
                  />
                </div>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Changes are saved automatically
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantAccountInfo;
