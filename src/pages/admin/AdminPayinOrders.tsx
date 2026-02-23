import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Search, Download, ArrowDownToLine, Trash2, CheckCircle2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Transaction {
  id: string;
  order_no: string;
  merchant_order_no: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'success' | 'failed';
  bank_name: string | null;
  created_at: string;
  merchant_id: string;
  merchants: { merchant_name: string; account_number: string; balance: number } | null;
}

const AdminPayinOrders = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(merchant_name, account_number, balance)')
        .eq('transaction_type', 'payin')
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
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, dateFrom, dateTo]);

  const filteredTransactions = transactions.filter(tx =>
    tx.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchant_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchants?.account_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = () => {
    fetchTransactions();
  };

  const handleManualSuccess = async (tx: Transaction) => {
    if (tx.status !== 'pending') return;
    setProcessingId(tx.id);
    try {
      // 1. Update transaction status to success
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'success' as any,
          callback_data: {
            manual_approval: true,
            approved_at: new Date().toISOString(),
            approved_by: 'admin',
          } as any,
        })
        .eq('id', tx.id);

      if (txError) throw txError;

      // 2. Credit merchant balance
      const currentBalance = tx.merchants?.balance || 0;
      const newBalance = currentBalance + (tx.net_amount || 0);

      const { error: balanceError } = await supabase
        .from('merchants')
        .update({ balance: newBalance })
        .eq('id', tx.merchant_id);

      if (balanceError) throw balanceError;

      toast({
        title: '✅ Success',
        description: language === 'zh'
          ? `交易已手动标记为成功，商户余额已增加 ₹${tx.net_amount?.toLocaleString()}`
          : `Transaction marked as success. ₹${tx.net_amount?.toLocaleString()} credited to merchant balance.`,
      });

      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order Number', 'Merchant', 'Amount', 'Fee', 'Status', 'Bank Name', 'Created At'];
    const csvData = filteredTransactions.map(tx => [
      tx.order_no,
      `${tx.merchants?.merchant_name || ''} (${tx.merchants?.account_number || ''})`,
      tx.amount.toString(),
      tx.fee?.toString() || '0',
      tx.status,
      tx.bank_name || '-',
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payin-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: t('common.success'), description: language === 'zh' ? '导出成功' : 'Export successful' });
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(language === 'zh' ? '确定删除此交易吗？' : 'Are you sure you want to delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      toast({ title: t('common.success'), description: language === 'zh' ? '交易已删除' : 'Transaction deleted' });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <ArrowDownToLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('transactions.payin')}</h1>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'zh' ? '订单号' : 'Order Number'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="pending">{t('status.pending')}</SelectItem>
                    <SelectItem value="success">{t('status.success')}</SelectItem>
                    <SelectItem value="failed">{t('status.failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="w-40">
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                {t('common.search')}
              </Button>
              <Button onClick={exportToCSV} className="btn-gradient-primary">
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{language === 'zh' ? '订单号' : 'Order Number'}</TableHead>
                    <TableHead>{t('common.merchant')}</TableHead>
                    <TableHead className="text-right">{t('transactions.amount')}</TableHead>
                    <TableHead className="text-right">{t('transactions.fee')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{language === 'zh' ? '银行名称' : 'Bank Name'}</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center">{language === 'zh' ? '操作' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">{tx.order_no}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.merchants?.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{tx.merchants?.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{tx.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-muted-foreground">₹{(tx.fee || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={tx.status} />
                        </TableCell>
                        <TableCell>{tx.bank_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {tx.status === 'pending' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                    disabled={processingId === tx.id}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {language === 'zh' ? '确认手动标记成功？' : 'Confirm Manual Success?'}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                      <p>
                                        {language === 'zh'
                                          ? `此操作将标记订单 ${tx.order_no} 为成功，并将 ₹${tx.net_amount?.toLocaleString()} 添加到商户余额。`
                                          : `This will mark order ${tx.order_no} as SUCCESS and credit ₹${tx.net_amount?.toLocaleString()} to the merchant's balance.`}
                                      </p>
                                      <p className="font-semibold text-destructive">
                                        {language === 'zh' ? '此操作不可撤销！' : 'This action cannot be undone!'}
                                      </p>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{language === 'zh' ? '取消' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleManualSuccess(tx)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {language === 'zh' ? '确认成功' : 'Confirm Success'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTransaction(tx.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default AdminPayinOrders;
