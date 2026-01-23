import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Search, Download, ArrowDownToLine, RefreshCw, Filter, Calendar, Activity, CheckCircle2, XOctagon, Clock } from 'lucide-react';
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
  created_at: string;
  merchants: { merchant_name: string; account_number: string } | null;
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

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, merchants(merchant_name, account_number)')
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
    tx.merchants?.account_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '导出成功' : 'Export successful',
    });
  };

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const successCount = filteredTransactions.filter(tx => tx.status === 'success').length;
  const pendingCount = filteredTransactions.filter(tx => tx.status === 'pending').length;
  const failedCount = filteredTransactions.filter(tx => tx.status === 'failed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-blue-600 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ArrowDownToLine className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('transactions.payin')}</h1>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'zh' ? '查看和管理所有代收订单' : 'View and manage all pay-in orders'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={fetchTransactions} className="bg-white/20 hover:bg-white/30 border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={exportToCSV} className="bg-white text-primary hover:bg-white/90">
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '总订单' : 'Total'}</p>
                  <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">₹{totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '成功' : 'Success'}</p>
                  <p className="text-2xl font-bold text-green-500">{successCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '待处理' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XOctagon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '失败' : 'Failed'}</p>
                  <p className="text-2xl font-bold text-red-500">{failedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
                  placeholder={language === 'zh' ? '搜索订单号/商户' : 'Search order/merchant'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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

        {/* Transactions Table */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              {language === 'zh' ? '代收订单列表' : 'Pay-In Orders'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '所有代收交易记录' : 'All pay-in transaction records'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">{language === 'zh' ? '订单号' : 'Order Number'}</TableHead>
                    <TableHead className="font-semibold">{t('common.merchant')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('transactions.amount')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('transactions.fee')}</TableHead>
                    <TableHead className="font-semibold">{t('common.status')}</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">{language === 'zh' ? '银行名称' : 'Bank Name'}</TableHead>
                    <TableHead className="font-semibold">{t('common.createdAt')}</TableHead>
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
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ArrowDownToLine className="h-12 w-12 opacity-20" />
                          <p>{t('common.noData')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm font-medium">{tx.order_no}</p>
                            {tx.merchant_order_no && (
                              <p className="text-xs text-muted-foreground">{tx.merchant_order_no}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.merchants?.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{tx.merchants?.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-base text-primary">₹{tx.amount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{(tx.fee || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tx.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {tx.bank_name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
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

export default AdminPayinOrders;
