import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Search, Download, RefreshCw, Wallet, Filter, Calendar, CheckCircle, XCircle, Send, Bell, Loader2 } from 'lucide-react';
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

interface PayoutTransaction {
  id: string;
  order_no: string;
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
  merchants: { id: string; merchant_name: string; account_number: string; balance: number; frozen_balance: number } | null;
}

const AdminWithdrawals = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'merchant' | 'bondpay'>('bondpay');
  const [merchantWithdrawals, setMerchantWithdrawals] = useState<PayoutTransaction[]>([]);
  const [bondpayPayouts, setBondpayPayouts] = useState<PayoutTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutTransaction | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPayoutAlert, setNewPayoutAlert] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Merchant Withdrawals (extra = 'withdrawal')
      let withdrawalQuery = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .eq('extra', 'withdrawal')
        .order('created_at', { ascending: false });

      // BondPay Payouts (API-initiated, no extra)
      let bondpayQuery = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .is('extra', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        withdrawalQuery = withdrawalQuery.eq('status', statusFilter as 'pending' | 'success' | 'failed');
        bondpayQuery = bondpayQuery.eq('status', statusFilter as 'pending' | 'success' | 'failed');
      }
      if (dateFrom) {
        withdrawalQuery = withdrawalQuery.gte('created_at', dateFrom);
        bondpayQuery = bondpayQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        withdrawalQuery = withdrawalQuery.lte('created_at', dateTo + 'T23:59:59');
        bondpayQuery = bondpayQuery.lte('created_at', dateTo + 'T23:59:59');
      }

      const [withdrawalResult, bondpayResult] = await Promise.all([
        withdrawalQuery,
        bondpayQuery
      ]);

      if (withdrawalResult.error) throw withdrawalResult.error;
      if (bondpayResult.error) throw bondpayResult.error;

      setMerchantWithdrawals(withdrawalResult.data || []);
      setBondpayPayouts(bondpayResult.data || []);
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
          setNewPayoutAlert(true);
          fetchData();
          
          // Show toast notification
          toast({
            title: language === 'zh' ? '新代付请求' : 'New Payout Request',
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
  }, [statusFilter, dateFrom, dateTo]);

  const handleAction = async () => {
    if (!selectedPayout || !actionType) return;
    
    setIsProcessing(true);
    try {
      if (selectedPayout.extra === 'withdrawal') {
        // Merchant withdrawal - just update status locally
        const newStatus = actionType === 'approve' ? 'success' : 'failed';
        
        const { error: txError } = await supabase
          .from('transactions')
          .update({ status: newStatus })
          .eq('id', selectedPayout.id);

        if (txError) throw txError;

        if (selectedPayout.merchants) {
          const { data: currentMerchant } = await supabase
            .from('merchants')
            .select('balance, frozen_balance')
            .eq('id', selectedPayout.merchants.id)
            .single();

          if (currentMerchant) {
            if (actionType === 'reject') {
              await supabase
                .from('merchants')
                .update({
                  balance: currentMerchant.balance + selectedPayout.amount,
                  frozen_balance: Math.max(0, (currentMerchant.frozen_balance || 0) - selectedPayout.amount),
                })
                .eq('id', selectedPayout.merchants.id);
            } else {
              await supabase
                .from('merchants')
                .update({
                  frozen_balance: Math.max(0, (currentMerchant.frozen_balance || 0) - selectedPayout.amount),
                })
                .eq('id', selectedPayout.merchants.id);
            }
          }
        }

        toast({
          title: t('common.success'),
          description: actionType === 'approve' 
            ? (language === 'zh' ? '已批准' : 'Approved')
            : (language === 'zh' ? '已拒绝' : 'Rejected'),
        });
      } else {
        // BondPay payout - call the process-payout edge function
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
            ? (language === 'zh' ? '已发送到BondPay' : 'Sent to BondPay')
            : (language === 'zh' ? '已拒绝' : 'Rejected'),
        });
      }

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

  const currentData = activeTab === 'merchant' ? merchantWithdrawals : bondpayPayouts;
  const filteredData = currentData.filter(w => 
    w.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Order No', 'Merchant', 'Amount', 'Fee', 'Bank', 'Account', 'Holder', 'IFSC', 'Status', 'Created'];
    const csvData = filteredData.map(w => [
      w.order_no,
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
    a.download = `${activeTab}-payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: t('common.success'), description: t('admin.exportSuccess') });
  };

  const merchantPendingCount = merchantWithdrawals.filter(w => w.status === 'pending').length;
  const bondpayPendingCount = bondpayPayouts.filter(w => w.status === 'pending').length;
  const bondpayPendingAmount = bondpayPayouts.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);

  const renderTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="whitespace-nowrap">{t('transactions.orderNo')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('common.merchant')}</TableHead>
            <TableHead className="text-right whitespace-nowrap">{t('transactions.amount')}</TableHead>
            <TableHead className="whitespace-nowrap hidden md:table-cell">{language === 'zh' ? '银行' : 'Bank'}</TableHead>
            <TableHead className="whitespace-nowrap hidden lg:table-cell">{language === 'zh' ? '账户' : 'Account'}</TableHead>
            <TableHead className="whitespace-nowrap">{t('common.status')}</TableHead>
            <TableHead className="whitespace-nowrap hidden sm:table-cell">{t('common.createdAt')}</TableHead>
            <TableHead className="text-center whitespace-nowrap">{t('common.actions')}</TableHead>
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
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {t('common.noData')}
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((w) => (
              <TableRow key={w.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-mono text-xs">
                  <span className="truncate block max-w-[90px] md:max-w-none">{w.order_no}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[80px] md:max-w-none">{w.merchants?.merchant_name}</p>
                    <p className="text-xs text-muted-foreground hidden md:block">{w.merchants?.account_number}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <p className="font-semibold text-sm">₹{w.amount.toLocaleString()}</p>
                    {w.fee > 0 && <p className="text-xs text-muted-foreground">Fee: ₹{w.fee}</p>}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm truncate max-w-[100px]">{w.bank_name || '-'}</p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div>
                    <p className="text-xs font-mono">{w.account_number || '-'}</p>
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
                  {w.status === 'pending' && (
                    <div className="flex justify-center gap-1">
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
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 relative">
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
              {newPayoutAlert && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{language === 'zh' ? '代付管理' : 'Payout Management'}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {language === 'zh' ? '审批代付请求并发送到BondPay' : 'Approve payout requests & send to BondPay'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { fetchData(); setNewPayoutAlert(false); }} 
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'merchant' | 'bondpay')}>
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="bondpay" className="flex items-center gap-2 py-3 relative">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? 'BondPay代付' : 'BondPay Payouts'}</span>
              <span className="sm:hidden">{language === 'zh' ? '代付' : 'Payouts'}</span>
              {bondpayPendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 animate-pulse">
                  {bondpayPendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="merchant" className="flex items-center gap-2 py-3">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '商户提现' : 'Merchant Withdrawals'}</span>
              <span className="sm:hidden">{language === 'zh' ? '提现' : 'Withdrawals'}</span>
              {merchantPendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {merchantPendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '总计' : 'Total'}</p>
                <p className="text-lg md:text-xl font-bold">{filteredData.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '待审批' : 'Pending'}</p>
                <p className="text-lg md:text-xl font-bold text-yellow-500">
                  {activeTab === 'bondpay' ? bondpayPendingCount : merchantPendingCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '待处理金额' : 'Pending Amt'}</p>
                <p className="text-lg md:text-xl font-bold text-orange-500">
                  ₹{(activeTab === 'bondpay' ? bondpayPendingAmount : merchantWithdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0)).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '已完成' : 'Completed'}</p>
                <p className="text-lg md:text-xl font-bold text-green-500">
                  {filteredData.filter(w => w.status === 'success').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mt-4">
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
                    placeholder={t('common.search')}
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

          <TabsContent value="bondpay" className="mt-4">
            <Card>
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {language === 'zh' ? 'API代付请求 - 批准后发送到BondPay' : 'API Payout Requests - Approve to send to BondPay'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchant" className="mt-4">
            <Card>
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {language === 'zh' ? '商户提现请求 - 手动处理' : 'Merchant Withdrawal Requests - Manual Processing'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderTable()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                      <span className="text-muted-foreground">{language === 'zh' ? '订单号' : 'Order'}</span>
                      <span className="font-mono">{selectedPayout?.order_no}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '金额' : 'Amount'}</span>
                      <span className="font-bold text-lg">₹{selectedPayout?.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '商户' : 'Merchant'}</span>
                      <span>{selectedPayout?.merchants?.merchant_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '银行' : 'Bank'}</span>
                      <span>{selectedPayout?.bank_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '账户' : 'Account'}</span>
                      <span className="font-mono">{selectedPayout?.account_number}</span>
                    </div>
                  </div>
                  
                  {actionType === 'approve' && !selectedPayout?.extra && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        {language === 'zh' ? '批准后将自动发送到BondPay处理' : 'Will be sent to BondPay for processing'}
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