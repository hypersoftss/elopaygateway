import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';

interface MerchantFees {
  payin_fee: number;
  payout_fee: number;
}

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

  const exampleAmount = 1000;
  const payinFeeAmount = (exampleAmount * fees.payin_fee) / 100;
  const payinNetAmount = exampleAmount - payinFeeAmount;
  const payoutFeeAmount = (exampleAmount * fees.payout_fee) / 100;
  const payoutTotalDeduction = exampleAmount + payoutFeeAmount;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Channel Price</h1>
          <p className="text-muted-foreground">View your current transaction fee rates</p>
        </div>

        {/* Fee Cards - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pay-In (Collection) */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[hsl(var(--success))]/20 to-transparent p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--success))]/20">
                  <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <h3 className="font-semibold">Pay-In (Collection)</h3>
                  <p className="text-sm text-muted-foreground">Fee for incoming payments</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="text-center mb-6">
                    <p className="text-5xl font-bold text-[hsl(var(--success))]">{fees.payin_fee} %</p>
                    <p className="text-sm text-muted-foreground mt-2">Deducted from each successful collection</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-[hsl(var(--warning))]">Example Calculation:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collection Amount:</span>
                      <span>₹{exampleAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="text-destructive">-₹{payinFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="font-medium text-[hsl(var(--success))]">Net Amount:</span>
                      <span className="font-bold text-[hsl(var(--success))]">₹{payinNetAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pay-Out (Withdrawal) */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[hsl(var(--warning))]/20 to-transparent p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/20">
                  <TrendingDown className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <h3 className="font-semibold">Pay-Out (Withdrawal)</h3>
                  <p className="text-sm text-muted-foreground">Fee for outgoing payments</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="text-center mb-6">
                    <p className="text-5xl font-bold text-[hsl(var(--warning))]">{fees.payout_fee} %</p>
                    <p className="text-sm text-muted-foreground mt-2">Added to each withdrawal request</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-[hsl(var(--warning))]">Example Calculation:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Withdrawal Amount:</span>
                      <span>₹{exampleAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="text-[hsl(var(--success))]">+₹{payoutFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="font-medium text-[hsl(var(--warning))]">Total Deduction:</span>
                      <span className="font-bold text-[hsl(var(--warning))]">₹{payoutTotalDeduction.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* About Fee Rates */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--success))]/20">
                <IndianRupee className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <h3 className="font-semibold">About Fee Rates</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fee rates are set by the administrator and may vary based on your transaction volume and agreement. Contact support if you have questions about your rates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantChannelPrice;
