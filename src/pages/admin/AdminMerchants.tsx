import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, RefreshCw, Power, Eye, EyeOff, Copy, Download, Users, TrendingUp, Wallet, Shield, ShieldOff, KeyRound, Lock, RotateCcw, Edit, UserPlus, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  user_id: string;
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

  // Edit Merchant State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newWithdrawalPassword, setNewWithdrawalPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Edit Merchant Functions
  const openEditDialog = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setNewPassword('');
    setNewWithdrawalPassword('');
    setIsEditOpen(true);
  };

  const handleResetPassword = async () => {
    if (!editingMerchant || !newPassword || newPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: language === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-merchant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            merchantId: editingMerchant.id,
            userId: editingMerchant.user_id,
            action: 'reset_password',
            newPassword,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '密码已重置' : 'Password reset successfully',
      });
      setNewPassword('');
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetWithdrawalPassword = async () => {
    if (!editingMerchant || !newWithdrawalPassword || newWithdrawalPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: language === 'zh' ? '提现密码至少6位' : 'Withdrawal password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ withdrawal_password: newWithdrawalPassword })
        .eq('id', editingMerchant.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '提现密码已重置' : 'Withdrawal password reset successfully',
      });
      setNewWithdrawalPassword('');
      fetchMerchants();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset2FA = async () => {
    if (!editingMerchant) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ 
          is_2fa_enabled: false, 
          google_2fa_secret: null 
        })
        .eq('id', editingMerchant.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '2FA已重置，商户需重新设置' : '2FA reset, merchant needs to set up again',
      });
      setEditingMerchant({ ...editingMerchant, is_2fa_enabled: false });
      fetchMerchants();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
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
  const totalFrozen = merchants.reduce((sum, m) => sum + Number(m.frozen_balance || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJsLTIgMnYtNGgtNHY0bC0yLTJjLTIgMC00IDItNCAyczIgMiAyIDR2Mmg0di00bDIgMmMyIDAgNC0yIDQtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('merchants.title')}</h1>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'zh' ? '管理所有商户账户及其设置' : 'Manage all merchant accounts and their settings'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={fetchMerchants} className="bg-white/20 hover:bg-white/30 border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={exportToCSV} className="bg-white/20 hover:bg-white/30 border-white/20 text-white">
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white text-teal-600 hover:bg-white/90">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('merchants.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      {t('merchants.create')}
                    </DialogTitle>
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
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchMerchants} />}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalMerchants')}</p>
                  <p className="text-2xl font-bold">{merchants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '活跃商户' : 'Active'}</p>
                  <p className="text-2xl font-bold text-green-500">{activeMerchants}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Wallet className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '总余额' : 'Total Balance'}</p>
                  <p className="text-xl font-bold text-teal-500">₹{totalBalance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Lock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'zh' ? '冻结余额' : 'Frozen'}</p>
                  <p className="text-xl font-bold text-orange-500">₹{totalFrozen.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card className="premium-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {language === 'zh' ? '商户列表' : 'Merchant List'}
                </CardTitle>
                <CardDescription>{language === 'zh' ? '所有注册商户' : 'All registered merchants'}</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'zh' ? '搜索商户名称或账号...' : 'Search by name or account...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">{t('merchants.accountNo')}</TableHead>
                    <TableHead className="font-semibold">{t('merchants.name')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('merchants.balance')}</TableHead>
                    <TableHead className="text-right font-semibold hidden md:table-cell">{language === 'zh' ? '冻结' : 'Frozen'}</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">{t('merchants.fees')}</TableHead>
                    <TableHead className="font-semibold">{t('common.status')}</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">2FA</TableHead>
                    <TableHead className="text-center font-semibold">{t('common.actions')}</TableHead>
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
                  ) : filteredMerchants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users className="h-12 w-12 opacity-20" />
                          <p>{t('common.noData')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMerchants.map((merchant) => (
                      <TableRow key={merchant.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">{merchant.account_number}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(merchant.account_number, 'Account')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{merchant.merchant_name}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-primary">₹{Number(merchant.balance).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          <span className="text-orange-500">₹{Number(merchant.frozen_balance || 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <span className="text-primary">{merchant.payin_fee}%</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-orange-500">{merchant.payout_fee}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={merchant.is_active ? 'default' : 'secondary'}
                            className={merchant.is_active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                          >
                            {merchant.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={merchant.is_2fa_enabled ? 'border-green-500 text-green-500' : ''}>
                            {merchant.is_2fa_enabled ? <Shield className="h-3 w-3 mr-1" /> : <ShieldOff className="h-3 w-3 mr-1" />}
                            {merchant.is_2fa_enabled ? 'ON' : 'OFF'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEditDialog(merchant)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {language === 'zh' ? '管理商户' : 'Manage'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleApiKeyVisibility(merchant.id)}>
                                {visibleApiKeys.has(merchant.id) ? (
                                  <EyeOff className="h-4 w-4 mr-2" />
                                ) : (
                                  <Eye className="h-4 w-4 mr-2" />
                                )}
                                {language === 'zh' ? 'API密钥' : 'API Keys'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleMerchantStatus(merchant)}>
                                <Power className="h-4 w-4 mr-2" />
                                {merchant.is_active 
                                  ? (language === 'zh' ? '禁用' : 'Disable') 
                                  : (language === 'zh' ? '启用' : 'Enable')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Merchant Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                {language === 'zh' ? '管理商户' : 'Manage Merchant'}
              </DialogTitle>
              <DialogDescription>
                {editingMerchant?.merchant_name} ({editingMerchant?.account_number})
              </DialogDescription>
            </DialogHeader>
            {editingMerchant && (
              <div className="space-y-6">
                {/* Reset Login Password */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      {language === 'zh' ? '重置登录密码' : 'Reset Login Password'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder={language === 'zh' ? '新密码 (最少6位)' : 'New password (min 6 chars)'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleResetPassword}
                      disabled={isUpdating || !newPassword}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '重置密码' : 'Reset Password'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Reset Withdrawal Password */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {language === 'zh' ? '重置提现密码' : 'Reset Withdrawal Password'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder={language === 'zh' ? '新提现密码 (最少6位)' : 'New withdrawal password (min 6 chars)'}
                      value={newWithdrawalPassword}
                      onChange={(e) => setNewWithdrawalPassword(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleResetWithdrawalPassword}
                      disabled={isUpdating || !newWithdrawalPassword}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '重置提现密码' : 'Reset Withdrawal Password'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Reset 2FA */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {language === 'zh' ? '双因素认证' : 'Two-Factor Authentication'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm">{language === 'zh' ? '当前状态' : 'Current Status'}</span>
                      <Badge variant={editingMerchant.is_2fa_enabled ? 'default' : 'secondary'}>
                        {editingMerchant.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    {editingMerchant.is_2fa_enabled && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleReset2FA}
                        disabled={isUpdating}
                      >
                        <ShieldOff className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '重置2FA' : 'Reset 2FA'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminMerchants;
