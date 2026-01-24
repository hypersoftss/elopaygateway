import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search, Download, RefreshCw, Wallet, Filter, Calendar, CheckCircle, XCircle, Send, Volume2, VolumeX, Loader2, Eye } from 'lucide-react';
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
    // Create audio element for notification sound
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
      // Fetch all payouts (both API-initiated and withdrawal requests)
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
      // Call the process-payout edge function
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
          ? (language === 'zh' ? '已发送到HYPER PAY处理' : 'Sent to HYPER PAY for processing')
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
    const headers = ['Order No', 'Merchant Order', 'Merchant', 'Amount', 'Fee', 'Bank', 'Account', 'Holder', 'IFSC', 'Status', 'Created'];
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

  const pendingCount = filteredData.filter(w => w.status === 'pending').length;
  const pendingAmount = filteredData.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const successCount = filteredData.filter(w => w.status === 'success').length;
  const totalAmount = filteredData.reduce((sum, w) => sum + w.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 relative">
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold">{language === 'zh' ? '代付管理' : 'Payout Management'}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {language === 'zh' ? '审批后自动发送到HYPER PAY' : 'Auto-send to HYPER PAY on approval'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={soundEnabled ? "default" : "outline"}
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex-1 sm:flex-none ${soundEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {language === 'zh' ? '声音' : 'Sound'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">{language === 'zh' ? '总请求' : 'Total'}</p>
              <p className="text-lg md:text-xl font-bold">{filteredData.length}</p>
              <p className="text-xs text-muted-foreground">₹{totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">{language === 'zh' ? '待审批' : 'Pending'}</p>
              <p className="text-lg md:text-xl font-bold text-yellow-500">{pendingCount}</p>
              <p className="text-xs text-yellow-600">₹{pendingAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">{language === 'zh' ? '已完成' : 'Success'}</p>
              <p className="text-lg md:text-xl font-bold text-green-500">{successCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">{language === 'zh' ? '已拒绝' : 'Failed'}</p>
              <p className="text-lg md:text-xl font-bold text-red-500">
                {filteredData.filter(w => w.status === 'failed').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Filter className="h-4 w-4" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'zh' ? '搜索订单/商户/账户' : 'Search order/merchant/account'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
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
                  className="pl-9 h-9"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4" />
              {language === 'zh' ? '代付请求列表' : 'Payout Requests'}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingCount} {language === 'zh' ? '待处理' : 'pending'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="whitespace-nowrap">{t('transactions.orderNo')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('common.merchant')}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t('transactions.amount')}</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">{language === 'zh' ? '收款银行' : 'Bank Details'}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('common.status')}</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center whitespace-nowrap">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((w) => (
                      <TableRow key={w.id} className={`hover:bg-muted/50 transition-colors ${w.status === 'pending' ? 'bg-yellow-500/5' : ''}`}>
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs truncate max-w-[80px] md:max-w-none">{w.order_no}</p>
                            {w.merchant_order_no && (
                              <p className="text-xs text-muted-foreground truncate">{w.merchant_order_no}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[80px] md:max-w-none">{w.merchants?.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{w.merchants?.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-semibold text-sm">₹{w.amount.toLocaleString()}</p>
                            {w.fee > 0 && <p className="text-xs text-muted-foreground">Fee: ₹{w.fee}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="max-w-[150px]">
                            <p className="text-sm font-medium truncate">{w.bank_name || '-'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{w.account_number}</p>
                            <p className="text-xs text-muted-foreground">{w.account_holder_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={w.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                          {format(new Date(w.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setViewPayout(w)}
                              title={language === 'zh' ? '查看详情' : 'View Details'}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {w.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-500 border-green-500 hover:bg-green-500/10 h-7 w-7 p-0"
                                  onClick={() => {
                                    setSelectedPayout(w);
                                    setActionType('approve');
                                  }}
                                  title={language === 'zh' ? '批准' : 'Approve'}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                  onClick={() => {
                                    setSelectedPayout(w);
                                    setActionType('reject');
                                  }}
                                  title={language === 'zh' ? '拒绝' : 'Reject'}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
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
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {language === 'zh' ? '代付详情' : 'Payout Details'}
              </DialogTitle>
            </DialogHeader>
            {viewPayout && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '订单号' : 'Order No'}</span>
                    <span className="font-mono text-sm">{viewPayout.order_no}</span>
                  </div>
                  {viewPayout.merchant_order_no && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">{language === 'zh' ? '商户订单号' : 'Merchant Order'}</span>
                      <span className="font-mono text-sm">{viewPayout.merchant_order_no}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '状态' : 'Status'}</span>
                    <StatusBadge status={viewPayout.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '金额' : 'Amount'}</span>
                    <span className="font-bold text-lg">₹{viewPayout.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '手续费' : 'Fee'}</span>
                    <span>₹{(viewPayout.fee || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border space-y-3">
                  <h4 className="font-medium text-sm">{language === 'zh' ? '商户信息' : 'Merchant Info'}</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '名称' : 'Name'}</span>
                    <span>{viewPayout.merchants?.merchant_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{language === 'zh' ? '账号' : 'Account'}</span>
                    <span className="font-mono text-sm">{viewPayout.merchants?.account_number}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border space-y-3">
                  <h4 className="font-medium text-sm">{language === 'zh' ? '收款银行信息' : 'Bank Details'}</h4>
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
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{language === 'zh' ? '创建时间' : 'Created'}</span>
                  <span>{format(new Date(viewPayout.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedPayout && !!actionType} onOpenChange={() => { setSelectedPayout(null); setActionType(null); }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {actionType === 'approve' 
                  ? (language === 'zh' ? '确认批准？' : 'Confirm Approval?')
                  : (language === 'zh' ? '确认拒绝？' : 'Confirm Rejection?')}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 mt-2">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '金额' : 'Amount'}</span>
                      <span className="font-bold text-lg">₹{selectedPayout?.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '商户' : 'Merchant'}</span>
                      <span>{selectedPayout?.merchants?.merchant_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '收款银行' : 'Bank'}</span>
                      <span>{selectedPayout?.bank_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '账户' : 'Account'}</span>
                      <span className="font-mono">{selectedPayout?.account_number}</span>
                    </div>
                  </div>
                  
                  {actionType === 'approve' && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        {language === 'zh' ? '批准后将自动发送到HYPER PAY处理' : 'Will be sent to HYPER PAY for processing'}
                      </p>
                    </div>
                  )}
                  
                  {actionType === 'reject' && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
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
                  actionType === 'approve' ? t('common.approve') : t('common.reject')
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