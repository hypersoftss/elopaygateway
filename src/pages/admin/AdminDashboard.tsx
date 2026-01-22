import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  TrendingUp,
  Wallet,
  CircleDollarSign,
  RefreshCw,
  ArrowRight,
  Radio,
  BarChart3,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  totalMerchants: number;
  activeMerchants: number;
  todayPayinCount: number;
  todayPayinAmount: number;
  todayPayoutCount: number;
  todayPayoutAmount: number;
  totalBalance: number;
  yesterdayPayin: number;
  yesterdayPayout: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
  successRate: number;
}

interface Transaction {
  id: string;
  order_no: string;
  transaction_type: 'payin' | 'payout';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  extra: string | null;
  merchants: {
    merchant_name: string;
  } | null;
}

const AdminDashboard = () => {
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = subDays(today, 1);

      // Fetch merchants
      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, is_active, balance');

      const totalMerchants = merchants?.length || 0;
      const activeMerchants = merchants?.filter(m => m.is_active)?.length || 0;
      const totalBalance = merchants?.reduce((sum, m) => sum + Number(m.balance || 0), 0) || 0;

      // Fetch today's transactions
      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount, status')
        .gte('created_at', today.toISOString());

      // Fetch yesterday's transactions
      const { data: yesterdayTxns } = await supabase
        .from('transactions')
        .select('transaction_type, amount, status')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Fetch pending payouts
      const { data: pendingPayouts } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'payout')
        .eq('status', 'pending');

      // Fetch all transactions for success rate
      const { data: allTxns } = await supabase
        .from('transactions')
        .select('status');

      // Calculate stats
      const todayPayin = todayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const todayPayout = todayTxns?.filter(tx => tx.transaction_type === 'payout') || [];
      const yesterdayPayin = yesterdayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const yesterdayPayout = yesterdayTxns?.filter(tx => tx.transaction_type === 'payout') || [];

      const totalTxns = allTxns?.length || 0;
      const successTxns = allTxns?.filter(tx => tx.status === 'success')?.length || 0;
      const successRate = totalTxns > 0 ? (successTxns / totalTxns) * 100 : 0;

      setStats({
        totalMerchants,
        activeMerchants,
        todayPayinCount: todayPayin.length,
        todayPayinAmount: todayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        todayPayoutCount: todayPayout.length,
        todayPayoutAmount: todayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
        totalBalance,
        yesterdayPayin: yesterdayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        yesterdayPayout: yesterdayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
        pendingPayouts: pendingPayouts?.length || 0,
        pendingPayoutsAmount: pendingPayouts?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0,
        successRate,
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
          extra,
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
    
    // Auto refresh every 30 seconds if live mode
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(fetchData, 30000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

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

  const netFlow = (stats?.yesterdayPayin || 0) - (stats?.yesterdayPayout || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {language === 'zh' ? '欢迎回来！这是您的业务概览。' : "Welcome back! Here's your business overview."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Radio className="h-4 w-4 mr-2" />
              {language === 'zh' ? '实时数据' : 'Live Data'}
            </Button>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Pay-In */}
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.todayPayin')}</p>
                  <p className="text-3xl font-bold mt-2">₹{stats?.todayPayinAmount.toLocaleString()}</p>
                  <p className="text-sm opacity-80 mt-1">{stats?.todayPayinCount} {t('common.transactions')}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <ArrowDownToLine className="h-6 w-6" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <CircleDollarSign className="h-24 w-24 -mb-4 -mr-4" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Pay-Out */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.todayPayout')}</p>
                  <p className="text-3xl font-bold mt-2">₹{stats?.todayPayoutAmount.toLocaleString()}</p>
                  <p className="text-sm opacity-80 mt-1">{stats?.todayPayoutCount} {t('common.transactions')}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <ArrowUpFromLine className="h-6 w-6" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <CircleDollarSign className="h-24 w-24 -mb-4 -mr-4" />
              </div>
            </CardContent>
          </Card>

          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.totalBalance')}</p>
                  <p className="text-3xl font-bold mt-2">₹{stats?.totalBalance.toLocaleString()}</p>
                  <p className="text-sm opacity-80 mt-1">{language === 'zh' ? '所有商户余额' : 'All merchant balances'}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <Wallet className="h-24 w-24 -mb-4 -mr-4" />
              </div>
            </CardContent>
          </Card>

          {/* Total Merchants */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.totalMerchants')}</p>
                  <p className="text-3xl font-bold mt-2">{stats?.totalMerchants}</p>
                  <p className="text-sm opacity-80 mt-1">{stats?.activeMerchants} {language === 'zh' ? '活跃' : 'active'}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <Users className="h-24 w-24 -mb-4 -mr-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Yesterday's Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {language === 'zh' ? '昨日汇总' : "Yesterday's Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('transactions.payin')}</span>
                <span className="font-medium text-primary">₹{stats?.yesterdayPayin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('transactions.payout')}</span>
                <span className="font-medium text-orange-500">₹{stats?.yesterdayPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm font-medium">{language === 'zh' ? '净流入' : 'Net Flow'}</span>
                <span className={`font-bold ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{netFlow.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payouts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                {language === 'zh' ? '待处理提现' : 'Pending Payouts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{stats?.pendingPayouts}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'zh' ? '总计:' : 'Total:'} ₹{stats?.pendingPayoutsAmount.toLocaleString()}
              </p>
              <Link to="/admin/payout" className="text-sm text-primary hover:underline flex items-center gap-1 mt-3">
                {language === 'zh' ? '管理提现' : 'Manage Payouts'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {language === 'zh' ? '成功率' : 'Success Rate'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats?.successRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'zh' ? '交易成功率' : 'Transaction success rate'}
              </p>
              <Progress value={stats?.successRate || 0} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
            <Link to="/admin/payin">
              <Button variant="ghost" size="sm">
                {language === 'zh' ? '查看全部' : 'View All'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        tx.transaction_type === 'payin' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {tx.transaction_type === 'payin' 
                          ? <ArrowDownToLine className="h-4 w-4" /> 
                          : <ArrowUpFromLine className="h-4 w-4" />
                        }
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{tx.order_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.extra || tx.merchants?.merchant_name} • {format(new Date(tx.created_at), 'MM/dd/yyyy, HH:mm:ss a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${
                        tx.transaction_type === 'payin' ? 'text-green-500' : 'text-orange-500'
                      }`}>
                        {tx.transaction_type === 'payin' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                      </span>
                      <StatusBadge status={tx.status} />
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

export default AdminDashboard;