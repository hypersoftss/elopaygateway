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
  Shield,
  Zap,
  Globe,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('dashboard.title')}</h1>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'zh' ? '欢迎回来！这是您的业务概览。' : "Welcome back! Here's your business overview."}
                </p>
              </div>
              {isLive && (
                <Badge className="bg-green-400 text-green-900 hover:bg-green-400 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={fetchData} className="bg-white/20 hover:bg-white/30 border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
              <Button
                variant={isLive ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className={isLive ? "bg-green-400 text-green-900 hover:bg-green-500" : "bg-white/20 hover:bg-white/30 border-white/20 text-white"}
              >
                <Radio className="h-4 w-4 mr-2" />
                {language === 'zh' ? '实时' : 'Live'}
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Stats Cards - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Pay-In */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{t('dashboard.todayPayin')}</p>
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <ArrowDownToLine className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate">₹{stats?.todayPayinAmount.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {stats?.todayPayinCount} {language === 'zh' ? '笔' : 'txns'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Pay-Out */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{t('dashboard.todayPayout')}</p>
                  <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                    <ArrowUpFromLine className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate text-orange-500">₹{stats?.todayPayoutAmount.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">
                    {stats?.todayPayoutCount} {language === 'zh' ? '笔' : 'txns'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Balance */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{t('dashboard.totalBalance')}</p>
                  <div className="p-2 bg-teal-500/10 rounded-lg group-hover:bg-teal-500/20 transition-colors">
                    <Wallet className="h-4 w-4 md:h-5 md:w-5 text-teal-500" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold truncate text-teal-500">₹{stats?.totalBalance.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-teal-500/10 text-teal-600">
                    {language === 'zh' ? '所有商户' : 'All merchants'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Merchants */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{t('dashboard.totalMerchants')}</p>
                  <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-500">{stats?.totalMerchants}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
                    {stats?.activeMerchants} {language === 'zh' ? '活跃' : 'active'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Yesterday's Summary */}
          <Card className="glass-card border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                {language === 'zh' ? '昨日汇总' : "Yesterday"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('transactions.payin')}</span>
                <span className="text-sm font-semibold text-primary">+₹{stats?.yesterdayPayin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('transactions.payout')}</span>
                <span className="text-sm font-semibold text-orange-500">-₹{stats?.yesterdayPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs font-medium">{language === 'zh' ? '净流入' : 'Net'}</span>
                <span className={`text-sm font-bold ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {netFlow >= 0 ? '+' : ''}₹{netFlow.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payouts */}
          <Card className="glass-card border-l-4 border-l-yellow-500 group cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/admin/withdrawals">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-500" />
                  {language === 'zh' ? '待审批代付' : 'Pending Payouts'}
                  {(stats?.pendingPayouts || 0) > 0 && (
                    <Badge variant="destructive" className="animate-pulse ml-auto">
                      {stats?.pendingPayouts}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-yellow-500">{stats?.pendingPayouts}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{stats?.pendingPayoutsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-primary group-hover:underline">
                  {language === 'zh' ? '立即处理' : 'Process now'}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Merchant Withdrawals */}
          <Card className="glass-card border-l-4 border-l-purple-500 group cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/admin/withdrawals">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-500" />
                  {language === 'zh' ? '商户提现' : 'Withdrawals'}
                  {(stats?.pendingWithdrawals || 0) > 0 && (
                    <Badge className="bg-purple-500 ml-auto">
                      {stats?.pendingWithdrawals}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-purple-500">{stats?.pendingWithdrawals}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{stats?.pendingWithdrawalsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-primary group-hover:underline">
                  {language === 'zh' ? '管理' : 'Manage'}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Success Rate */}
          <Card className="glass-card border-l-4 border-l-green-500">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {language === 'zh' ? '成功率' : 'Success Rate'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-green-500">{stats?.successRate.toFixed(1)}%</div>
              <Progress value={stats?.successRate || 0} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'zh' ? '总体交易成功率' : 'Overall success'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <div>
              <CardTitle className="text-lg">{t('dashboard.recentTransactions')}</CardTitle>
              <CardDescription>{language === 'zh' ? '最近10笔交易记录' : 'Last 10 transactions'}</CardDescription>
            </div>
            <Link to="/admin/payin">
              <Button variant="outline" size="sm" className="gap-1">
                {language === 'zh' ? '查看全部' : 'View All'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t('common.noData')}</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-full shrink-0 ${
                        tx.transaction_type === 'payin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {tx.transaction_type === 'payin' 
                          ? <ArrowDownToLine className="h-4 w-4" />
                          : <ArrowUpFromLine className="h-4 w-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tx.merchants?.merchant_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground font-mono">{tx.order_no.slice(0, 12)}...</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            tx.transaction_type === 'payin' ? 'border-primary/50 text-primary' : 'border-orange-500/50 text-orange-500'
                          }`}>
                            {tx.transaction_type === 'payin' ? 'IN' : 'OUT'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${
                          tx.transaction_type === 'payin' ? 'text-primary' : 'text-orange-500'
                        }`}>
                          {tx.transaction_type === 'payin' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'HH:mm')}
                        </p>
                      </div>
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
