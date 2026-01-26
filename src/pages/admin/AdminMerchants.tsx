import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, RefreshCw, Power, Eye, EyeOff, Copy, Download, Users, TrendingUp, Wallet, Shield, ShieldOff, KeyRound, Lock, RotateCcw, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
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
  gateway_id: string | null;
  payment_gateways?: {
    gateway_code: string;
    gateway_name: string;
    currency: string;
  } | null;
}

interface Gateway {
  id: string;
  gateway_code: string;
  gateway_name: string;
  gateway_type: string;
  currency: string;
  is_active: boolean;
  trade_type: string | null;
}

// Trade type options based on gateway currency
const TRADE_TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  BDT: [
    { value: 'nagad', label: 'Nagad' },
    { value: 'bkash', label: 'bKash' },
  ],
  PKR: [
    { value: 'easypaisa', label: 'Easypaisa' },
    { value: 'jazzcash', label: 'JazzCash' },
  ],
  INR: [], // No trade type selection for India
};

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
  
  // Extended edit fields
  const [editPayinFee, setEditPayinFee] = useState('');
  const [editPayoutFee, setEditPayoutFee] = useState('');
  const [editGatewayId, setEditGatewayId] = useState('');
  const [editTradeType, setEditTradeType] = useState('');

  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());

  const [newMerchant, setNewMerchant] = useState({
    merchantName: '',
    email: '',
    password: '',
    payinFee: '9.0',
    payoutFee: '4.0',
    callbackUrl: '',
    gatewayId: '',
    tradeType: '',
  });

  const fetchMerchants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('merchants')
        .select('*, payment_gateways(gateway_code, gateway_name, currency)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMerchants(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGateways = async () => {
    try {
      const { data } = await supabase
        .from('payment_gateways')
        .select('id, gateway_code, gateway_name, gateway_type, currency, is_active, trade_type')
        .eq('is_active', true)
        .order('gateway_name');
      setGateways(data || []);
    } catch (err) {
      console.error('Failed to fetch gateways:', err);
    }
  };

  useEffect(() => {
    fetchMerchants();
    fetchGateways();
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
            gatewayId: newMerchant.gatewayId || null,
            tradeType: newMerchant.tradeType || null,
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
        gatewayId: '',
        tradeType: '',
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
    setEditPayinFee(merchant.payin_fee?.toString() || '9');
    setEditPayoutFee(merchant.payout_fee?.toString() || '4');
    setEditGatewayId(merchant.gateway_id || '');
    setEditTradeType('');
    setIsEditOpen(true);
  };

  const handleUpdateFees = async () => {
    if (!editingMerchant) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ 
          payin_fee: parseFloat(editPayinFee),
          payout_fee: parseFloat(editPayoutFee)
        })
        .eq('id', editingMerchant.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '费率已更新' : 'Fees updated successfully',
      });
      setEditingMerchant({ ...editingMerchant, payin_fee: parseFloat(editPayinFee), payout_fee: parseFloat(editPayoutFee) });
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

  const handleUpdateGateway = async () => {
    if (!editingMerchant || !editGatewayId) return;
    setIsUpdating(true);
    try {
      const updateData: any = { 
        gateway_id: editGatewayId,
      };
      // Add trade type if selected
      if (editTradeType) {
        updateData.trade_type = editTradeType;
      }
      
      const { error } = await supabase
        .from('merchants')
        .update(updateData)
        .eq('id', editingMerchant.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '网关已更新' : 'Gateway updated successfully',
      });
      fetchMerchants();
      setIsEditOpen(false);
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

  const handleDeleteMerchant = async (merchant: Merchant) => {
    if (!confirm(language === 'zh' 
      ? `确定删除商户 "${merchant.merchant_name}" 吗？此操作不可撤销！` 
      : `Are you sure you want to delete "${merchant.merchant_name}"? This action cannot be undone!`)) {
      return;
    }

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
            merchantId: merchant.id,
            userId: merchant.user_id,
            action: 'delete',
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '商户已删除' : 'Merchant deleted successfully',
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

  // Bulk selection handlers
  const toggleSelectMerchant = (merchantId: string) => {
    const newSet = new Set(selectedMerchants);
    if (newSet.has(merchantId)) {
      newSet.delete(merchantId);
    } else {
      newSet.add(merchantId);
    }
    setSelectedMerchants(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedMerchants.size === filteredMerchants.length) {
      setSelectedMerchants(new Set());
    } else {
      setSelectedMerchants(new Set(filteredMerchants.map(m => m.id)));
    }
  };

  const handleBulkEnable = async () => {
    if (selectedMerchants.size === 0) return;
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ is_active: true })
        .in('id', Array.from(selectedMerchants));
      if (error) throw error;
      toast({ title: t('common.success'), description: `${selectedMerchants.size} merchants enabled` });
      setSelectedMerchants(new Set());
      fetchMerchants();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkDisable = async () => {
    if (selectedMerchants.size === 0) return;
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ is_active: false })
        .in('id', Array.from(selectedMerchants));
      if (error) throw error;
      toast({ title: t('common.success'), description: `${selectedMerchants.size} merchants disabled` });
      setSelectedMerchants(new Set());
      fetchMerchants();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    }
  };

  const exportSelectedToCSV = () => {
    const selectedList = filteredMerchants.filter(m => selectedMerchants.has(m.id));
    if (selectedList.length === 0) return;
    
    const headers = ['Account Number', 'Name', 'Balance', 'Frozen Balance', 'Payin Fee', 'Payout Fee', 'Status', '2FA', 'Created At'];
    const csvData = selectedList.map(m => [
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
    a.download = `selected-merchants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: t('common.success'), description: `${selectedList.length} merchants exported` });
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
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '支付网关' : 'Payment Gateway'} *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newMerchant.gatewayId}
                    onChange={(e) => {
                      const selectedGateway = gateways.find(g => g.id === e.target.value);
                      setNewMerchant({ 
                        ...newMerchant, 
                        gatewayId: e.target.value,
                        tradeType: '' // Reset trade type when gateway changes
                      });
                    }}
                  >
                    <option value="">{language === 'zh' ? '选择网关...' : 'Select gateway...'}</option>
                    {gateways.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        {gw.gateway_name} ({gw.currency})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Trade Type Selection - Only show for BDT/PKR gateways */}
                {(() => {
                  const selectedGateway = gateways.find(g => g.id === newMerchant.gatewayId);
                  const tradeTypes = selectedGateway ? TRADE_TYPE_OPTIONS[selectedGateway.currency] || [] : [];
                  if (tradeTypes.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <Label>{language === 'zh' ? '支付方式' : 'Trade Type'} *</Label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={newMerchant.tradeType}
                        onChange={(e) => setNewMerchant({ ...newMerchant, tradeType: e.target.value })}
                      >
                        <option value="">{language === 'zh' ? '选择支付方式...' : 'Select trade type...'}</option>
                        {tradeTypes.map((tt) => (
                          <option key={tt.value} value={tt.value}>
                            {tt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
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

        {/* Search, Bulk Actions and Export */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'zh' ? '按名称或账号搜索...' : 'Search by name or account number...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedMerchants.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedMerchants.size} selected</span>
                <Button size="sm" variant="outline" onClick={handleBulkEnable} className="h-7">
                  <Power className="h-3 w-3 mr-1" /> Enable
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDisable} className="h-7">
                  <Power className="h-3 w-3 mr-1" /> Disable
                </Button>
                <Button size="sm" variant="outline" onClick={exportSelectedToCSV} className="h-7">
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchMerchants}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              {language === 'zh' ? '导出全部' : 'Export All'}
            </Button>
          </div>
        </div>

        {/* Merchants Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={toggleSelectAll}
                    >
                      {selectedMerchants.size === filteredMerchants.length && filteredMerchants.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>{t('merchants.name')}</TableHead>
                  <TableHead>{language === 'zh' ? '网关' : 'Gateway'}</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMerchants.map((merchant) => (
                      <TableRow key={merchant.id} className={`hover:bg-muted/50 transition-colors ${selectedMerchants.has(merchant.id) ? 'bg-primary/5' : ''}`}>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => toggleSelectMerchant(merchant.id)}
                          >
                            {selectedMerchants.has(merchant.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                        <div>
                          <p className="font-medium">{merchant.merchant_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{merchant.account_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {merchant.payment_gateways ? (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            {merchant.payment_gateways.gateway_name} ({merchant.payment_gateways.currency})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                            {language === 'zh' ? '未设置' : 'Not Set'}
                          </Badge>
                        )}
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
                            <DropdownMenuItem onClick={() => openEditDialog(merchant)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {language === 'zh' ? '编辑商户' : 'Edit Merchant'}
                            </DropdownMenuItem>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMerchant(merchant)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'zh' ? '删除商户' : 'Delete Merchant'}
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

        {/* Edit Merchant Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                {language === 'zh' ? '编辑商户' : 'Edit Merchant'}
              </DialogTitle>
              <DialogDescription>
                {editingMerchant?.merchant_name} ({editingMerchant?.account_number})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Fees Section */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-500" />
                  <Label className="font-medium">{language === 'zh' ? '费率设置' : 'Fee Settings'}</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{language === 'zh' ? '收款费率 (%)' : 'Payin Fee (%)'}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editPayinFee}
                      onChange={(e) => setEditPayinFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{language === 'zh' ? '提款费率 (%)' : 'Payout Fee (%)'}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editPayoutFee}
                      onChange={(e) => setEditPayoutFee(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleUpdateFees} disabled={isUpdating} size="sm" className="w-full">
                  {language === 'zh' ? '更新费率' : 'Update Fees'}
                </Button>
              </div>

              {/* Gateway Assignment */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <Label className="font-medium">{language === 'zh' ? '网关分配' : 'Gateway Assignment'}</Label>
                </div>
                <div className="space-y-3">
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={editGatewayId}
                    onChange={(e) => {
                      setEditGatewayId(e.target.value);
                      setEditTradeType('');
                    }}
                  >
                    <option value="">{language === 'zh' ? '选择网关...' : 'Select gateway...'}</option>
                    {gateways.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        {gw.gateway_name} ({gw.currency})
                      </option>
                    ))}
                  </select>
                  {/* Trade Type */}
                  {(() => {
                    const selectedGateway = gateways.find(g => g.id === editGatewayId);
                    const tradeTypes = selectedGateway ? TRADE_TYPE_OPTIONS[selectedGateway.currency] || [] : [];
                    if (tradeTypes.length === 0) return null;
                    return (
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={editTradeType}
                        onChange={(e) => setEditTradeType(e.target.value)}
                      >
                        <option value="">{language === 'zh' ? '选择支付方式...' : 'Select trade type...'}</option>
                        {tradeTypes.map((tt) => (
                          <option key={tt.value} value={tt.value}>
                            {tt.label}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
                <Button onClick={handleUpdateGateway} disabled={isUpdating || !editGatewayId} size="sm" className="w-full">
                  {language === 'zh' ? '更新网关' : 'Update Gateway'}
                </Button>
              </div>

              {/* Reset Login Password */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <Label className="font-medium">{language === 'zh' ? '重置登录密码' : 'Reset Login Password'}</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={language === 'zh' ? '输入新密码 (至少6位)' : 'Enter new password (min 6 chars)'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button onClick={handleResetPassword} disabled={isUpdating || !newPassword} size="sm">
                    {language === 'zh' ? '重置' : 'Reset'}
                  </Button>
                </div>
              </div>

              {/* Reset Withdrawal Password */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-500" />
                  <Label className="font-medium">{language === 'zh' ? '重置提现密码' : 'Reset Withdrawal Password'}</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={language === 'zh' ? '输入新提现密码 (至少6位)' : 'Enter new withdrawal password (min 6 chars)'}
                    value={newWithdrawalPassword}
                    onChange={(e) => setNewWithdrawalPassword(e.target.value)}
                  />
                  <Button onClick={handleResetWithdrawalPassword} disabled={isUpdating || !newWithdrawalPassword} size="sm">
                    {language === 'zh' ? '重置' : 'Reset'}
                  </Button>
                </div>
              </div>

              {/* Reset 2FA */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-destructive" />
                    <Label className="font-medium">{language === 'zh' ? '重置双重认证' : 'Reset 2FA'}</Label>
                  </div>
                  <Badge variant={editingMerchant?.is_2fa_enabled ? 'default' : 'secondary'}>
                    {editingMerchant?.is_2fa_enabled ? '2FA ON' : '2FA OFF'}
                  </Badge>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleReset2FA} 
                  disabled={isUpdating || !editingMerchant?.is_2fa_enabled}
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '重置2FA' : 'Reset 2FA'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminMerchants;