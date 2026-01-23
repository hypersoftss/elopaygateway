import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Clock,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { format, subHours, subDays } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface Gateway {
  id: string;
  gateway_name: string;
  gateway_code: string;
  gateway_type: string;
  currency: string;
  is_active: boolean;
  trade_type: string | null;
}

interface BalanceHistory {
  id: string;
  gateway_id: string;
  balance: number | null;
  status: string;
  message: string | null;
  checked_at: string;
}

interface GatewayStats {
  gateway_id: string;
  totalChecks: number;
  onlineCount: number;
  errorCount: number;
  offlineCount: number;
  uptime: number;
  avgBalance: number;
  minBalance: number;
  maxBalance: number;
  latestBalance: number | null;
  latestStatus: string;
}

const AdminGatewayHealth = () => {
  const { t, language } = useTranslation();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch gateways
      const { data: gatewayData } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('gateway_name');

      setGateways(gatewayData || []);

      // Set default selected gateway
      if (gatewayData && gatewayData.length > 0 && !selectedGateway) {
        setSelectedGateway(gatewayData[0].id);
      }

      // Fetch balance history based on time range
      let startDate = subHours(new Date(), 24);
      if (timeRange === '7d') startDate = subDays(new Date(), 7);
      if (timeRange === '30d') startDate = subDays(new Date(), 30);

      const { data: historyData } = await supabase
        .from('gateway_balance_history')
        .select('*')
        .gte('checked_at', startDate.toISOString())
        .order('checked_at', { ascending: true });

      setBalanceHistory(historyData || []);
    } catch (err) {
      console.error('Failed to fetch gateway health data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalances = async () => {
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('check-gateway-balance');
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Calculate stats for each gateway
  const getGatewayStats = (gatewayId: string): GatewayStats => {
    const history = balanceHistory.filter(h => h.gateway_id === gatewayId);
    
    if (history.length === 0) {
      return {
        gateway_id: gatewayId,
        totalChecks: 0,
        onlineCount: 0,
        errorCount: 0,
        offlineCount: 0,
        uptime: 0,
        avgBalance: 0,
        minBalance: 0,
        maxBalance: 0,
        latestBalance: null,
        latestStatus: 'unknown'
      };
    }

    const onlineCount = history.filter(h => h.status === 'online').length;
    const errorCount = history.filter(h => h.status === 'error').length;
    const offlineCount = history.filter(h => h.status === 'offline').length;
    const balances = history.filter(h => h.balance !== null).map(h => h.balance as number);
    
    const latest = history[history.length - 1];

    return {
      gateway_id: gatewayId,
      totalChecks: history.length,
      onlineCount,
      errorCount,
      offlineCount,
      uptime: history.length > 0 ? (onlineCount / history.length) * 100 : 0,
      avgBalance: balances.length > 0 ? balances.reduce((a, b) => a + b, 0) / balances.length : 0,
      minBalance: balances.length > 0 ? Math.min(...balances) : 0,
      maxBalance: balances.length > 0 ? Math.max(...balances) : 0,
      latestBalance: latest?.balance ?? null,
      latestStatus: latest?.status || 'unknown'
    };
  };

  const getChartData = (gatewayId: string) => {
    return balanceHistory
      .filter(h => h.gateway_id === gatewayId && h.balance !== null)
      .map(h => ({
        time: format(new Date(h.checked_at), timeRange === '24h' ? 'HH:mm' : 'MM/dd HH:mm'),
        balance: h.balance,
        status: h.status
      }));
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '₹';
      case 'PKR': return 'Rs.';
      case 'BDT': return '৳';
      default: return '$';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const selectedGatewayData = gateways.find(g => g.id === selectedGateway);
  const selectedStats = selectedGateway ? getGatewayStats(selectedGateway) : null;
  const chartData = selectedGateway ? getChartData(selectedGateway) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/gateways">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Server className="h-6 w-6" />
                {language === 'zh' ? '网关健康监控' : 'Gateway Health Monitoring'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '监控网关状态和余额历史' : 'Monitor gateway status and balance history'}
              </p>
            </div>
          </div>
          <Button onClick={refreshBalances} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {language === 'zh' ? '刷新余额' : 'Refresh Balances'}
          </Button>
        </div>

        {/* Gateway Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gateways.map((gateway) => {
            const stats = getGatewayStats(gateway.id);
            const currencySymbol = getCurrencySymbol(gateway.currency);
            
            return (
              <Card 
                key={gateway.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedGateway === gateway.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedGateway(gateway.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(stats.latestStatus)}
                      <span className="font-medium text-sm">{gateway.gateway_name}</span>
                    </div>
                    <Badge variant={gateway.is_active ? "default" : "secondary"}>
                      {gateway.currency}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-xl font-bold">
                        {stats.latestBalance !== null 
                          ? `${currencySymbol}${stats.latestBalance.toLocaleString()}`
                          : '--'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'zh' ? '当前余额' : 'Current Balance'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {language === 'zh' ? '在线率' : 'Uptime'}
                      </span>
                      <span className={stats.uptime >= 90 ? 'text-green-500' : stats.uptime >= 70 ? 'text-amber-500' : 'text-destructive'}>
                        {stats.uptime.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={stats.uptime} className="h-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed View */}
        {selectedGatewayData && selectedStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {language === 'zh' ? '统计概览' : 'Statistics'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="text-2xl font-bold text-green-500">{selectedStats.onlineCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '在线检查' : 'Online Checks'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="text-2xl font-bold text-amber-500">{selectedStats.errorCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '错误检查' : 'Error Checks'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="text-2xl font-bold text-destructive">{selectedStats.offlineCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '离线检查' : 'Offline Checks'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-2xl font-bold text-primary">{selectedStats.totalChecks}</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '总检查次数' : 'Total Checks'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'zh' ? '平均余额' : 'Avg Balance'}
                    </span>
                    <span className="font-medium">
                      {getCurrencySymbol(selectedGatewayData.currency)}
                      {selectedStats.avgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'zh' ? '最低余额' : 'Min Balance'}
                    </span>
                    <span className="font-medium text-destructive">
                      {getCurrencySymbol(selectedGatewayData.currency)}
                      {selectedStats.minBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'zh' ? '最高余额' : 'Max Balance'}
                    </span>
                    <span className="font-medium text-green-500">
                      {getCurrencySymbol(selectedGatewayData.currency)}
                      {selectedStats.maxBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {language === 'zh' ? '余额趋势' : 'Balance Trend'}
                </CardTitle>
                <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                  <TabsList>
                    <TabsTrigger value="24h">24h</TabsTrigger>
                    <TabsTrigger value="7d">7d</TabsTrigger>
                    <TabsTrigger value="30d">30d</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{language === 'zh' ? '暂无历史数据' : 'No historical data yet'}</p>
                      <p className="text-xs mt-1">
                        {language === 'zh' ? '数据将在后续检查后显示' : 'Data will appear after balance checks'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickFormatter={(value) => `${getCurrencySymbol(selectedGatewayData.currency)}${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          `${getCurrencySymbol(selectedGatewayData.currency)}${value.toLocaleString()}`,
                          language === 'zh' ? '余额' : 'Balance'
                        ]}
                        labelFormatter={(label) => `${language === 'zh' ? '时间' : 'Time'}: ${label}`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {language === 'zh' ? '最近检查记录' : 'Recent Check History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'zh' ? '暂无检查记录' : 'No check history yet'}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {balanceHistory.slice().reverse().slice(0, 20).map((record) => {
                  const gateway = gateways.find(g => g.id === record.gateway_id);
                  const currencySymbol = gateway ? getCurrencySymbol(gateway.currency) : '$';
                  
                  return (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium text-sm">
                            {gateway?.gateway_name || 'Unknown Gateway'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.checked_at), 'yyyy-MM-dd HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {record.balance !== null ? (
                          <div className="font-medium">
                            {currencySymbol}{record.balance.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {record.message || '--'}
                          </div>
                        )}
                        <Badge 
                          variant={
                            record.status === 'online' ? 'default' : 
                            record.status === 'error' ? 'secondary' : 
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminGatewayHealth;
