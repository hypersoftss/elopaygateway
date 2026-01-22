import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowDownToLine, ArrowUpFromLine, Percent, CreditCard, Smartphone, Building2, Wallet } from 'lucide-react';

interface MerchantFees {
  payin_fee: number;
  payout_fee: number;
}

const channels = [
  { 
    id: 'upi', 
    name: 'UPI', 
    icon: Smartphone, 
    description: 'Unified Payments Interface',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
  },
  { 
    id: 'imps', 
    name: 'IMPS', 
    icon: Building2, 
    description: 'Immediate Payment Service',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
  { 
    id: 'neft', 
    name: 'NEFT', 
    icon: CreditCard, 
    description: 'National Electronic Funds Transfer',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
  },
  { 
    id: 'usdt', 
    name: 'USDT TRC20', 
    icon: Wallet, 
    description: 'Tether on Tron Network',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
  },
];

const MerchantChannelPrice = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [fees, setFees] = useState<MerchantFees>({ payin_fee: 0, payout_fee: 0 });

  useEffect(() => {
    const fetchFees = async () => {
      if (!user?.merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('payin_fee, payout_fee')
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;
        setFees(data);
      } catch (error) {
        console.error('Error fetching fees:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFees();
  }, [user?.merchantId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
            <DollarSign className="h-6 w-6 text-[hsl(var(--success))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('merchant.channelPrice')}</h1>
            <p className="text-sm text-muted-foreground">{t('merchant.channelPriceDesc')}</p>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="stat-card border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.yourPayinFee')}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--success))]">{fees.payin_fee}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('merchant.chargedOnDeposits')}</p>
                  </div>
                  <div className="p-4 rounded-full bg-[hsl(var(--success))]/10">
                    <ArrowDownToLine className="h-6 w-6 text-[hsl(var(--success))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="stat-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.yourPayoutFee')}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--warning))]">{fees.payout_fee}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('merchant.chargedOnWithdrawals')}</p>
                  </div>
                  <div className="p-4 rounded-full bg-[hsl(var(--warning))]/10">
                    <ArrowUpFromLine className="h-6 w-6 text-[hsl(var(--warning))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Channel Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{t('merchant.availableChannels')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Card key={channel.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className={`h-2 bg-gradient-to-r ${channel.color}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${channel.bgColor}`}>
                          <Icon className={`h-6 w-6 ${channel.textColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{channel.name}</CardTitle>
                          <CardDescription>{channel.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[hsl(var(--success))] border-[hsl(var(--success))]">
                        {t('common.active')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <ArrowDownToLine className="h-4 w-4" />
                          {t('merchant.payin')}
                        </div>
                        {isLoading ? (
                          <Skeleton className="h-6 w-16" />
                        ) : (
                          <p className="text-xl font-bold text-[hsl(var(--success))]">{fees.payin_fee}%</p>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <ArrowUpFromLine className="h-4 w-4" />
                          {t('merchant.payout')}
                        </div>
                        {isLoading ? (
                          <Skeleton className="h-6 w-16" />
                        ) : (
                          <p className="text-xl font-bold text-[hsl(var(--warning))]">{fees.payout_fee}%</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('merchant.feeInfo')}</h3>
                <p className="text-sm text-muted-foreground">{t('merchant.feeInfoDesc')}</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>• {t('merchant.feeNote1')}</li>
                  <li>• {t('merchant.feeNote2')}</li>
                  <li>• {t('merchant.feeNote3')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantChannelPrice;
