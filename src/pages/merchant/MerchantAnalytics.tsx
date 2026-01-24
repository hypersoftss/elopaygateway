import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Download, RefreshCw, Activity, Zap } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMerchantCurrency } from '@/hooks/useMerchantCurrency';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
interface DailyStats {
  date: string;
  payin: number;
  payout: number;
  payinCount: number;
  payoutCount: number;
}

interface Transaction {
  id: string;
  transaction_type: 'payin' | 'payout';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

const chartConfig = {
  payin: { label: 'Pay-in', color: 'hsl(var(--success))' },
  payout: { label: 'Payout', color: 'hsl(var(--warning))' },
  payinCount: { label: 'Pay-in Count', color: 'hsl(var(--success))' },
  payoutCount: { label: 'Payout Count', color: 'hsl(var(--warning))' },
};

const MerchantAnalytics = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { currencySymbol: cs } = useMerchantCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLive, setIsLive] = useState(false); // Default to OFF to prevent flickering
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({
    totalPayin: 0,
    totalPayout: 0,
    totalPayinCount: 0,
    totalPayoutCount: 0,
    avgPayinAmount: 0,
    avgPayoutAmount: 0,
    successRate: 0,
    pendingCount: 0,
  });
  
  // Use ref to track if initial load is complete
  const initialLoadRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processTransactions = useCallback((transactions: Transaction[], days: number) => {
    const statsMap = new Map<string, DailyStats>();
    
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      statsMap.set(date, { date, payin: 0, payout: 0, payinCount: 0, payoutCount: 0 });
    }

    let totalPayin = 0;
    let totalPayout = 0;
    let totalPayinCount = 0;
    let totalPayoutCount = 0;
    let successCount = 0;
    let pendingCount = 0;

    transactions.forEach(tx => {
      const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
      const stat = statsMap.get(date);
      
      if (stat) {
        if (tx.transaction_type === 'payin') {
          stat.payin += tx.amount;
          stat.payinCount += 1;
          totalPayin += tx.amount;
          totalPayinCount += 1;
        } else {
          stat.payout += tx.amount;
          stat.payoutCount += 1;
          totalPayout += tx.amount;
          totalPayoutCount += 1;
        }
      }
      
      if (tx.status === 'success') successCount += 1;
      if (tx.status === 'pending') pendingCount += 1;
    });

    setDailyStats(Array.from(statsMap.values()));
    setTotals({
      totalPayin,
      totalPayout,
      totalPayinCount,
      totalPayoutCount,
      avgPayinAmount: totalPayinCount > 0 ? totalPayin / totalPayinCount : 0,
      avgPayoutAmount: totalPayoutCount > 0 ? totalPayout / totalPayoutCount : 0,
      successRate: transactions.length > 0 ? (successCount / transactions.length) * 100 : 0,
      pendingCount,
    });
  }, []);

  const fetchAnalytics = useCallback(async (showLoading = true) => {
    if (!user?.merchantId) return;
    
    if (showLoading && !initialLoadRef.current) {
      setIsLoading(true);
    }
    
    try {
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, transaction_type, amount, status, created_at')
        .eq('merchant_id', user.merchantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecentTransactions((transactions || []).slice(0, 10) as Transaction[]);
      processTransactions(transactions as Transaction[] || [], days);
      initialLoadRef.current = true;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: t('common.error'),
        description: t('errors.fetchFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.merchantId, period, processTransactions, t, toast]);

  // Debounced fetch for realtime updates
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchAnalytics(false);
    }, 1000); // 1 second debounce
  }, [fetchAnalytics]);

  // Real-time subscription with debouncing
  useEffect(() => {
    if (!user?.merchantId || !isLive) return;

    const channel = supabase
      .channel('merchant-analytics-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `merchant_id=eq.${user.merchantId}`,
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user?.merchantId, isLive, debouncedFetch]);

  // Initial fetch and period change
  useEffect(() => {
    initialLoadRef.current = false;
    fetchAnalytics(true);
  }, [user?.merchantId, period]);

  const pieData = [
    { name: t('merchant.payin'), value: totals.totalPayin, color: 'hsl(var(--success))' },
    { name: t('merchant.payout'), value: totals.totalPayout, color: 'hsl(var(--warning))' },
  ];

  const exportReport = () => {
    const headers = ['Date', 'Pay-in Amount', 'Pay-in Count', 'Payout Amount', 'Payout Count'];
    const csvData = dailyStats.map(stat => [
      stat.date,
      stat.payin.toString(),
      stat.payinCount.toString(),
      stat.payout.toString(),
      stat.payoutCount.toString()
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: t('common.success'),
      description: t('merchant.exportSuccess'),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5 shadow-lg">
              <BarChart3 className="h-6 w-6 text-[hsl(var(--success))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {t('merchant.analytics')}
                {isLive && (
                  <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    {language === 'zh' ? '实时' : 'Live'}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{t('merchant.analyticsDesc')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isLive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90' : ''}
            >
              <Zap className={`h-4 w-4 mr-1 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? (language === 'zh' ? '实时开启' : 'Live ON') : (language === 'zh' ? '实时关闭' : 'Live OFF')}
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('common.last7Days')}</SelectItem>
                <SelectItem value="14">{t('common.last14Days')}</SelectItem>
                <SelectItem value="30">{t('common.last30Days')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fetchAnalytics(true)} size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('common.refresh')}
            </Button>
            <Button onClick={exportReport} size="sm" className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90">
              <Download className="h-4 w-4 mr-1" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="premium-card border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground">{t('merchant.totalPayin')}</p>
                    <p className="text-xl font-bold text-[hsl(var(--success))]">{cs}{totals.totalPayin.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{totals.totalPayinCount} {language === 'zh' ? '笔' : 'txns'}</p>
                  </div>
                  <div className="p-2 rounded-full bg-[hsl(var(--success))]/10">
                    <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--success))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="premium-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground">{t('merchant.totalPayout')}</p>
                    <p className="text-xl font-bold text-[hsl(var(--warning))]">{cs}{totals.totalPayout.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{totals.totalPayoutCount} {language === 'zh' ? '笔' : 'txns'}</p>
                  </div>
                  <div className="p-2 rounded-full bg-[hsl(var(--warning))]/10">
                    <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--warning))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="premium-card border-l-4 border-l-primary">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{language === 'zh' ? '成功率' : 'Success Rate'}</p>
                    <p className="text-xl font-bold text-primary">{totals.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{totals.pendingCount} {language === 'zh' ? '待处理' : 'pending'}</p>
                  </div>
                  <div className="p-2 rounded-full bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="premium-card border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground">{language === 'zh' ? '平均交易' : 'Avg Transaction'}</p>
                    <p className="text-xl font-bold text-purple-500">{cs}{totals.avgPayinAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">{language === 'zh' ? 'Pay-In均值' : 'per pay-in'}</p>
                  </div>
                  <div className="p-2 rounded-full bg-purple-500/10">
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart - Transaction Volume */}
          <Card className="lg:col-span-2 premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('merchant.transactionVolume')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <AreaChart data={dailyStats}>
                    <defs>
                      <linearGradient id="payinGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="payin"
                      stroke="hsl(var(--success))"
                      fill="url(#payinGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="payout"
                      stroke="hsl(var(--warning))"
                      fill="url(#payoutGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart - Distribution */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('merchant.distribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Count Chart & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('merchant.transactionCount')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <BarChart data={dailyStats}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="payinCount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payoutCount" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('merchant.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${tx.transaction_type === 'payin' ? 'bg-[hsl(var(--success))]/10' : 'bg-[hsl(var(--warning))]/10'}`}>
                          {tx.transaction_type === 'payin' ? (
                            <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--success))]" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--warning))]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{tx.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.transaction_type === 'payin' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}`}>
                          {tx.transaction_type === 'payin' ? '+' : '-'}{cs}{tx.amount.toLocaleString()}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            tx.status === 'success' ? 'border-[hsl(var(--success))] text-[hsl(var(--success))]' :
                            tx.status === 'pending' ? 'border-[hsl(var(--warning))] text-[hsl(var(--warning))]' :
                            'border-destructive text-destructive'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MerchantAnalytics;
