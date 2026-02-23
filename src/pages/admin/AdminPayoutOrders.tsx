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
import { Search, Download, ArrowUpFromLine, Trash2, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Transaction {
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
  created_at: string;
  merchant_id: string;
  merchants: { merchant_name: string; account_number: string; balance: number; frozen_balance: number } | null;
}

const AdminPayoutOrders = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ checked: 0, updated: 0, total: 0 });

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(merchant_name, account_number, balance, frozen_balance)')
        .eq('transaction_type', 'payout')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [statusFilter, dateFrom, dateTo]);

  const filteredTransactions = transactions.filter(tx =>
    tx.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchant_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTransactions = filteredTransactions.filter(tx => tx.status === 'pending');

  const handleBulkCheck = async () => {
    if (pendingTransactions.length === 0) {
      toast({ title: 'No pending orders', description: 'There are no pending payout orders to check.' });
      return;
    }
    setBulkChecking(true);
    setBulkProgress({ checked: 0, updated: 0, total: pendingTransactions.length });

    let updated = 0;
    for (let i = 0; i < pendingTransactions.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke('check-order-status', {
          body: { order_no: pendingTransactions[i].order_no, auto_update: true },
        });
        if (!error && data?.auto_updated) updated++;
      } catch (e) { /* skip */ }
      setBulkProgress({ checked: i + 1, updated, total: pendingTransactions.length });
    }

    setBulkChecking(false);
    toast({
      title: `✅ Bulk Check Complete`,
      description: `Checked ${pendingTransactions.length} orders. ${updated} updated to success.`,
    });
    if (updated > 0) fetchTransactions();
  };

  const handleCheckGateway = async (tx: Transaction) => {
    setCheckingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke('check-order-status', {
        body: { order_no: tx.order_no, auto_update: true },
      });
      if (error) throw error;

      if (data.auto_updated) {
        toast({
          title: '✅ Gateway Verified & Updated!',
          description: `Payout ${data.gateway_status}. Frozen balance adjusted for ${data.merchant}.`,
        });
        fetchTransactions();
      } else {
        toast({
          title: `Gateway Status: ${data.gateway_status?.toUpperCase()}`,
          description: `Our status: ${data.our_status} | Gateway: ${data.gateway_status}`,
          variant: data.gateway_status === 'pending' ? 'default' : 'destructive',
        });
      }
    } catch (error: any) {
      toast({ title: 'Gateway Check Failed', description: error.message, variant: 'destructive' });
    } finally {
      setCheckingId(null);
    }
  };

  const handleManualSuccess = async (tx: Transaction) => {
    if (tx.status !== 'pending') return;
    setProcessingId(tx.id);
    try {
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'success' as any,
          callback_data: { manual_approval: true, approved_at: new Date().toISOString(), approved_by: 'admin' } as any,
        })
        .eq('id', tx.id);
      if (txError) throw txError;

      // Unfreeze the frozen amount for payout
      const unfreezeAmount = tx.amount + (tx.fee || 0);
      const currentFrozen = tx.merchants?.frozen_balance || 0;
      const { error: balanceError } = await supabase
        .from('merchants')
        .update({ frozen_balance: Math.max(0, currentFrozen - unfreezeAmount) })
        .eq('id', tx.merchant_id);
      if (balanceError) throw balanceError;

      toast({ title: '✅ Success', description: `Payout marked as success. Frozen balance released.` });
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
      tx.order_no, `${tx.merchants?.merchant_name || ''} (${tx.merchants?.account_number || ''})`,
      tx.amount.toString(), tx.fee?.toString() || '0', tx.status, tx.bank_name || '-',
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: t('common.success'), description: 'Export successful' });
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'Transaction deleted' });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
            <ArrowUpFromLine className="h-6 w-6 text-orange-500" />
          </div>
          <div><h1 className="text-2xl font-bold">{t('transactions.payout')}</h1></div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Order Number" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder={t('common.all')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="pending">{t('status.pending')}</SelectItem>
                    <SelectItem value="success">{t('status.success')}</SelectItem>
                    <SelectItem value="failed">{t('status.failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
              <div className="w-40"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
              <Button variant="outline" onClick={() => fetchTransactions()}><Search className="h-4 w-4 mr-2" />{t('common.search')}</Button>
              <Button onClick={exportToCSV} className="btn-gradient-primary"><Download className="h-4 w-4 mr-2" />{t('common.export')}</Button>
              <Button
                variant="outline"
                onClick={handleBulkCheck}
                disabled={bulkChecking || pendingTransactions.length === 0}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                {bulkChecking
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{bulkProgress.checked}/{bulkProgress.total} ({bulkProgress.updated} updated)</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />Bulk Check ({pendingTransactions.length})</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order Number</TableHead>
                    <TableHead>{t('common.merchant')}</TableHead>
                    <TableHead className="text-right">{t('transactions.amount')}</TableHead>
                    <TableHead className="text-right">{t('transactions.fee')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
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
                        <TableCell><StatusBadge status={tx.status} /></TableCell>
                        <TableCell>{tx.bank_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-1">
                              {tx.status === 'pending' && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => handleCheckGateway(tx)} disabled={checkingId === tx.id}>
                                        {checkingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Check Gateway Status</TooltipContent>
                                  </Tooltip>
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950" disabled={processingId === tx.id}>
                                            <CheckCircle2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Manual Success</TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Manual Payout Success?</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2">
                                          <p>This will mark payout <strong>{tx.order_no}</strong> as SUCCESS and release frozen balance of <strong>₹{(tx.amount + (tx.fee || 0)).toLocaleString()}</strong>.</p>
                                          <p className="font-semibold text-destructive">This action cannot be undone!</p>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleManualSuccess(tx)} className="bg-green-600 hover:bg-green-700">Confirm Success</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTransaction(tx.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
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

export default AdminPayoutOrders;
