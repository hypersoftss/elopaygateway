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
import { Search, Download, ArrowUpFromLine, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  merchants: { merchant_name: string; account_number: string } | null;
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

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(merchant_name, account_number)')
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
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
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
    tx.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = () => {
    fetchTransactions();
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
    a.download = `payout-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '导出成功' : 'Export successful',
    });
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(language === 'zh' ? '确定删除此交易吗？' : 'Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '交易已删除' : 'Transaction deleted',
      });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
            <ArrowUpFromLine className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('transactions.payout')}</h1>
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
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="w-40">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
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
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
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
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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