import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine, Download, RefreshCw } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

interface DailyStats {
  date: string;
  payin: number;
  payout: number;
  payinCount: number;
  payoutCount: number;
}

const chartConfig = {
  payin: { label: 'Pay-in', color: 'hsl(var(--success))' },
  payout: { label: 'Payout', color: 'hsl(var(--warning))' },
};

const MerchantAnalytics = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totals, setTotals] = useState({
    totalPayin: 0,
    totalPayout: 0,
    totalPayinCount: 0,
    totalPayoutCount: 0,
    avgPayinAmount: 0,
    avgPayoutAmount: 0,
    successRate: 0,
  });

  const fetchAnalytics = async () => {
    if (!user?.merchantId) return;
    
    setIsLoading(true);
    try {
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', user.merchantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process daily stats
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

      (transactions || []).forEach(tx => {
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
      });

      setDailyStats(Array.from(statsMap.values()));
      setTotals({
        totalPayin,
        totalPayout,
        totalPayinCount,
        totalPayoutCount,
        avgPayinAmount: totalPayinCount > 0 ? totalPayin / totalPayinCount : 0,
        avgPayoutAmount: totalPayoutCount > 0 ? totalPayout / totalPayoutCount : 0,
        successRate: (transactions?.length || 0) > 0 ? (successCount / (transactions?.length || 1)) * 100 : 0,
      });
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
  };

  useEffect(() => {
    fetchAnalytics();
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
            <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
              <BarChart3 className="h-6 w-6 text-[hsl(var(--success))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('merchant.analytics')}</h1>
              <p className="text-sm text-muted-foreground">{t('merchant.analyticsDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button onClick={exportReport} className="btn-gradient-success">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.totalPayin')}</p>
                    <p className="text-2xl font-bold text-[hsl(var(--success))]">₹{totals.totalPayin.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{totals.totalPayinCount} {t('common.transactions')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-[hsl(var(--success))]/10">
                    <ArrowDownToLine className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="stat-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.totalPayout')}</p>
                    <p className="text-2xl font-bold text-[hsl(var(--warning))]">₹{totals.totalPayout.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{totals.totalPayoutCount} {t('common.transactions')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-[hsl(var(--warning))]/10">
                    <ArrowUpFromLine className="h-5 w-5 text-[hsl(var(--warning))]" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="stat-card border-l-4 border-l-primary">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.avgPayin')}</p>
                    <p className="text-2xl font-bold">₹{totals.avgPayinAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('common.perTransaction')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="stat-card border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.successRate')}</p>
                    <p className="text-2xl font-bold text-purple-500">{totals.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('common.allTransactions')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart - Transaction Volume */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('merchant.transactionVolume')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={dailyStats}>
                    <defs>
                      <linearGradient id="payinGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('merchant.distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Count Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('merchant.transactionCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={dailyStats}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="payinCount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payoutCount" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantAnalytics;
