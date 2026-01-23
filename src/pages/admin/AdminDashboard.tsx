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
  Clock,
  Activity,
  Shield
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
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
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

      // Fetch pending payouts (BondPay)
      const { data: pendingPayouts } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'payout')
        .eq('status', 'pending')
        .is('extra', null);

      // Fetch pending withdrawals (Merchant)
      const { data: pendingWithdrawals } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'payout')
        .eq('status', 'pending')
        .eq('extra', 'withdrawal');

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
        pendingWithdrawals: pendingWithdrawals?.length || 0,
        pendingWithdrawalsAmount: pendingWithdrawals?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0,
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
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {language === 'zh' ? '欢迎回来！这是您的业务概览。' : "Welcome back! Here's your business overview."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={`flex-1 sm:flex-none ${isLive ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              <Radio className="h-4 w-4 mr-2" />
              {language === 'zh' ? '实时' : 'Live'}
            </Button>
          </div>
        </div>

        {/* Top Stats Cards - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Today's Pay-In */}
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm opacity-80">{t('dashboard.todayPayin')}</p>
                  <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                    <ArrowDownToLine className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate">₹{stats?.todayPayinAmount.toLocaleString()}</p>
                <p className="text-xs opacity-80">{stats?.todayPayinCount} {language === 'zh' ? '笔' : 'txns'}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <CircleDollarSign className="h-16 w-16 md:h-20 md:w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Pay-Out */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm opacity-80">{t('dashboard.todayPayout')}</p>
                  <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                    <ArrowUpFromLine className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate">₹{stats?.todayPayoutAmount.toLocaleString()}</p>
                <p className="text-xs opacity-80">{stats?.todayPayoutCount} {language === 'zh' ? '笔' : 'txns'}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <CircleDollarSign className="h-16 w-16 md:h-20 md:w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white overflow-hidden relative">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm opacity-80">{t('dashboard.totalBalance')}</p>
                  <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                    <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate">₹{stats?.totalBalance.toLocaleString()}</p>
                <p className="text-xs opacity-80">{language === 'zh' ? '所有商户' : 'All merchants'}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <Wallet className="h-16 w-16 md:h-20 md:w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Total Merchants */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm opacity-80">{t('dashboard.totalMerchants')}</p>
                  <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold">{stats?.totalMerchants}</p>
                <p className="text-xs opacity-80">{stats?.activeMerchants} {language === 'zh' ? '活跃' : 'active'}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <Users className="h-16 w-16 md:h-20 md:w-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Yesterday's Summary */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                {language === 'zh' ? '昨日汇总' : "Yesterday"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('transactions.payin')}</span>
                <span className="text-sm font-medium text-primary">₹{stats?.yesterdayPayin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('transactions.payout')}</span>
                <span className="text-sm font-medium text-orange-500">₹{stats?.yesterdayPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs font-medium">{language === 'zh' ? '净流入' : 'Net'}</span>
                <span className={`text-sm font-bold ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{netFlow.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Merchant Withdrawals */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-500" />
                {language === 'zh' ? '商户提现' : 'Withdrawals'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-purple-500">{stats?.pendingWithdrawals}</div>
              <p className="text-xs text-muted-foreground">
                ₹{stats?.pendingWithdrawalsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
              </p>
              <Link to="/admin/withdrawals" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                {language === 'zh' ? '管理' : 'Manage'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Pending BondPay Payouts */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-yellow-500" />
                {language === 'zh' ? 'BondPay代付' : 'BondPay'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingPayouts}</div>
              <p className="text-xs text-muted-foreground">
                ₹{stats?.pendingPayoutsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
              </p>
              <Link to="/admin/payout" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                {language === 'zh' ? '管理' : 'Manage'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                {language === 'zh' ? '成功率' : 'Success Rate'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-green-500">{stats?.successRate.toFixed(1)}%</div>
              <Progress value={stats?.successRate || 0} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'zh' ? '总体交易成功率' : 'Overall success'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-4">
            <CardTitle className="text-base md:text-lg">{t('dashboard.recentTransactions')}</CardTitle>
            <Link to="/admin/payin">
              <Button variant="ghost" size="sm">
                {language === 'zh' ? '查看全部' : 'View All'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 md:p-2 rounded-full shrink-0 ${
                        tx.transaction_type === 'payin' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {tx.transaction_type === 'payin' 
                          ? <ArrowDownToLine className="h-3 w-3 md:h-4 md:w-4" /> 
                          : <ArrowUpFromLine className="h-3 w-3 md:h-4 md:w-4" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs md:text-sm font-medium truncate">{tx.order_no}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            tx.transaction_type === 'payin' 
                              ? 'bg-green-500/10 text-green-600' 
                              : 'bg-orange-500/10 text-orange-600'
                          }`}>
                            {tx.transaction_type === 'payin' ? 'IN' : 'OUT'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.merchants?.merchant_name} • {format(new Date(tx.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <span className={`text-xs md:text-sm font-semibold ${
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