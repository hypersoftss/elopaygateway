import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  TrendingUp,
  Wallet,
  RefreshCw,
  ArrowRight,
  Radio,
  BarChart3,
  Clock,
  Activity,
  Server,
  Zap,
  Shield,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
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
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

interface ChartData {
  date: string;
  payin: number;
  payout: number;
  payinCount: number;
  payoutCount: number;
}

const CHART_COLORS = {
  payin: 'hsl(217.2 91.2% 59.8%)',
  payout: 'hsl(25 95% 53%)',
  success: 'hsl(142 70% 45%)',
  pending: 'hsl(38 92% 50%)',
  failed: 'hsl(0 72% 51%)',
};

const AdminDashboard = () => {
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{name: string; value: number; color: string}[]>([]);
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
      const sevenDaysAgo = subDays(today, 6);

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

      // Fetch all transactions for success rate and charts
      const { data: allTxns } = await supabase
        .from('transactions')
        .select('status, transaction_type, amount, created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Calculate stats
      const todayPayin = todayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const todayPayout = todayTxns?.filter(tx => tx.transaction_type === 'payout') || [];
      const yesterdayPayinData = yesterdayTxns?.filter(tx => tx.transaction_type === 'payin') || [];
      const yesterdayPayoutData = yesterdayTxns?.filter(tx => tx.transaction_type === 'payout') || [];

      const totalTxns = allTxns?.length || 0;
      const successTxns = allTxns?.filter(tx => tx.status === 'success')?.length || 0;
      const successRate = totalTxns > 0 ? (successTxns / totalTxns) * 100 : 0;

      // Status distribution for pie chart
      const successCount = allTxns?.filter(tx => tx.status === 'success')?.length || 0;
      const pendingCount = allTxns?.filter(tx => tx.status === 'pending')?.length || 0;
      const failedCount = allTxns?.filter(tx => tx.status === 'failed')?.length || 0;

      setStatusDistribution([
        { name: language === 'zh' ? '成功' : 'Success', value: successCount, color: CHART_COLORS.success },
        { name: language === 'zh' ? '处理中' : 'Pending', value: pendingCount, color: CHART_COLORS.pending },
        { name: language === 'zh' ? '失败' : 'Failed', value: failedCount, color: CHART_COLORS.failed },
      ]);

      // Generate chart data for last 7 days
      const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });
      const chartDataMap: ChartData[] = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const dayTxns = allTxns?.filter(tx => {
          const txDate = new Date(tx.created_at);
          return txDate >= dayStart && txDate < dayEnd;
        }) || [];

        const payinTxns = dayTxns.filter(tx => tx.transaction_type === 'payin');
        const payoutTxns = dayTxns.filter(tx => tx.transaction_type === 'payout');

        return {
          date: format(day, 'MM/dd'),
          payin: payinTxns.reduce((sum, tx) => sum + Number(tx.amount), 0),
          payout: payoutTxns.reduce((sum, tx) => sum + Number(tx.amount), 0),
          payinCount: payinTxns.length,
          payoutCount: payoutTxns.length,
        };
      });

      setChartData(chartDataMap);

      setStats({
        totalMerchants,
        activeMerchants,
        todayPayinCount: todayPayin.length,
        todayPayinAmount: todayPayin.reduce((sum, tx) => sum + Number(tx.amount), 0),
        todayPayoutCount: todayPayout.length,
        todayPayoutAmount: todayPayout.reduce((sum, tx) => sum + Number(tx.amount), 0),
        totalBalance,
        yesterdayPayin: yesterdayPayinData.reduce((sum, tx) => sum + Number(tx.amount), 0),
        yesterdayPayout: yesterdayPayoutData.reduce((sum, tx) => sum + Number(tx.amount), 0),
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
        .limit(8);

      setRecentTransactions((transactions as unknown as Transaction[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(fetchData, 30000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          if (isLive) fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">₹{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
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

  const netFlow = (stats?.yesterdayPayin || 0) - (stats?.yesterdayPayout || 0);
  const payinChange = stats?.yesterdayPayin ? ((stats.todayPayinAmount - stats.yesterdayPayin) / stats.yesterdayPayin * 100) : 0;
  const payoutChange = stats?.yesterdayPayout ? ((stats.todayPayoutAmount - stats.yesterdayPayout) / stats.yesterdayPayout * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-blue-600 p-4 md:p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">{t('dashboard.title')}</h1>
                <p className="text-white/80 text-xs md:text-sm mt-0.5">
                  {language === 'zh' ? '欢迎回来！这是您的业务概览。' : "Welcome back! Here's your business overview."}
                </p>
              </div>
              {isLive && (
                <Badge className="bg-green-400/90 text-green-900 hover:bg-green-400 animate-pulse text-xs">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={fetchData} 
                className="bg-white/20 hover:bg-white/30 border-0 text-white h-8 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {t('common.refresh')}
              </Button>
              <Button
                variant={isLive ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className={`h-8 text-xs ${isLive ? "bg-green-400/90 text-green-900 hover:bg-green-500 border-0" : "bg-white/20 hover:bg-white/30 border-0 text-white"}`}
              >
                <Radio className="h-3.5 w-3.5 mr-1.5" />
                {isLive ? (language === 'zh' ? '实时中' : 'Live ON') : (language === 'zh' ? '已暂停' : 'Paused')}
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Today's Pay-In */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground font-medium">{t('dashboard.todayPayin')}</p>
                  <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <ArrowDownToLine className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate">₹{stats?.todayPayinAmount.toLocaleString()}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] md:text-xs">
                    {stats?.todayPayinCount} {language === 'zh' ? '笔' : 'txns'}
                  </Badge>
                  {payinChange !== 0 && (
                    <div className={`flex items-center text-[10px] ${payinChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {payinChange > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                      {Math.abs(payinChange).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Pay-Out */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground font-medium">{t('dashboard.todayPayout')}</p>
                  <div className="p-1.5 md:p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                    <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate text-orange-500">₹{stats?.todayPayoutAmount.toLocaleString()}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] md:text-xs bg-orange-500/10 text-orange-600">
                    {stats?.todayPayoutCount} {language === 'zh' ? '笔' : 'txns'}
                  </Badge>
                  {payoutChange !== 0 && (
                    <div className={`flex items-center text-[10px] ${payoutChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {payoutChange > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                      {Math.abs(payoutChange).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Balance */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground font-medium">{t('dashboard.totalBalance')}</p>
                  <div className="p-1.5 md:p-2 bg-teal-500/10 rounded-lg group-hover:bg-teal-500/20 transition-colors">
                    <Wallet className="h-4 w-4 text-teal-500" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate text-teal-500">₹{stats?.totalBalance.toLocaleString()}</p>
                <Badge variant="secondary" className="text-[10px] md:text-xs bg-teal-500/10 text-teal-600 w-fit">
                  {language === 'zh' ? '所有商户' : 'All merchants'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Merchants */}
          <Card className="premium-card overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground font-medium">{t('dashboard.totalMerchants')}</p>
                  <div className="p-1.5 md:p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold text-purple-500">{stats?.totalMerchants}</p>
                <Badge variant="secondary" className="text-[10px] md:text-xs bg-purple-500/10 text-purple-600 w-fit">
                  {stats?.activeMerchants} {language === 'zh' ? '活跃' : 'active'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Volume Trend Chart */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    {language === 'zh' ? '7日交易趋势' : '7-Day Volume Trend'}
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {language === 'zh' ? '代收与代付交易金额趋势' : 'Pay-in and Pay-out volume trends'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="h-[200px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payinGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.payin} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.payin} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.payout} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.payout} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      className="fill-muted-foreground"
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="payin"
                      name={language === 'zh' ? '代收' : 'Pay-in'}
                      stroke={CHART_COLORS.payin}
                      strokeWidth={2}
                      fill="url(#payinGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="payout"
                      name={language === 'zh' ? '代付' : 'Pay-out'}
                      stroke={CHART_COLORS.payout}
                      strokeWidth={2}
                      fill="url(#payoutGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution Pie */}
          <Card className="glass-card">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                {language === 'zh' ? '状态分布' : 'Status Distribution'}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {language === 'zh' ? '7日交易状态统计' : 'Last 7 days transaction status'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="h-[180px] md:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, language === 'zh' ? '笔' : 'txns']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Count Bar Chart */}
        <Card className="glass-card">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              {language === 'zh' ? '每日交易笔数' : 'Daily Transaction Count'}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {language === 'zh' ? '7日交易笔数统计' : 'Transaction count for the last 7 days'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-[180px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                  <Bar 
                    dataKey="payinCount" 
                    name={language === 'zh' ? '代收' : 'Pay-in'} 
                    fill={CHART_COLORS.payin} 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="payoutCount" 
                    name={language === 'zh' ? '代付' : 'Pay-out'} 
                    fill={CHART_COLORS.payout} 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Yesterday's Summary */}
          <Card className="glass-card border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" />
                {language === 'zh' ? '昨日汇总' : "Yesterday"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] md:text-xs text-muted-foreground">{t('transactions.payin')}</span>
                <span className="text-xs md:text-sm font-semibold text-primary">+₹{stats?.yesterdayPayin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] md:text-xs text-muted-foreground">{t('transactions.payout')}</span>
                <span className="text-xs md:text-sm font-semibold text-orange-500">-₹{stats?.yesterdayPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-[10px] md:text-xs font-medium">{language === 'zh' ? '净流入' : 'Net'}</span>
                <span className={`text-xs md:text-sm font-bold ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {netFlow >= 0 ? '+' : ''}₹{netFlow.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payouts */}
          <Link to="/admin/withdrawals">
            <Card className="glass-card border-l-4 border-l-yellow-500 group cursor-pointer hover:shadow-lg transition-all h-full">
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500" />
                  {language === 'zh' ? '待审批代付' : 'Pending Payouts'}
                  {(stats?.pendingPayouts || 0) > 0 && (
                    <Badge variant="destructive" className="animate-pulse ml-auto text-[10px]">
                      {stats?.pendingPayouts}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-xl md:text-2xl font-bold text-yellow-500">{stats?.pendingPayouts}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  ₹{stats?.pendingPayoutsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[10px] md:text-xs text-primary group-hover:underline">
                  {language === 'zh' ? '立即处理' : 'Process now'}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Merchant Withdrawals */}
          <Link to="/admin/withdrawals">
            <Card className="glass-card border-l-4 border-l-purple-500 group cursor-pointer hover:shadow-lg transition-all h-full">
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-500" />
                  {language === 'zh' ? '商户提现' : 'Withdrawals'}
                  {(stats?.pendingWithdrawals || 0) > 0 && (
                    <Badge className="bg-purple-500 ml-auto text-[10px]">
                      {stats?.pendingWithdrawals}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-xl md:text-2xl font-bold text-purple-500">{stats?.pendingWithdrawals}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  ₹{stats?.pendingWithdrawalsAmount.toLocaleString()} {language === 'zh' ? '待处理' : 'pending'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[10px] md:text-xs text-primary group-hover:underline">
                  {language === 'zh' ? '管理' : 'Manage'}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Success Rate */}
          <Card className="glass-card border-l-4 border-l-green-500">
            <CardHeader className="pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
                {language === 'zh' ? '成功率' : 'Success Rate'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-green-500">{stats?.successRate.toFixed(1)}%</div>
              <Progress value={stats?.successRate || 0} className="mt-2 h-1.5 md:h-2" />
              <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                {language === 'zh' ? '总体交易成功率' : 'Overall success'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <div>
              <CardTitle className="text-base md:text-lg">{t('dashboard.recentTransactions')}</CardTitle>
              <CardDescription className="text-xs md:text-sm">{language === 'zh' ? '最近8笔交易记录' : 'Last 8 transactions'}</CardDescription>
            </div>
            <Link to="/admin/payin">
              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                {language === 'zh' ? '查看全部' : 'View All'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t('common.noData')}</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 md:p-2 rounded-full shrink-0 ${
                        tx.transaction_type === 'payin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {tx.transaction_type === 'payin' 
                          ? <ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          : <ArrowUpFromLine className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs md:text-sm truncate">{tx.merchants?.merchant_name || 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <p className="text-[10px] md:text-xs text-muted-foreground font-mono">{tx.order_no.slice(0, 10)}...</p>
                          <Badge variant="outline" className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0 ${
                            tx.transaction_type === 'payin' ? 'border-primary/50 text-primary' : 'border-orange-500/50 text-orange-500'
                          }`}>
                            {tx.transaction_type === 'payin' ? 'IN' : 'OUT'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`font-semibold text-xs md:text-sm ${
                          tx.transaction_type === 'payin' ? 'text-primary' : 'text-orange-500'
                        }`}>
                          {tx.transaction_type === 'payin' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
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
