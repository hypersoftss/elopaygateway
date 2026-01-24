import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Search, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMerchantCurrency } from '@/hooks/useMerchantCurrency';

interface Transaction {
  id: string;
  order_no: string;
  amount: number;
  fee: number;
  status: 'pending' | 'success' | 'failed';
  bank_name: string | null;
  created_at: string;
}

const MerchantPayoutOrders = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { currencySymbol: cs } = useMerchantCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    if (!user?.merchantId) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('id, order_no, amount, fee, status, bank_name, created_at')
        .eq('merchant_id', user.merchantId)
        .eq('transaction_type', 'payout')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'success' | 'failed');
      }

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({ title: 'Error', description: 'Failed to fetch transactions', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.merchantId, statusFilter, startDate, endDate]);

  const filteredTransactions = transactions.filter(tx =>
    tx.order_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['Order Number', 'Amount', 'Fee', 'Status', 'Bank Name', 'Created At'].join(','),
      ...filteredTransactions.map(tx => [
        tx.order_no,
        tx.amount,
        tx.fee || 0,
        tx.status,
        tx.bank_name || '-',
        format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast({ title: 'Success', description: 'Export completed' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pay-Out</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Order Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-muted/50 border-border">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px] bg-muted/50 border-border"
            placeholder="dd-mm-yyyy"
          />

          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px] bg-muted/50 border-border"
            placeholder="dd-mm-yyyy"
          />

          <Button variant="outline" onClick={fetchTransactions}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>

          <Button 
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Order Number</TableHead>
                  <TableHead className="text-muted-foreground">Merchant</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Fee</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Bank Name</TableHead>
                  <TableHead className="text-muted-foreground">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No Data
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border">
                      <TableCell className="font-mono text-sm text-primary">{tx.order_no}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user?.merchantName}</p>
                          <p className="text-xs text-muted-foreground">{user?.accountNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{cs}{Number(tx.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{cs}{Number(tx.fee || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            tx.status === 'success' 
                              ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0' 
                              : tx.status === 'pending' 
                              ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0' 
                              : 'bg-destructive/10 text-destructive border-0'
                          }
                        >
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tx.bank_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}
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

export default MerchantPayoutOrders;
