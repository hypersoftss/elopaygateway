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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Search, Download, RefreshCw, Wallet, Filter, Calendar, CheckCircle, XCircle, Plus, Building, CreditCard, Send, ArrowUpFromLine } from 'lucide-react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WithdrawalTransaction {
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
  merchants: { id: string; merchant_name: string; account_number: string; balance: number; frozen_balance: number } | null;
}

interface MerchantOption {
  id: string;
  merchant_name: string;
  account_number: string;
  balance: number;
}

const AdminWithdrawals = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'merchant' | 'bondpay'>('merchant');
  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>([]);
  const [bondpayPayouts, setBondpayPayouts] = useState<WithdrawalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalTransaction | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual Withdrawal State
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [manualWithdrawal, setManualWithdrawal] = useState({
    merchantId: '',
    amount: '',
    type: 'bank' as 'bank' | 'usdt',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    usdtAddress: '',
  });
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      // Merchant Withdrawals (extra = 'withdrawal')
      let withdrawalQuery = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .eq('extra', 'withdrawal')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        withdrawalQuery = withdrawalQuery.eq('status', statusFilter as 'pending' | 'success' | 'failed');
      }
      if (dateFrom) {
        withdrawalQuery = withdrawalQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        withdrawalQuery = withdrawalQuery.lte('created_at', dateTo + 'T23:59:59');
      }

      // BondPay Payouts (extra is null - API initiated)
      let bondpayQuery = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .is('extra', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        bondpayQuery = bondpayQuery.eq('status', statusFilter as 'pending' | 'success' | 'failed');
      }
      if (dateFrom) {
        bondpayQuery = bondpayQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        bondpayQuery = bondpayQuery.lte('created_at', dateTo + 'T23:59:59');
      }

      const [withdrawalResult, bondpayResult] = await Promise.all([
        withdrawalQuery,
        bondpayQuery
      ]);

      if (withdrawalResult.error) throw withdrawalResult.error;
      if (bondpayResult.error) throw bondpayResult.error;

      setWithdrawals(withdrawalResult.data || []);
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

  useEffect(() => {
    fetchWithdrawals();
    fetchMerchants();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, merchant_name, account_number, balance')
        .eq('is_active', true)
        .order('merchant_name');

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  };

  const generateOrderNo = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WD${timestamp}${random}`;
  };

  const handleManualWithdrawal = async () => {
    const merchant = merchants.find(m => m.id === manualWithdrawal.merchantId);
    if (!merchant) return;

    const amount = parseFloat(manualWithdrawal.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('common.error'),
        description: language === 'zh' ? '请输入有效金额' : 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount > merchant.balance) {
      toast({
        title: t('common.error'),
        description: language === 'zh' ? '余额不足' : 'Insufficient balance',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingManual(true);
    try {
      const orderNo = generateOrderNo();
      const fee = 0;
      const netAmount = amount;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          order_no: orderNo,
          merchant_id: manualWithdrawal.merchantId,
          amount,
          fee,
          net_amount: netAmount,
          transaction_type: 'payout',
          status: 'pending',
          extra: 'withdrawal',
          bank_name: manualWithdrawal.type === 'bank' ? manualWithdrawal.bankName : null,
          account_number: manualWithdrawal.type === 'bank' ? manualWithdrawal.accountNumber : null,
          account_holder_name: manualWithdrawal.type === 'bank' ? manualWithdrawal.accountHolderName : null,
          ifsc_code: manualWithdrawal.type === 'bank' ? manualWithdrawal.ifscCode : null,
          usdt_address: manualWithdrawal.type === 'usdt' ? manualWithdrawal.usdtAddress : null,
        });

      if (txError) throw txError;

      const { data: currentMerchant } = await supabase
        .from('merchants')
        .select('balance, frozen_balance')
        .eq('id', merchant.id)
        .single();

      if (currentMerchant) {
        const { error: merchantError } = await supabase
          .from('merchants')
          .update({
            balance: currentMerchant.balance - amount,
            frozen_balance: (currentMerchant.frozen_balance || 0) + amount,
          })
          .eq('id', merchant.id);

        if (merchantError) throw merchantError;
      }

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '手动提现已创建' : 'Manual withdrawal created',
      });

      setIsManualOpen(false);
      setManualWithdrawal({
        merchantId: '',
        amount: '',
        type: 'bank',
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        usdtAddress: '',
      });
      fetchWithdrawals();
      fetchMerchants();
    } catch (error) {
      console.error('Error creating manual withdrawal:', error);
      toast({
        title: t('common.error'),
        description: language === 'zh' ? '创建失败' : 'Failed to create withdrawal',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionType) return;
    
    setIsProcessing(true);
    try {
      const newStatus = actionType === 'approve' ? 'success' : 'failed';
      
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', selectedWithdrawal.id);

      if (txError) throw txError;

      // Only handle balance for merchant withdrawals
      if (selectedWithdrawal.extra === 'withdrawal' && selectedWithdrawal.merchants) {
        const { data: currentMerchant } = await supabase
          .from('merchants')
          .select('balance, frozen_balance')
          .eq('id', selectedWithdrawal.merchants.id)
          .single();

        if (currentMerchant) {
          if (actionType === 'reject') {
            // Unfreeze and restore balance
            await supabase
              .from('merchants')
              .update({
                balance: currentMerchant.balance + selectedWithdrawal.amount,
                frozen_balance: (currentMerchant.frozen_balance || 0) - selectedWithdrawal.amount,
              })
              .eq('id', selectedWithdrawal.merchants.id);
          } else {
            // Just remove from frozen
            await supabase
              .from('merchants')
              .update({
                frozen_balance: (currentMerchant.frozen_balance || 0) - selectedWithdrawal.amount,
              })
              .eq('id', selectedWithdrawal.merchants.id);
          }
        }
      }

      toast({
        title: t('common.success'),
        description: actionType === 'approve' 
          ? (language === 'zh' ? '已批准' : 'Approved')
          : (language === 'zh' ? '已拒绝' : 'Rejected'),
      });

      fetchWithdrawals();
    } catch (error) {
      console.error('Error processing:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedWithdrawal(null);
      setActionType(null);
    }
  };

  const currentData = activeTab === 'merchant' ? withdrawals : bondpayPayouts;
  const filteredData = currentData.filter(w => 
    w.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Order No', 'Merchant', 'Amount', 'Fee', 'Net Amount', 'Type', 'Account', 'Status', 'Created At'];
    const csvData = filteredData.map(w => [
      w.order_no,
      w.merchants?.merchant_name || '',
      w.amount.toString(),
      w.fee.toString(),
      w.net_amount.toString(),
      w.usdt_address ? 'USDT' : w.bank_name || 'Bank',
      w.usdt_address || w.account_number || '',
      w.status,
      format(new Date(w.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: t('common.success'),
      description: t('admin.exportSuccess'),
    });
  };

  const merchantPendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const merchantPendingAmount = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
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
            <TableHead className="whitespace-nowrap">{t('common.type')}</TableHead>
            <TableHead className="whitespace-nowrap hidden md:table-cell">{t('transactions.destination')}</TableHead>
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
                <TableCell className="font-mono text-xs md:text-sm">
                  <span className="truncate block max-w-[100px] md:max-w-none">{w.order_no}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[100px] md:max-w-none">{w.merchants?.merchant_name}</p>
                    <p className="text-xs text-muted-foreground hidden md:block">{w.merchants?.account_number}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-sm">₹{w.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={w.usdt_address ? 'secondary' : 'outline'} className="text-xs">
                    {w.usdt_address ? 'USDT' : 'Bank'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {w.usdt_address ? (
                    <span className="font-mono text-xs">{w.usdt_address.slice(0, 10)}...</span>
                  ) : (
                    <div>
                      <p className="text-xs">{w.bank_name}</p>
                      <p className="text-xs text-muted-foreground">{w.account_number}</p>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                  {format(new Date(w.created_at), 'MMM dd, HH:mm')}
                </TableCell>
                <TableCell>
                  {w.status === 'pending' && (
                    <div className="flex justify-center gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500 hover:bg-green-500/10 h-7 w-7 md:h-8 md:w-8 p-0"
                        onClick={() => {
                          setSelectedWithdrawal(w);
                          setActionType('approve');
                        }}
                      >
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10 h-7 w-7 md:h-8 md:w-8 p-0"
                        onClick={() => {
                          setSelectedWithdrawal(w);
                          setActionType('reject');
                        }}
                      >
                        <XCircle className="h-3 w-3 md:h-4 md:w-4" />
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
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{t('admin.withdrawals')}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {language === 'zh' ? '管理商户提现和BondPay代付' : 'Manage merchant withdrawals & BondPay payouts'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsManualOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              {language === 'zh' ? '手动提现' : 'Manual'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals} className="flex-1 sm:flex-none">
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
            <TabsTrigger value="merchant" className="flex items-center gap-2 py-3">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '商户提现' : 'Merchant'}</span>
              <Badge variant="secondary" className="ml-1">
                {merchantPendingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="bondpay" className="flex items-center gap-2 py-3">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? 'BondPay代付' : 'BondPay'}</span>
              <Badge variant="secondary" className="ml-1">
                {bondpayPendingCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '总计' : 'Total'}</p>
                <p className="text-lg md:text-xl font-bold">{filteredData.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '待处理' : 'Pending'}</p>
                <p className="text-lg md:text-xl font-bold text-yellow-500">
                  {activeTab === 'merchant' ? merchantPendingCount : bondpayPendingCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '待处理金额' : 'Pending Amt'}</p>
                <p className="text-lg md:text-xl font-bold text-orange-500">
                  ₹{(activeTab === 'merchant' ? merchantPendingAmount : bondpayPendingAmount).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground">{language === 'zh' ? '已批准' : 'Approved'}</p>
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

          <TabsContent value="merchant" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {renderTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bondpay" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {renderTable()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedWithdrawal && !!actionType} onOpenChange={() => { setSelectedWithdrawal(null); setActionType(null); }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'approve' 
                  ? (language === 'zh' ? '批准此请求？' : 'Approve this request?')
                  : (language === 'zh' ? '拒绝此请求？' : 'Reject this request?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '订单号' : 'Order'}</span>
                    <span className="font-mono text-sm">{selectedWithdrawal?.order_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '金额' : 'Amount'}</span>
                    <span className="font-bold">₹{selectedWithdrawal?.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '商户' : 'Merchant'}</span>
                    <span>{selectedWithdrawal?.merchants?.merchant_name}</span>
                  </div>
                </div>
                {actionType === 'reject' && selectedWithdrawal?.extra === 'withdrawal' && (
                  <p className="text-yellow-600 mt-3 text-sm">
                    {language === 'zh' ? '拒绝后金额将返还商户余额' : 'Amount will be refunded to merchant balance'}
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAction}
                disabled={isProcessing}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
              >
                {isProcessing ? t('common.processing') : actionType === 'approve' ? t('common.approve') : t('common.reject')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manual Withdrawal Dialog */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {language === 'zh' ? '手动创建提现' : 'Manual Withdrawal'}
              </DialogTitle>
              <DialogDescription>
                {language === 'zh' ? '为商户创建手动提现请求' : 'Create a manual withdrawal for a merchant'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '选择商户' : 'Select Merchant'}</Label>
                <Select 
                  value={manualWithdrawal.merchantId} 
                  onValueChange={(v) => setManualWithdrawal({ ...manualWithdrawal, merchantId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'zh' ? '选择商户' : 'Select merchant'} />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.merchant_name} - ₹{m.balance.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === 'zh' ? '提现金额' : 'Amount'}</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={manualWithdrawal.amount}
                  onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, amount: e.target.value })}
                />
                {manualWithdrawal.merchantId && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '可用: ' : 'Available: '}
                    ₹{merchants.find(m => m.id === manualWithdrawal.merchantId)?.balance.toLocaleString() || 0}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{language === 'zh' ? '提现方式' : 'Type'}</Label>
                <Select 
                  value={manualWithdrawal.type} 
                  onValueChange={(v: 'bank' | 'usdt') => setManualWithdrawal({ ...manualWithdrawal, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {language === 'zh' ? '银行转账' : 'Bank Transfer'}
                      </div>
                    </SelectItem>
                    <SelectItem value="usdt">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        USDT (TRC20)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {manualWithdrawal.type === 'bank' && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '银行名称' : 'Bank Name'}</Label>
                    <Input
                      value={manualWithdrawal.bankName}
                      onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, bankName: e.target.value })}
                      placeholder="ICICI Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '账户号码' : 'Account Number'}</Label>
                    <Input
                      value={manualWithdrawal.accountNumber}
                      onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, accountNumber: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '持有人姓名' : 'Account Holder'}</Label>
                    <Input
                      value={manualWithdrawal.accountHolderName}
                      onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, accountHolderName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={manualWithdrawal.ifscCode}
                      onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, ifscCode: e.target.value })}
                      placeholder="ICIC0001234"
                    />
                  </div>
                </div>
              )}

              {manualWithdrawal.type === 'usdt' && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                  <Label>{language === 'zh' ? 'USDT地址 (TRC20)' : 'USDT Address (TRC20)'}</Label>
                  <Input
                    value={manualWithdrawal.usdtAddress}
                    onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, usdtAddress: e.target.value })}
                    placeholder="T..."
                  />
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleManualWithdrawal}
                disabled={isCreatingManual || !manualWithdrawal.merchantId || !manualWithdrawal.amount}
              >
                {isCreatingManual ? t('common.loading') : (language === 'zh' ? '创建提现' : 'Create Withdrawal')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWithdrawals;