import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, RefreshCw, Power, Eye, EyeOff, Copy, Download, Users, TrendingUp, Wallet, Shield, ShieldOff } from 'lucide-react';
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
  DropdownMenuSeparator,
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
  api_key: string;
  payout_key: string;
  balance: number;
  frozen_balance: number;
  payin_fee: number;
  payout_fee: number;
  callback_url: string | null;
  is_active: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
}

const AdminMerchants = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set());

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
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-merchant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            merchantName: newMerchant.merchantName,
            email: newMerchant.email,
            password: newMerchant.password,
            payinFee: parseFloat(newMerchant.payinFee),
            payoutFee: parseFloat(newMerchant.payoutFee),
            callbackUrl: newMerchant.callbackUrl || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create merchant');
      }

      toast({
        title: t('common.success'),
        description: `${language === 'zh' ? '商户创建成功,账号:' : 'Merchant created with account:'} ${result.accountNumber}`,
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
        description: `${language === 'zh' ? '商户已' : 'Merchant'} ${merchant.is_active ? (language === 'zh' ? '禁用' : 'disabled') : (language === 'zh' ? '启用' : 'enabled')}`,
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

  const toggleApiKeyVisibility = (merchantId: string) => {
    const newSet = new Set(visibleApiKeys);
    if (newSet.has(merchantId)) {
      newSet.delete(merchantId);
    } else {
      newSet.add(merchantId);
    }
    setVisibleApiKeys(newSet);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.success'),
      description: `${label} ${language === 'zh' ? '已复制' : 'copied'}`,
    });
  };

  const exportToCSV = () => {
    const headers = ['Account Number', 'Name', 'Balance', 'Frozen Balance', 'Payin Fee', 'Payout Fee', 'Status', '2FA', 'Created At'];
    const csvData = filteredMerchants.map(m => [
      m.account_number,
      m.merchant_name,
      m.balance.toString(),
      m.frozen_balance.toString(),
      `${m.payin_fee}%`,
      `${m.payout_fee}%`,
      m.is_active ? 'Active' : 'Inactive',
      m.is_2fa_enabled ? 'Enabled' : 'Disabled',
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '导出成功' : 'Export successful',
    });
  };

  const filteredMerchants = merchants.filter(
    (m) =>
      m.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.account_number.includes(searchQuery)
  );

  const totalBalance = merchants.reduce((sum, m) => sum + Number(m.balance), 0);
  const activeMerchants = merchants.filter(m => m.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('merchants.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '管理所有商户账户及其设置' : 'Manage all merchant accounts and their settings'}
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                {t('merchants.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('merchants.create')}</DialogTitle>
                <DialogDescription>
                  {language === 'zh' ? '创建新的商户账户' : 'Create a new merchant account'}
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
                  <Label>{t('merchants.callbackUrl')} ({t('common.optional')})</Label>
                  <Input
                    value={newMerchant.callbackUrl}
                    onChange={(e) => setNewMerchant({ ...newMerchant, callbackUrl: e.target.value })}
                    placeholder="https://your-site.com/callback"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 btn-gradient-primary"
                    onClick={handleCreateMerchant}
                    disabled={isCreating || !newMerchant.merchantName || !newMerchant.email || !newMerchant.password}
                  >
                    {isCreating ? t('common.loading') : t('merchants.create')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchMerchants} />}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.totalMerchants')}</p>
                  <p className="text-3xl font-bold mt-1">{merchants.length}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-600 to-teal-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-80">{language === 'zh' ? '活跃商户' : 'Active Merchants'}</p>
                  <p className="text-3xl font-bold mt-1">{activeMerchants}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-80">{t('dashboard.totalBalance')}</p>
                  <p className="text-3xl font-bold mt-1">₹{totalBalance.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'zh' ? '按名称或账号搜索...' : 'Search by name or account number...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchMerchants}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              {language === 'zh' ? '导出CSV' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Merchants Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t('merchants.name')}</TableHead>
                  <TableHead>{language === 'zh' ? 'API密钥' : 'API Key'}</TableHead>
                  <TableHead className="text-right">{t('merchants.balance')}</TableHead>
                  <TableHead className="text-center">{language === 'zh' ? '费率' : 'Fees'}</TableHead>
                  <TableHead className="text-center">{language === 'zh' ? '安全' : 'Security'}</TableHead>
                  <TableHead className="text-center">{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMerchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <TableRow key={merchant.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{merchant.merchant_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{merchant.account_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {visibleApiKeys.has(merchant.id) 
                              ? merchant.api_key?.slice(0, 12) + '...'
                              : '••••••••••••'
                            }
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleApiKeyVisibility(merchant.id)}
                          >
                            {visibleApiKeys.has(merchant.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(merchant.api_key, 'API Key')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium text-primary">₹{Number(merchant.balance).toLocaleString()}</p>
                          {Number(merchant.frozen_balance) > 0 && (
                            <p className="text-xs text-orange-500">
                              Frozen: ₹{Number(merchant.frozen_balance).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            IN {merchant.payin_fee}%
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                            OUT {merchant.payout_fee}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={merchant.is_2fa_enabled 
                            ? "bg-green-500/10 text-green-600 border-green-500/20" 
                            : "bg-muted text-muted-foreground"
                          }
                        >
                          {merchant.is_2fa_enabled ? (
                            <><Shield className="h-3 w-3 mr-1" /> 2FA ON</>
                          ) : (
                            <><ShieldOff className="h-3 w-3 mr-1" /> 2FA OFF</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={merchant.is_active 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "bg-muted text-muted-foreground"
                          }
                        >
                          {merchant.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
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
                              {merchant.is_active ? (language === 'zh' ? '禁用' : 'Disable') : (language === 'zh' ? '启用' : 'Enable')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => copyToClipboard(merchant.api_key, 'API Key')}>
                              <Copy className="h-4 w-4 mr-2" />
                              {language === 'zh' ? '复制API密钥' : 'Copy API Key'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(merchant.payout_key, 'Payout Key')}>
                              <Copy className="h-4 w-4 mr-2" />
                              {language === 'zh' ? '复制提现密钥' : 'Copy Payout Key'}
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