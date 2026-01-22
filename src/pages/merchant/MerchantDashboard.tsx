import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Link as LinkIcon, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardSkeleton, TransactionRowSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MerchantData {
  balance: number;
  frozenBalance: number;
  payinFee: number;
  payoutFee: number;
}

interface DashboardStats {
  todayPayinCount: number;
  todayPayinAmount: number;
  todayPayoutCount: number;
  todayPayoutAmount: number;
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
        .select('balance, frozen_balance, payin_fee, payout_fee')
        .eq('id', user.merchantId)
        .single();

      if (merchantError) throw merchantError;

      setMerchantData({
        balance: Number(merchant.balance),
        frozenBalance: Number(merchant.frozen_balance),
        payinFee: Number(merchant.payin_fee),
        payoutFee: Number(merchant.payout_fee),
      });

      // Fetch today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount')
        .eq('merchant_id', user.merchantId)
        .gte('created_at', today.toISOString());

      const todayPayin = todayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const todayPayout = todayTxns?.filter(tx => tx.transaction_type === 'payout') || [];

      setStats({
        todayPayinCount: todayPayin.length,
        todayPayinAmount: todayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        todayPayoutCount: todayPayout.length,
        todayPayoutAmount: todayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcome')}, {user?.merchantName}
          </p>
        </div>

        {/* Balance Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t('merchants.balance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('dashboard.availableBalance')}</span>
                <span className="text-3xl font-bold">₹{merchantData?.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('dashboard.frozenBalance')}</span>
                <span className="text-xl text-yellow-600">₹{merchantData?.frozenBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/merchant/withdrawal">
                  <Wallet className="h-4 w-4 mr-2" />
                  {t('sidebar.withdrawal')}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/merchant/payment-links">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {t('sidebar.paymentLinks')}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/merchant/documentation">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('sidebar.documentation')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.todayPayin')}
              </CardTitle>
              <ArrowDownToLine className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.todayPayinAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats?.todayPayinCount} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.todayPayout')}
              </CardTitle>
              <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.todayPayoutAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats?.todayPayoutCount} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('merchants.payinFee')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchantData?.payinFee}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('merchants.payoutFee')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchantData?.payoutFee}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactions.orderNo')}</TableHead>
                  <TableHead>{t('transactions.type')}</TableHead>
                  <TableHead>{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">{tx.order_no}</TableCell>
                      <TableCell>
                        {tx.transaction_type === 'payin' ? t('transactions.payin') : t('transactions.payout')}
                      </TableCell>
                      <TableCell>₹{Number(tx.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDashboard;
