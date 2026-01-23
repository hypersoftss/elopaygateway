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
import { format } from 'date-fns';
import { Search, Download, RefreshCw, Wallet, Filter, Calendar, CheckCircle, XCircle, Plus, Building, CreditCard } from 'lucide-react';
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
  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>([]);
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
      // Withdrawal transactions are payouts with extra = 'withdrawal'
      let query = supabase
        .from('transactions')
        .select('*, merchants(id, merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .eq('extra', 'withdrawal')
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
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
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
      const fee = 0; // Admin manual withdrawal - no fee
      const netAmount = amount;

      // Create withdrawal transaction
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

      // Freeze amount from merchant balance
      const { error: merchantError } = await supabase
        .from('merchants')
        .update({
          balance: merchant.balance - amount,
          frozen_balance: (merchant as any).frozen_balance + amount,
        })
        .eq('id', merchant.id);

      if (merchantError) throw merchantError;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '手动提现已创建' : 'Manual withdrawal created successfully',
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
      
      // Update transaction status
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', selectedWithdrawal.id);

      if (txError) throw txError;

      // If rejected, unfreeze the amount back to balance
      if (actionType === 'reject' && selectedWithdrawal.merchants) {
        const merchant = selectedWithdrawal.merchants;
        const { error: merchantError } = await supabase
          .from('merchants')
          .update({
            balance: merchant.balance + selectedWithdrawal.amount,
            frozen_balance: merchant.frozen_balance - selectedWithdrawal.amount,
          })
          .eq('id', merchant.id);

        if (merchantError) throw merchantError;
      }

      // If approved, just remove from frozen (already deducted from balance)
      if (actionType === 'approve' && selectedWithdrawal.merchants) {
        const merchant = selectedWithdrawal.merchants;
        const { error: merchantError } = await supabase
          .from('merchants')
          .update({
            frozen_balance: merchant.frozen_balance - selectedWithdrawal.amount,
          })
          .eq('id', merchant.id);

        if (merchantError) throw merchantError;
      }

      toast({
        title: t('common.success'),
        description: actionType === 'approve' 
          ? t('admin.withdrawalApproved') 
          : t('admin.withdrawalRejected'),
      });

      fetchWithdrawals();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
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

  const filteredWithdrawals = withdrawals.filter(w => 
    w.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Order No', 'Merchant', 'Amount', 'Fee', 'Net Amount', 'Bank/USDT', 'Account', 'Status', 'Created At'];
    const csvData = filteredWithdrawals.map(w => [
      w.order_no,
      w.merchants?.merchant_name || '',
      w.amount.toString(),
      w.fee.toString(),
      w.net_amount.toString(),
      w.usdt_address ? 'USDT' : w.bank_name || '',
      w.usdt_address || w.account_number || '',
      w.status,
      format(new Date(w.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: t('common.success'),
      description: t('admin.exportSuccess'),
    });
  };

  const pendingAmount = filteredWithdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <Wallet className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('admin.withdrawals')}</h1>
              <p className="text-sm text-muted-foreground">{t('admin.withdrawalsDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsManualOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'zh' ? '手动提现' : 'Manual Withdrawal'}
            </Button>
            <Button variant="outline" onClick={fetchWithdrawals}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button onClick={exportToCSV} className="btn-gradient-primary">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="stat-card border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.totalWithdrawals')}</p>
                  <p className="text-2xl font-bold">{filteredWithdrawals.length}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Wallet className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingAmount')}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--warning))]">₹{pendingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--warning))]/10">
                  <Wallet className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.approvedCount')}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">
                    {filteredWithdrawals.filter(w => w.status === 'success').length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--success))]/10">
                  <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
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
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('transactions.orderNo')}</TableHead>
                    <TableHead>{t('common.merchant')}</TableHead>
                    <TableHead className="text-right">{t('transactions.amount')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('transactions.destination')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center">{t('common.actions')}</TableHead>
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
                  ) : filteredWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWithdrawals.map((w) => (
                      <TableRow key={w.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">{w.order_no}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{w.merchants?.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{w.merchants?.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{w.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={w.usdt_address ? 'secondary' : 'outline'}>
                            {w.usdt_address ? 'USDT' : 'Bank'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {w.usdt_address ? (
                            <span className="font-mono text-xs">{w.usdt_address.slice(0, 10)}...</span>
                          ) : (
                            <div>
                              <p className="text-sm">{w.bank_name}</p>
                              <p className="text-xs text-muted-foreground">{w.account_number}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={w.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(w.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {w.status === 'pending' && (
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[hsl(var(--success))] border-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                                onClick={() => {
                                  setSelectedWithdrawal(w);
                                  setActionType('approve');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedWithdrawal(w);
                                  setActionType('reject');
                                }}
                              >
                                <XCircle className="h-4 w-4" />
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
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedWithdrawal && !!actionType} onOpenChange={() => { setSelectedWithdrawal(null); setActionType(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'approve' ? t('admin.approveWithdrawal') : t('admin.rejectWithdrawal')}
              </AlertDialogTitle>
            <AlertDialogDescription>
                {actionType === 'approve' 
                  ? t('admin.approveWithdrawalDesc')
                  : t('admin.rejectWithdrawalDesc')}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAction}
                disabled={isProcessing}
                className={actionType === 'approve' ? 'btn-gradient-success' : 'bg-destructive hover:bg-destructive/90'}
              >
                {isProcessing ? t('common.processing') : actionType === 'approve' ? t('common.approve') : t('common.reject')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manual Withdrawal Dialog */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {language === 'zh' ? '手动创建提现' : 'Create Manual Withdrawal'}
              </DialogTitle>
              <DialogDescription>
                {language === 'zh' ? '为商户创建手动提现请求' : 'Create a manual withdrawal request for a merchant'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Merchant Select */}
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

              {/* Amount */}
              <div className="space-y-2">
                <Label>{language === 'zh' ? '提现金额' : 'Withdrawal Amount'}</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={manualWithdrawal.amount}
                  onChange={(e) => setManualWithdrawal({ ...manualWithdrawal, amount: e.target.value })}
                />
                {manualWithdrawal.merchantId && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '可用余额: ' : 'Available: '}
                    ₹{merchants.find(m => m.id === manualWithdrawal.merchantId)?.balance.toLocaleString() || 0}
                  </p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>{language === 'zh' ? '提现方式' : 'Withdrawal Type'}</Label>
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

              {/* Bank Details */}
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
                    <Label>{language === 'zh' ? '账户持有人姓名' : 'Account Holder Name'}</Label>
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

              {/* USDT Details */}
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

              {/* Submit */}
              <Button 
                className="w-full" 
                onClick={handleManualWithdrawal}
                disabled={isCreatingManual || !manualWithdrawal.merchantId || !manualWithdrawal.amount}
              >
                {isCreatingManual ? t('common.loading') : (language === 'zh' ? '创建提现请求' : 'Create Withdrawal')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWithdrawals;
