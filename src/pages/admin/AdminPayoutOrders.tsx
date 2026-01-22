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
import { format } from 'date-fns';
import { Search, Download, RefreshCw, ArrowUpFromLine, Filter, Calendar } from 'lucide-react';
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
  const { t } = useTranslation();
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
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
    fetchTransactions();
  }, [statusFilter, dateFrom, dateTo]);

  const filteredTransactions = transactions.filter(tx => 
    tx.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchant_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.merchants?.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Order No', 'Merchant', 'Amount', 'Fee', 'Bank Name', 'Account Holder', 'Account No', 'IFSC', 'Status', 'Created At'];
    const csvData = filteredTransactions.map(tx => [
      tx.order_no,
      tx.merchants?.merchant_name || '',
      tx.amount.toString(),
      tx.fee.toString(),
      tx.bank_name || '',
      tx.account_holder_name || '',
      tx.account_number || '',
      tx.ifsc_code || '',
      tx.status,
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
      description: t('admin.exportSuccess'),
    });
  };

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const pendingCount = filteredTransactions.filter(tx => tx.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
              <ArrowUpFromLine className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('admin.payoutOrders')}</h1>
              <p className="text-sm text-muted-foreground">{t('admin.payoutOrdersDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTransactions}>
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
          <Card className="stat-card border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.totalOrders')}</p>
                  <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-500/10">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingOrders')}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--warning))]">{pendingCount}</p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--warning))]/10">
                  <ArrowUpFromLine className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-destructive">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.totalAmount')}</p>
                  <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-destructive/10">
                  <ArrowUpFromLine className="h-5 w-5 text-destructive" />
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

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('transactions.orderNo')}</TableHead>
                    <TableHead>{t('common.merchant')}</TableHead>
                    <TableHead className="text-right">{t('transactions.amount')}</TableHead>
                    <TableHead>{t('transactions.bankName')}</TableHead>
                    <TableHead>{t('transactions.accountHolder')}</TableHead>
                    <TableHead>{t('transactions.accountNo')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
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
                        <TableCell>{tx.bank_name || '-'}</TableCell>
                        <TableCell>{tx.account_holder_name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.account_number || '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={tx.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
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
