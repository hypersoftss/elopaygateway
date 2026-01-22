import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MerchantData {
  balance: number;
  frozenBalance: number;
  accountNumber: string;
}

interface DashboardStats {
  todayPayinCount: number;
  todayPayinAmount: number;
  todayPayoutCount: number;
  todayPayoutAmount: number;
  yesterdayPayinCount: number;
  yesterdayPayinAmount: number;
  yesterdayPayoutCount: number;
  yesterdayPayoutAmount: number;
}

interface Transaction {
  id: string;
  order_no: string;
  transaction_type: 'payin' | 'payout';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

const MerchantDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBalanceChange = useCallback((balance: number, frozenBalance: number) => {
    setMerchantData((prev) =>
      prev ? { ...prev, balance, frozenBalance } : null
    );
  }, []);

  useRealtimeBalance({
    merchantId: user?.merchantId || '',
    onBalanceChange: handleBalanceChange,
  });

  const fetchData = async () => {
    if (!user?.merchantId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch merchant data
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance, frozen_balance, account_number')
        .eq('id', user.merchantId)
        .single();

      if (merchantError) throw merchantError;

      setMerchantData({
        balance: Number(merchant.balance),
        frozenBalance: Number(merchant.frozen_balance),
        accountNumber: merchant.account_number,
      });

      // Fetch today's and yesterday's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount')
        .eq('merchant_id', user.merchantId)
        .gte('created_at', today.toISOString());

      const { data: yesterdayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount')
        .eq('merchant_id', user.merchantId)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      const todayPayin = todayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const todayPayout = todayTxns?.filter(tx => tx.transaction_type === 'payout') || [];
      const yesterdayPayin = yesterdayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const yesterdayPayout = yesterdayTxns?.filter(tx => tx.transaction_type === 'payout') || [];

      setStats({
        todayPayinCount: todayPayin.length,
        todayPayinAmount: todayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        todayPayoutCount: todayPayout.length,
        todayPayoutAmount: todayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
        yesterdayPayinCount: yesterdayPayin.length,
        yesterdayPayinAmount: yesterdayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        yesterdayPayoutCount: yesterdayPayout.length,
        yesterdayPayoutAmount: yesterdayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
      });

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, order_no, transaction_type, amount, status, created_at')
        .eq('merchant_id', user.merchantId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTransactions((transactions as Transaction[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.merchantId]);

  const copyMerchantId = () => {
    if (merchantData?.accountNumber) {
      navigator.clipboard.writeText(merchantData.accountNumber);
      toast({ title: 'Copied', description: 'Merchant ID copied to clipboard' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorBanner message={error} onRetry={fetchData} />
      </DashboardLayout>
    );
  }

  const totalBalance = (merchantData?.balance || 0) + (merchantData?.frozenBalance || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">
              Merchant ID: {merchantData?.accountNumber}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Balance Cards - 3 colored gradient cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Balance - Blue/Teal */}
          <Card className="bg-gradient-to-br from-[hsl(174_62%_47%)] to-[hsl(174_62%_35%)] border-0 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total Balance</p>
                  <p className="text-3xl font-bold mt-1">₹{totalBalance.toFixed(2)}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={copyMerchantId}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Balance - Teal/Green */}
          <Card className="bg-gradient-to-br from-[hsl(160_60%_40%)] to-[hsl(160_60%_30%)] border-0 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">Available Balance</p>
                  <p className="text-3xl font-bold mt-1">₹{merchantData?.balance.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-white/10 rounded-full">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frozen Balance - Orange */}
          <Card className="bg-gradient-to-br from-[hsl(25_95%_53%)] to-[hsl(25_95%_40%)] border-0 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">Frozen Balance</p>
                  <p className="text-3xl font-bold mt-1">₹{merchantData?.frozenBalance.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-white/10 rounded-full">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's and Yesterday's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Today's Pay-In */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="text-sm text-muted-foreground">Today's Pay-In</span>
                </div>
                <Badge variant="outline" className="text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0">DAY</Badge>
              </div>
              <p className="text-2xl font-bold">₹{stats?.todayPayinAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.todayPayinCount} transactions</p>
            </CardContent>
          </Card>

          {/* Yesterday's Pay-In */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-sm text-muted-foreground">Yesterday's Pay-In</span>
              </div>
              <p className="text-2xl font-bold">₹{stats?.yesterdayPayinAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.yesterdayPayinCount} transactions</p>
            </CardContent>
          </Card>

          {/* Today's Pay-Out */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--warning))]" />
                  <span className="text-sm text-muted-foreground">Today's Pay-Out</span>
                </div>
                <Badge variant="outline" className="text-xs bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0">DAY</Badge>
              </div>
              <p className="text-2xl font-bold">₹{stats?.todayPayoutAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.todayPayoutCount} transactions</p>
            </CardContent>
          </Card>

          {/* Yesterday's Pay-Out */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--warning))]" />
                <span className="text-sm text-muted-foreground">Yesterday's Pay-Out</span>
              </div>
              <p className="text-2xl font-bold">₹{stats?.yesterdayPayoutAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.yesterdayPayoutCount} transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.transaction_type === 'payin' ? 'bg-[hsl(var(--success))]/10' : 'bg-[hsl(var(--warning))]/10'}`}>
                        {tx.transaction_type === 'payin' ? (
                          <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--success))]" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--warning))]" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{tx.order_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.transaction_type === 'payin' ? 'Pay In' : 'Pay Out'} • {format(new Date(tx.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="outline" 
                        className={
                          tx.status === 'success' 
                            ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0' 
                            : tx.status === 'pending' 
                            ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0' 
                            : 'bg-destructive/10 text-destructive border-0'
                        }
                      >
                        {tx.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                      <span className={`font-semibold ${tx.transaction_type === 'payin' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}`}>
                        {tx.transaction_type === 'payin' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDashboard;
