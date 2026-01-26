import { useState, useEffect, useCallback } from 'react';
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
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle
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
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
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

interface Gateway {
  id: string;
  gateway_name: string;
  gateway_code: string;
  gateway_type: string;
  currency: string;
  is_active: boolean;
  trade_type: string | null;
}

interface GatewayBalance {
  gateway_id: string;
  gateway_name: string;
  gateway_code: string;
  currency: string;
  balance: number | null;
  status: 'online' | 'offline' | 'error';
  message: string;
  last_checked: string;
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
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gatewayBalances, setGatewayBalances] = useState<GatewayBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  // Real-time transaction notifications
  const handleNewTransaction = useCallback((tx: any) => {
    // Add to recent transactions list at the top
    setRecentTransactions(prev => [tx, ...prev.slice(0, 9)]);
    
    // Update today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const txDate = new Date(tx.created_at);
    
    if (txDate >= today) {
      setStats(prev => {
        if (!prev) return prev;
        if (tx.transaction_type === 'payin') {
          return {
            ...prev,
            todayPayinCount: prev.todayPayinCount + 1,
            todayPayinAmount: prev.todayPayinAmount + Number(tx.amount),
          };
        } else {
          return {
            ...prev,
            todayPayoutCount: prev.todayPayoutCount + 1,
            todayPayoutAmount: prev.todayPayoutAmount + Number(tx.amount),
          };
        }
      });
    }
  }, []);

  const handleTransactionUpdate = useCallback((tx: any) => {
    // Update the transaction in the list
    setRecentTransactions(prev => 
      prev.map(t => t.id === tx.id ? { ...t, ...tx } : t)
    );
  }, []);

  // Subscribe to real-time transactions for admin (all transactions)
  useRealtimeTransactions({
    onNewTransaction: handleNewTransaction,
    onTransactionUpdate: handleTransactionUpdate,
    isAdmin: true,
  });

  const fetchGatewayBalances = async () => {
    setIsLoadingBalances(true);
    try {
      const response = await supabase.functions.invoke('check-gateway-balance');
      if (response.data?.success && response.data?.balances) {
        setGatewayBalances(response.data.balances);
      }
    } catch (err) {
      console.error('Failed to fetch gateway balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  };

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

      // Fetch gateways for status display
      const { data: gatewayData } = await supabase
        .from('payment_gateways')
        .select('id, gateway_name, gateway_code, gateway_type, currency, is_active, trade_type')
        .order('gateway_name');

      setGateways(gatewayData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchGatewayBalances();
    
    // Auto refresh every 30 seconds if live mode
    let interval: NodeJS.Timeout;
    let balanceInterval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(fetchData, 30000);
      balanceInterval = setInterval(fetchGatewayBalances, 60000); // Check balance every minute
    }
    return () => {
      clearInterval(interval);
      clearInterval(balanceInterval);
    };
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

          {/* Pending HYPER PAY Payouts */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-yellow-500" />
                {language === 'zh' ? 'HYPER PAY代付' : 'HYPER PAY'}
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

        {/* Gateway Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              {language === 'zh' ? '网关余额' : 'Gateway Balances'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchGatewayBalances}
                disabled={isLoadingBalances}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                {language === 'zh' ? '刷新' : 'Refresh'}
              </Button>
              <Link to="/admin/gateways">
                <Button variant="ghost" size="sm">
                  {language === 'zh' ? '管理' : 'Manage'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            {gateways.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {language === 'zh' ? '暂无网关配置' : 'No gateways configured'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {gateways.map((gateway) => {
                  const balanceInfo = gatewayBalances.find(b => b.gateway_id === gateway.id);
                  const currencySymbol = gateway.currency === 'INR' ? '₹' : 
                                        gateway.currency === 'PKR' ? 'Rs.' : 
                                        gateway.currency === 'BDT' ? '৳' : '$';
                  
                  return (
                    <div 
                      key={gateway.id} 
                      className={`p-3 rounded-lg border ${
                        gateway.is_active 
                          ? balanceInfo?.status === 'online' 
                            ? 'border-green-500/30 bg-green-500/5' 
                            : balanceInfo?.status === 'error'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-muted bg-muted/30'
                          : 'border-muted bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {balanceInfo?.status === 'online' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : balanceInfo?.status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          ) : gateway.is_active ? (
                            <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">{gateway.gateway_name}</span>
                        </div>
                        <Badge variant={gateway.is_active ? "default" : "secondary"} className="text-xs">
                          {gateway.currency}
                        </Badge>
                      </div>
                      
                      {/* Balance Display */}
                      <div className="mt-3 p-2 rounded bg-muted/50">
                        {isLoadingBalances && !balanceInfo ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {language === 'zh' ? '加载中...' : 'Loading...'}
                            </span>
                          </div>
                        ) : balanceInfo?.balance !== null && balanceInfo?.balance !== undefined ? (
                          <div>
                            <div className="text-lg font-bold">
                              {currencySymbol}{balanceInfo.balance.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {language === 'zh' ? '网关余额' : 'Gateway Balance'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {balanceInfo?.message || (language === 'zh' ? '无法获取余额' : 'Unable to fetch balance')}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {gateway.gateway_type === 'lgpay' ? 'HYPER SOFTS' : 'HYPER PAY'}
                        </span>
                        <span className={
                          balanceInfo?.status === 'online' ? 'text-green-500' : 
                          balanceInfo?.status === 'error' ? 'text-amber-500' : 
                          'text-muted-foreground'
                        }>
                          {balanceInfo?.status === 'online' 
                            ? (language === 'zh' ? '在线' : 'Online') 
                            : balanceInfo?.status === 'error'
                              ? (language === 'zh' ? '错误' : 'Error')
                              : (language === 'zh' ? '离线' : 'Offline')
                          }
                        </span>
                      </div>
                      {gateway.trade_type && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Trade: {gateway.trade_type.toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  <strong>{language === 'zh' ? '自动告警：' : 'Auto Alerts:'}</strong>{' '}
                  {language === 'zh' 
                    ? '当网关余额低于阈值时，将自动发送Telegram通知。' 
                    : 'Telegram alerts are sent automatically when gateway balance falls below threshold.'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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