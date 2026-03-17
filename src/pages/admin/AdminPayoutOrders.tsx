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
import { Search, Download, ArrowUpFromLine, Trash2, CheckCircle2, XCircle, RefreshCw, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', PKR: 'Rs.', BDT: '৳' };
const getCurrencySymbol = (currency?: string | null) => CURRENCY_SYMBOLS[currency || 'INR'] || '₹';

interface Transaction {
  id: string;
  order_no: string;
  merchant_order_no: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  ifsc_code: string | null;
  created_at: string;
  merchant_id: string;
  gateway_id: string | null;
  merchants: { merchant_name: string; account_number: string; balance: number; frozen_balance: number; gateway_id: string | null } | null;
  payment_gateways: { currency: string } | null;
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

  // Edit dialog state
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', fee: '', status: '', bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Gateway currency cache for merchants (merchant_gateway_id -> currency)
  const [merchantGatewayCurrencies, setMerchantGatewayCurrencies] = useState<Record<string, string>>({});

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(merchant_name, account_number, balance, frozen_balance, gateway_id), payment_gateways(currency)')
        .eq('transaction_type', 'payout')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);

      // For transactions without gateway_id, fetch merchant's gateway currency
      const merchantGatewayIds = new Set<string>();
      (data || []).forEach((tx: any) => {
        if (!tx.gateway_id && tx.merchants?.gateway_id) {
          merchantGatewayIds.add(tx.merchants.gateway_id);
        }
      });
      if (merchantGatewayIds.size > 0) {
        const { data: gateways } = await supabase
          .from('payment_gateways')
          .select('id, currency')
          .in('id', Array.from(merchantGatewayIds));
        const map: Record<string, string> = {};
        (gateways || []).forEach(g => { map[g.id] = g.currency; });
        setMerchantGatewayCurrencies(map);
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [statusFilter, dateFrom, dateTo]);

  // Auto-check processing payouts every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const processingTxs = transactions.filter(tx => tx.status === 'processing');
      if (processingTxs.length === 0) return;

      let anyUpdated = false;
      for (const tx of processingTxs) {
        try {
          const { data, error } = await supabase.functions.invoke('check-order-status', {
            body: { order_no: tx.order_no, auto_update: true },
          });
          if (!error && data?.auto_updated) anyUpdated = true;
        } catch (e) { /* skip */ }
      }
      if (anyUpdated) fetchTransactions();
    }, 15000);

    return () => clearInterval(interval);
  }, [transactions]);

  const getTxCurrency = (tx: Transaction) => {
    // Priority: transaction's gateway currency > merchant's gateway currency > INR
    if (tx.payment_gateways?.currency) return tx.payment_gateways.currency;
    if (tx.merchants?.gateway_id && merchantGatewayCurrencies[tx.merchants.gateway_id]) return merchantGatewayCurrencies[tx.merchants.gateway_id];
    return 'INR';
  };

  const filteredTransactions = transactions.filter(tx =>
    tx.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchant_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTransactions = filteredTransactions.filter(tx => tx.status === 'pending' || tx.status === 'processing');

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
            description: `Payout ${data.gateway_status}. Status synced for ${data.merchant}.`,
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
    if (tx.status !== 'pending' && tx.status !== 'processing') return;
    setProcessingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: { transaction_id: tx.id, action: 'manual_success' },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Manual success failed');

      toast({ title: '✅ Success', description: `Payout manually marked as success.` });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprovePayout = async (tx: Transaction) => {
    if (tx.status !== 'pending') return;
    if (!confirm(`Send this payout to gateway?\n${tx.account_holder_name || ''} - ${tx.bank_name || ''}\nAccount: ${tx.account_number || ''}\nAmount: ₹${tx.amount.toLocaleString()}`)) return;
    setProcessingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: { transaction_id: tx.id, action: 'approve' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Approve failed');
      toast({ title: '✅ Sent to Gateway', description: 'Payout is now processing. Status will auto-update on gateway callback.' });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order Number', 'Merchant', 'Amount', 'Fee', 'Currency', 'Status', 'Bank Name', 'Created At'];
    const csvData = filteredTransactions.map(tx => [
      tx.order_no, `${tx.merchants?.merchant_name || ''} (${tx.merchants?.account_number || ''})`,
      tx.amount.toString(), tx.fee?.toString() || '0', getTxCurrency(tx), tx.status, tx.bank_name || '-',
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
    if (!confirm('Are you sure you want to delete this payout? Transaction will be permanently removed. Balance will NOT be returned to merchant.')) return;
    try {
      // If pending, just remove frozen balance (no refund to merchant)
      const tx = transactions.find(t => t.id === txId);
      if (tx && tx.status === 'pending') {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('frozen_balance')
          .eq('id', tx.merchant_id)
          .single();
        
        if (merchant) {
          const unfreezeAmount = tx.amount + (tx.fee || 0);
          await supabase
            .from('merchants')
            .update({
              frozen_balance: Math.max(0, (merchant.frozen_balance || 0) - unfreezeAmount),
            })
            .eq('id', tx.merchant_id);
        }
      }

      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'Transaction deleted permanently' });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectPayout = async (tx: Transaction) => {
    if (tx.status !== 'pending') return;
    setProcessingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: { transaction_id: tx.id, action: 'reject' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Reject failed');

      toast({ title: '✅ Rejected', description: 'Payout rejected. Amount refunded to merchant balance.' });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  // Edit transaction handlers
  const openEditDialog = (tx: Transaction) => {
    setEditTx(tx);
    setEditForm({
      amount: tx.amount.toString(),
      fee: (tx.fee || 0).toString(),
      status: tx.status,
      bank_name: tx.bank_name || '',
      account_holder_name: tx.account_holder_name || '',
      account_number: tx.account_number || '',
      ifsc_code: tx.ifsc_code || '',
    });
  };

  const handleEditSave = async () => {
    if (!editTx) return;
    setEditSaving(true);
    try {
      const amount = parseFloat(editForm.amount);
      const fee = parseFloat(editForm.fee);
      const net_amount = amount - fee;

      const { error } = await supabase
        .from('transactions')
        .update({
          amount,
          fee,
          net_amount,
          status: editForm.status as any,
          bank_name: editForm.bank_name || null,
          account_holder_name: editForm.account_holder_name || null,
          account_number: editForm.account_number || null,
          ifsc_code: editForm.ifsc_code || null,
        })
        .eq('id', editTx.id);

      if (error) throw error;
      toast({ title: '✅ Updated', description: 'Transaction updated successfully.' });
      setEditTx(null);
      fetchTransactions();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
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
                    <SelectItem value="processing">Processing</SelectItem>
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
                    filteredTransactions.map((tx) => {
                      const sym = getCurrencySymbol(getTxCurrency(tx));
                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-sm">{tx.order_no}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.merchants?.merchant_name}</p>
                              <p className="text-xs text-muted-foreground">{tx.merchants?.account_number}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{sym}{tx.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{sym}{(tx.fee || 0).toLocaleString()}</TableCell>
                          <TableCell><StatusBadge status={tx.status} /></TableCell>
                          <TableCell>{tx.bank_name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-1">
                                {(tx.status === 'pending' || tx.status === 'processing') && (
                                  <>
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
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                                              onClick={() => handleApprovePayout(tx)}
                                              disabled={processingId === tx.id}
                                            >
                                              {processingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Approve (Send to Gateway)</TooltipContent>
                                        </Tooltip>
                                      </>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                          onClick={() => handleManualSuccess(tx)}
                                          disabled={processingId === tx.id}
                                        >
                                          {processingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Manual Success (No Gateway Call)</TooltipContent>
                                    </Tooltip>
                                    {tx.status === 'pending' && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                            onClick={() => {
                                              if (confirm(`Reject this payout? ₹${(tx.amount + (tx.fee || 0)).toLocaleString()} will be returned to ${tx.merchants?.merchant_name || 'merchant'}'s balance.`)) {
                                                handleRejectPayout(tx);
                                              }
                                            }}
                                            disabled={processingId === tx.id}
                                          >
                                            <XCircle className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Reject & Return Balance</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </>
                                )}
                                {/* Edit button - available for all statuses */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => openEditDialog(tx)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Transaction</TooltipContent>
                                </Tooltip>
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Transaction Dialog */}
        <Dialog open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payout Transaction</DialogTitle>
              <DialogDescription>Order: {editTx?.order_no}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" value={editForm.amount} onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fee</Label>
                  <Input type="number" value={editForm.fee} onChange={(e) => setEditForm(f => ({ ...f, fee: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input value={editForm.account_holder_name} onChange={(e) => setEditForm(f => ({ ...f, account_holder_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={editForm.account_number} onChange={(e) => setEditForm(f => ({ ...f, account_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={editForm.bank_name} onChange={(e) => setEditForm(f => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={editForm.ifsc_code} onChange={(e) => setEditForm(f => ({ ...f, ifsc_code: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTx(null)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayoutOrders;
