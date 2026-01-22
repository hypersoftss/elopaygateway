import { useState, useEffect } from 'react';
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardSkeleton, TransactionRowSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardStats {
  totalMerchants: number;
  todayPayinCount: number;
  todayPayinAmount: number;
  todayPayoutCount: number;
  todayPayoutAmount: number;
  totalVolume: number;
}

interface Transaction {
  id: string;
  order_no: string;
  transaction_type: 'payin' | 'payout';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  merchants: {
    merchant_name: string;
  } | null;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch merchants count
      const { count: merchantsCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true });

      // Fetch today's transactions
      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount, status')
        .gte('created_at', today.toISOString());

      // Fetch all transactions for total volume
      const { data: allTxns } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('status', 'success');

      // Calculate stats
      const todayPayin = todayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const todayPayout = todayTxns?.filter(tx => tx.transaction_type === 'payout') || [];

      setStats({
        totalMerchants: merchantsCount || 0,
        todayPayinCount: todayPayin.length,
        todayPayinAmount: todayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        todayPayoutCount: todayPayout.length,
        todayPayoutAmount: todayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
        totalVolume: allTxns?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0,
      });

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          order_no,
          transaction_type,
          amount,
          status,
          created_at,
          merchants (
            merchant_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTransactions((transactions as unknown as Transaction[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.totalMerchants')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMerchants}</div>
            </CardContent>
          </Card>

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
                {t('dashboard.totalVolume')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.totalVolume.toFixed(2)}</div>
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
                  <TableHead>{t('merchants.name')}</TableHead>
                  <TableHead>{t('transactions.type')}</TableHead>
                  <TableHead>{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">{tx.order_no}</TableCell>
                      <TableCell>{tx.merchants?.merchant_name || '-'}</TableCell>
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

export default AdminDashboard;
