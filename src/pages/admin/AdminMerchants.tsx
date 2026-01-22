import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, RefreshCw, Power } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Merchant {
  id: string;
  account_number: string;
  merchant_name: string;
  balance: number;
  frozen_balance: number;
  payin_fee: number;
  payout_fee: number;
  callback_url: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminMerchants = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create merchant form
  const [newMerchant, setNewMerchant] = useState({
    merchantName: '',
    email: '',
    password: '',
    payinFee: '9.0',
    payoutFee: '4.0',
    callbackUrl: '',
  });

  const fetchMerchants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMerchants(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleCreateMerchant = async () => {
    setIsCreating(true);

    try {
      // Generate account number
      const { data: accountData } = await supabase.rpc('generate_account_number');
      const accountNumber = accountData || `1${Date.now()}`.slice(0, 9);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newMerchant.email,
        password: newMerchant.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create merchant record
        const { error: merchantError } = await supabase
          .from('merchants')
          .insert({
            user_id: authData.user.id,
            account_number: accountNumber,
            merchant_name: newMerchant.merchantName,
            payin_fee: parseFloat(newMerchant.payinFee),
            payout_fee: parseFloat(newMerchant.payoutFee),
            callback_url: newMerchant.callbackUrl || null,
          });

        if (merchantError) throw merchantError;

        // Create merchant role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'merchant',
          });

        if (roleError) throw roleError;

        toast({
          title: t('common.success'),
          description: `Merchant created with account number: ${accountNumber}`,
        });

        setIsCreateOpen(false);
        setNewMerchant({
          merchantName: '',
          email: '',
          password: '',
          payinFee: '9.0',
          payoutFee: '4.0',
          callbackUrl: '',
        });
        fetchMerchants();
      }
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleMerchantStatus = async (merchant: Merchant) => {
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ is_active: !merchant.is_active })
        .eq('id', merchant.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: `Merchant ${merchant.is_active ? 'disabled' : 'enabled'}`,
      });
      fetchMerchants();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const filteredMerchants = merchants.filter(
    (m) =>
      m.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.account_number.includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">{t('merchants.title')}</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('merchants.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('merchants.create')}</DialogTitle>
                <DialogDescription>
                  Create a new merchant account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('merchants.name')}</Label>
                  <Input
                    value={newMerchant.merchantName}
                    onChange={(e) => setNewMerchant({ ...newMerchant, merchantName: e.target.value })}
                    placeholder="Merchant Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.email')}</Label>
                  <Input
                    type="email"
                    value={newMerchant.email}
                    onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })}
                    placeholder="merchant@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.password')}</Label>
                  <Input
                    type="password"
                    value={newMerchant.password}
                    onChange={(e) => setNewMerchant({ ...newMerchant, password: e.target.value })}
                    placeholder="Password (min 6 chars)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('merchants.payinFee')} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMerchant.payinFee}
                      onChange={(e) => setNewMerchant({ ...newMerchant, payinFee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('merchants.payoutFee')} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMerchant.payoutFee}
                      onChange={(e) => setNewMerchant({ ...newMerchant, payoutFee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('merchants.callbackUrl')}</Label>
                  <Input
                    value={newMerchant.callbackUrl}
                    onChange={(e) => setNewMerchant({ ...newMerchant, callbackUrl: e.target.value })}
                    placeholder="https://example.com/callback"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateMerchant}
                  disabled={isCreating || !newMerchant.merchantName || !newMerchant.email || !newMerchant.password}
                >
                  {isCreating ? t('common.loading') : t('common.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchMerchants} />}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchMerchants}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('merchants.accountNumber')}</TableHead>
                  <TableHead>{t('merchants.name')}</TableHead>
                  <TableHead>{t('merchants.balance')}</TableHead>
                  <TableHead>{t('merchants.payinFee')}</TableHead>
                  <TableHead>{t('merchants.payoutFee')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('merchants.createdAt')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMerchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell className="font-mono">{merchant.account_number}</TableCell>
                      <TableCell>{merchant.merchant_name}</TableCell>
                      <TableCell>
                        <div>₹{Number(merchant.balance).toFixed(2)}</div>
                        {Number(merchant.frozen_balance) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Frozen: ₹{Number(merchant.frozen_balance).toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{merchant.payin_fee}%</TableCell>
                      <TableCell>{merchant.payout_fee}%</TableCell>
                      <TableCell>
                        <Badge variant={merchant.is_active ? 'default' : 'secondary'}>
                          {merchant.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(merchant.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleMerchantStatus(merchant)}>
                              <Power className="h-4 w-4 mr-2" />
                              {merchant.is_active ? 'Disable' : 'Enable'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

export default AdminMerchants;
