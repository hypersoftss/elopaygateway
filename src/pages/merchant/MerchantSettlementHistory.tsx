import { useState, useEffect } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Settlement {
  id: string;
  order_no: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'success' | 'failed';
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  usdt_address: string | null;
  created_at: string;
}

const MerchantSettlementHistory = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSettlements = async () => {
      if (!user?.merchantId) return;

      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('merchant_id', user.merchantId)
          .eq('transaction_type', 'payout')
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter as 'pending' | 'success' | 'failed');
        }

        const { data, error } = await query;

        if (error) throw error;
        setSettlements(data || []);
      } catch (error) {
        console.error('Error fetching settlements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettlements();
  }, [user?.merchantId, statusFilter]);

  const filteredSettlements = settlements.filter(s =>
    s.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t('transactions.success')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('transactions.failed')}</Badge>;
      default:
        return <Badge variant="secondary">{t('transactions.pending')}</Badge>;
    }
  };

  const exportCSV = () => {
    const headers = ['Order No', 'Amount', 'Fee', 'Net Amount', 'Status', 'Bank/USDT', 'Account', 'Holder', 'Date'];
    const rows = filteredSettlements.map(s => [
      s.order_no,
      s.amount,
      s.fee,
      s.net_amount,
      s.status,
      s.bank_name || 'USDT',
      s.account_number || s.usdt_address || '-',
      s.account_holder_name || '-',
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Stats calculation
  const stats = {
    total: settlements.length,
    pending: settlements.filter(s => s.status === 'pending').length,
    success: settlements.filter(s => s.status === 'success').length,
    failed: settlements.filter(s => s.status === 'failed').length,
    totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
    successAmount: settlements.filter(s => s.status === 'success').reduce((sum, s) => sum + s.amount, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('withdrawal.history')}</h1>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('common.export')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('common.total')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-blue-500">₹{stats.totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('transactions.pending')}</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('transactions.success')}</p>
              <p className="text-2xl font-bold text-green-500">{stats.success}</p>
              <p className="text-sm text-green-500">₹{stats.successAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('transactions.failed')}</p>
              <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'zh' ? '搜索订单号、持卡人...' : 'Search order, holder...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('transactions.pending')}</SelectItem>
                  <SelectItem value="success">{t('transactions.success')}</SelectItem>
                  <SelectItem value="failed">{t('transactions.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactions.orderNo')}</TableHead>
                  <TableHead>{language === 'zh' ? '类型' : 'Type'}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead className="text-right">{t('common.fee')}</TableHead>
                  <TableHead className="text-right">{t('transactions.netAmount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredSettlements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-mono text-sm">{settlement.order_no}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {settlement.usdt_address ? 'USDT' : settlement.bank_name || 'Bank'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{settlement.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">₹{settlement.fee?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-right text-green-500">₹{settlement.net_amount?.toLocaleString() || settlement.amount}</TableCell>
                      <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(settlement.created_at), 'MM-dd HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSettlementHistory;
