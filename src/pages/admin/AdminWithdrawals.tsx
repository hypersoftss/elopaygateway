import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { 
  Search, Download, RefreshCw, Wallet, Filter, Calendar, CheckCircle, XCircle, 
  Send, Volume2, VolumeX, Loader2, Eye, ArrowUpFromLine, Clock, AlertCircle,
  Zap, Activity, Server, CheckCircle2, XOctagon, HelpCircle, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PayoutTransaction {
  id: string;
  order_no: string;
  merchant_order_no: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'success' | 'failed';
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  ifsc_code: string | null;
  usdt_address: string | null;
  created_at: string;
  extra: string | null;
  callback_data: any;
  merchants: { 
    id: string; 
    merchant_name: string; 
    account_number: string; 
    balance: number; 
    frozen_balance: number;
    callback_url: string | null;
  } | null;
}

const AdminWithdrawals = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutTransaction | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewPayout, setViewPayout] = useState<PayoutTransaction | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1cXGRkZGRhYWRkaGhqampoaGZmZGNjYWFfYF5fXl5eXl5fYGFjZGVnaGlqa2xtbW1tbGtqaWhmZWNhX11cWllYWFdXV1dYWVpbXF5fYWNlZ2lrbG5vcHFxcXBwb25tbGppaGZlY2FfXVtZV1ZVVFRUVFRVVldZWlxeYGJkZ2lrbW9xcnR1dnZ2dnV0c3JwbmxqaGZkYV9dW1lXVVRSUVFRUVFSU1RWV1laXF5gYmRmaGpsbm9xc3R1dnZ2dnV0c3JwbmxqaGZkYV9dW1lXVVRSUVFRUVFSU1RWV1laXF5gYmRmaGpsbm9xc3R1dnZ2dnV0c3JwbmxqaGZkYV9dW1lXVVRTUlJSUlJTVFZYWVtdX2FjZWdpa21vcXN1dnd3d3d2dXRzcW9tamhmZGJgXltZV1VUUlFRUFBQUVJTVVdYWlxeYGJkZmhqbG5wcnR1dnd3d3d2dXRycG5samdlY2FeXFpYVlRTUVBQUFBQUVJUVldZW11fYWNlZ2lrbW9xc3V2d3d3d3Z1dHJwbmxqZ2VjYF5cWlhWVFNRUFBQUFBRUlRWV1lbXV9hY2VnaWttb3Fzc3N0dHRzcnFwbmxqaGZkYV9dW1lXVVRSUVFQUFBRUlNVV1hbXV9hY2VnaWttb3Fzc3R0dHNycXBubGpoZmRiYF5cWlhWVFNSUVBQUFBRUlNVV1laXF5gYmRmaGpsbm5vcHBwb25tbGtpZ2VjYV9dW1lXVVRTUVFQUFBRUlNVVldZW1xeYGFjZWdpamxtbnBwcXFwb25sbGppaGZkYmBfXVtaWFZVU1JSUVFRUVJTVFZXWV1fYWNlZ2hqbG5vc3V2d3d3d3Z1dHJwbmxqaGZkYV9dW1lXVVRSUVBQUFBRUlRWV1lbXV9hY2VnaWttb3Fzc3R0dHRzcnFwbmxqaGZkYV9dW1lXVVRTUVFQUFBRUlNVV1laXF5gYmRmaGpsbm9xc3N0dHNycXBubGpoZmRiYF5cWlhWVFNSUVBQUFBRUlNVV1laXF5gYmRmaGpsbm9xc3N0dHNycXBubGpoZmRiYF5cWlhWVFNSUVBQUFBRUlNVV1laXF5gYmRmaGpsbm5vcHBwb25tbGtpZ2VjYV9dW1lXVVRTUVFQUFBRUlNVVldZW1xeYGFjZWdpamxtbnBwcXFwb25sbGppaGZkYmBfXVtaWFZVU1JSUVFRUVJTVFZXWV1fYWNlZ2hqbG5vcHFycnJycXBvbmxqaGZlY2FfXVtZV1ZUU1JSUVFRUVJTVFZXWV1fYWNlZ2hqbG5vc3V2d3d3d3Z1dHJwbmxqaGZkYV9dW1lXVVRSUVBQUFBRUlRWV1lbXV9hY2VnaWttb3Fzc3R0dHRzcnFwbmxqaGZkYV9dW1lXVVRTUVFQUFBRUlNVV1laXF5gYmRmaGpsbm9xc3N0dHNycXBubGpoZmRiYF5cWlhWVFNSUVBQUFBRUlNVV1laXF5gYmRmaGpsbm9xc3N0dHNycXBubGpoZmRiYF5cWlhWVFNSUVBQUFBRUlNVV1laXF5gYmRmaGpsbm5vcHBwb25tbGtpZ2VjYV9dW1lXVVRTUVFQUFBRUlNVVldZW1xeYGFjZWdpamxtbnBwcXFwb25sbGppaGZkYmBfXVtaWFZVU1JSUVFRUVJTVFZXWV1fYWNlZ2hqbG5vcHFycnJycXBvbmxqaGZlY2FfXVtZV1ZUU1JSUVFRUVJTVFZXWV1fYWNlZ2hqbG5v');
  }, []);

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance, callback_url)')
        .eq('transaction_type', 'payout')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'success' | 'failed');
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayouts(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        description: t('errors.fetchFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to realtime updates for new payout requests
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('payout_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'transaction_type=eq.payout',
        },
        (payload) => {
          console.log('New payout received:', payload);
          playNotificationSound();
          fetchData();
          
          toast({
            title: language === 'zh' ? '🔔 新代付请求' : '🔔 New Payout Request',
            description: `₹${(payload.new as any).amount?.toLocaleString()} - ${(payload.new as any).order_no}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: 'transaction_type=eq.payout',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, dateFrom, dateTo, soundEnabled]);

  const handleAction = async () => {
    if (!selectedPayout || !actionType) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: {
          transaction_id: selectedPayout.id,
          action: actionType
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || 'Failed to process payout');
      }

      toast({
        title: t('common.success'),
        description: actionType === 'approve' 
          ? (language === 'zh' ? '已发送到BondPay处理' : 'Sent to BondPay for processing')
          : (language === 'zh' ? '已拒绝，余额已退回' : 'Rejected, balance refunded'),
      });

      fetchData();
    } catch (error: any) {
      console.error('Error processing:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('errors.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedPayout(null);
      setActionType(null);
    }
  };

  const filteredData = payouts.filter(w => 
    w.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.merchant_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.account_number?.includes(searchTerm)
  );

  const exportToCSV = () => {
    const headers = ['Order No', 'Merchant Order', 'Merchant', 'Amount', 'Fee', 'Bank', 'Account', 'Holder', 'IFSC', 'Status', 'Callback Status', 'Created'];
    const csvData = filteredData.map(w => [
      w.order_no,
      w.merchant_order_no || '',
      w.merchants?.merchant_name || '',
      w.amount.toString(),
      (w.fee || 0).toString(),
      w.bank_name || '',
      w.account_number || '',
      w.account_holder_name || '',
      w.ifsc_code || '',
      w.status,
      getCallbackStatus(w.callback_data),
      format(new Date(w.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: t('common.success'), description: t('admin.exportSuccess') });
  };

  // Get callback status from callback_data
  const getCallbackStatus = (callbackData: any): string => {
    if (!callbackData) return 'not_sent';
    if (callbackData.bondpay_callback) return 'callback_received';
    if (callbackData.bondpay_response) return 'sent_to_bondpay';
    if (callbackData.approved_at) return 'approved';
    return 'unknown';
  };

  // Render callback status badge
  const renderCallbackBadge = (callbackData: any) => {
    const status = getCallbackStatus(callbackData);
    
    const statusConfig: Record<string, { label: string; labelZh: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      not_sent: { label: 'Pending', labelZh: '待发送', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      approved: { label: 'Approved', labelZh: '已批准', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
      sent_to_bondpay: { label: 'Processing', labelZh: '处理中', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      callback_received: { label: 'Completed', labelZh: '已完成', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      unknown: { label: 'Unknown', labelZh: '未知', variant: 'secondary', icon: <HelpCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status];
    
    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        {config.icon}
        {language === 'zh' ? config.labelZh : config.label}
      </Badge>
    );
  };

  const pendingCount = filteredData.filter(w => w.status === 'pending').length;
  const pendingAmount = filteredData.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const successCount = filteredData.filter(w => w.status === 'success').length;
  const totalAmount = filteredData.reduce((sum, w) => sum + w.amount, 0);
  const processingCount = filteredData.filter(w => w.callback_data?.bondpay_response && !w.callback_data?.bondpay_callback && w.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {language === 'zh' ? '代付管理中心' : 'Payout Control Center'}
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'zh' ? '实时监控 • 一键审批 • 回调追踪' : 'Real-time • One-click Approval • Callback Tracking'}
                </p>
              </div>
              {pendingCount > 0 && (
                <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 animate-pulse ml-2">
                  {pendingCount} {language === 'zh' ? '待处理' : 'pending'}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={soundEnabled ? "secondary" : "outline"}
                size="sm" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="bg-white/20 hover:bg-white/30 border-white/20 text-white"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                {language === 'zh' ? '声音' : 'Sound'}
              </Button>
              <Button variant="secondary" size="sm" onClick={fetchData} className="bg-white/20 hover:bg-white/30 border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={exportToCSV} className="bg-white text-purple-600 hover:bg-white/90">
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="premium-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '总请求' : 'Total'}</p>
                  <p className="text-2xl font-bold">{filteredData.length}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">₹{totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="premium-card overflow-hidden border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '待审批' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-2">₹{pendingAmount.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="premium-card overflow-hidden border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Server className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? 'BondPay处理中' : 'Processing'}</p>
                  <p className="text-2xl font-bold text-orange-500">{processingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card overflow-hidden border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '已完成' : 'Success'}</p>
                  <p className="text-2xl font-bold text-green-500">{successCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card overflow-hidden border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XOctagon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '已拒绝' : 'Failed'}</p>
                  <p className="text-2xl font-bold text-red-500">
                    {filteredData.filter(w => w.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-primary" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'zh' ? '搜索订单/商户/账户' : 'Search order/merchant/account'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('status.pending')}</SelectItem>
                  <SelectItem value="success">{t('status.success')}</SelectItem>
                  <SelectItem value="failed">{t('status.failed')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-primary" />
              {language === 'zh' ? '代付请求列表' : 'Payout Requests'}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingCount} {language === 'zh' ? '待处理' : 'pending'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '实时回调状态追踪' : 'Real-time callback status tracking'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="whitespace-nowrap font-semibold">{t('transactions.orderNo')}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{t('common.merchant')}</TableHead>
                    <TableHead className="text-right whitespace-nowrap font-semibold">{t('transactions.amount')}</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell font-semibold">{language === 'zh' ? '收款银行' : 'Bank Details'}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{t('common.status')}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{language === 'zh' ? '回调状态' : 'Callback'}</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell font-semibold">{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center whitespace-nowrap font-semibold">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Wallet className="h-12 w-12 opacity-20" />
                          <p>{t('common.noData')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((w) => (
                      <TableRow 
                        key={w.id} 
                        className={`hover:bg-muted/50 transition-colors ${
                          w.status === 'pending' ? 'bg-yellow-500/5 dark:bg-yellow-500/10' : ''
                        }`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs font-medium truncate max-w-[100px] lg:max-w-none">{w.order_no}</p>
                            {w.merchant_order_no && (
                              <p className="text-xs text-muted-foreground truncate">{w.merchant_order_no}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[100px] lg:max-w-none">{w.merchants?.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{w.merchants?.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-bold text-base">₹{w.amount.toLocaleString()}</p>
                            {w.fee > 0 && <p className="text-xs text-muted-foreground">-₹{w.fee}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="max-w-[180px]">
                            <p className="text-sm font-medium truncate">{w.bank_name || '-'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{w.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={w.status} />
                        </TableCell>
                        <TableCell>
                          {renderCallbackBadge(w.callback_data)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                          {format(new Date(w.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setViewPayout(w)}
                              title={language === 'zh' ? '查看详情' : 'View Details'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {w.status === 'pending' && !w.callback_data?.bondpay_response && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => {
                                    setSelectedPayout(w);
                                    setActionType('approve');
                                  }}
                                  title={language === 'zh' ? '批准' : 'Approve'}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setSelectedPayout(w);
                                    setActionType('reject');
                                  }}
                                  title={language === 'zh' ? '拒绝' : 'Reject'}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Details Dialog */}
        <Dialog open={!!viewPayout} onOpenChange={() => setViewPayout(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {language === 'zh' ? '代付详情' : 'Payout Details'}
              </DialogTitle>
            </DialogHeader>
            {viewPayout && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">{language === 'zh' ? '基本信息' : 'Info'}</TabsTrigger>
                  <TabsTrigger value="callback">{language === 'zh' ? '回调状态' : 'Callback'}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '订单号' : 'Order No'}</span>
                        <span className="font-mono text-sm font-medium">{viewPayout.order_no}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '状态' : 'Status'}</span>
                        <StatusBadge status={viewPayout.status} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '金额' : 'Amount'}</span>
                        <span className="font-bold text-xl">₹{viewPayout.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '手续费' : 'Fee'}</span>
                        <span className="text-orange-500">₹{(viewPayout.fee || 0).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{language === 'zh' ? '商户信息' : 'Merchant Info'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '名称' : 'Name'}</span>
                        <span className="font-medium">{viewPayout.merchants?.merchant_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '账号' : 'Account'}</span>
                        <span className="font-mono text-sm">{viewPayout.merchants?.account_number}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{language === 'zh' ? '收款银行信息' : 'Bank Details'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '银行' : 'Bank'}</span>
                        <span>{viewPayout.bank_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '账号' : 'Account'}</span>
                        <span className="font-mono text-sm">{viewPayout.account_number || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{language === 'zh' ? '持有人' : 'Holder'}</span>
                        <span>{viewPayout.account_holder_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">IFSC</span>
                        <span className="font-mono text-sm">{viewPayout.ifsc_code || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="callback" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        {language === 'zh' ? 'BondPay 回调状态' : 'BondPay Callback Status'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2 mb-4">
                        {renderCallbackBadge(viewPayout.callback_data)}
                      </div>
                      
                      {viewPayout.callback_data ? (
                        <div className="space-y-4">
                          {viewPayout.callback_data.approved_at && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-green-600 font-medium">{language === 'zh' ? '批准时间' : 'Approved At'}</p>
                              <p className="text-sm mt-1">{format(new Date(viewPayout.callback_data.approved_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                            </div>
                          )}
                          
                          {viewPayout.callback_data.bondpay_response && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-blue-600 font-medium mb-2">{language === 'zh' ? 'BondPay 响应' : 'BondPay Response'}</p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(viewPayout.callback_data.bondpay_response, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {viewPayout.callback_data.bondpay_callback && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-purple-600 font-medium mb-2">{language === 'zh' ? '回调数据' : 'Callback Data'}</p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(viewPayout.callback_data.bondpay_callback, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{language === 'zh' ? '尚未发送到BondPay' : 'Not yet sent to BondPay'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedPayout && !!actionType} onOpenChange={() => { setSelectedPayout(null); setActionType(null); }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
                {actionType === 'approve' 
                  ? (language === 'zh' ? '确认批准？' : 'Confirm Approval?')
                  : (language === 'zh' ? '确认拒绝？' : 'Confirm Rejection?')}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'zh' ? '金额' : 'Amount'}</span>
                        <span className="font-bold text-xl">₹{selectedPayout?.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'zh' ? '商户' : 'Merchant'}</span>
                        <span className="font-medium">{selectedPayout?.merchants?.merchant_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'zh' ? '收款银行' : 'Bank'}</span>
                        <span>{selectedPayout?.bank_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'zh' ? '账户' : 'Account'}</span>
                        <span className="font-mono">{selectedPayout?.account_number}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {actionType === 'approve' && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-600">
                        <Zap className="h-4 w-4" />
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '批准后将自动发送到BondPay处理' : 'Will be sent to BondPay for processing'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {actionType === 'reject' && (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm text-yellow-600">
                        {language === 'zh' ? '拒绝后金额将返还商户余额' : 'Amount will be refunded to merchant balance'}
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAction}
                disabled={isProcessing}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    {actionType === 'approve' ? <Send className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    {actionType === 'approve' ? t('common.approve') : t('common.reject')}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWithdrawals;
