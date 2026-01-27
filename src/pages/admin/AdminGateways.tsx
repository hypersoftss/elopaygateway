import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Trash2, Edit, Eye, EyeOff, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PaymentGateway {
  id: string;
  gateway_code: string;
  gateway_name: string;
  gateway_type: string;
  base_url: string;
  app_id: string;
  api_key: string;
  payout_key: string | null;
  currency: string;
  trade_type: string | null;
  is_active: boolean;
  created_at: string;
  min_withdrawal_amount: number | null;
}

// Trade type options based on gateway type and currency
const getTradeTypeOptions = (gatewayType: string, currency: string) => {
  if (gatewayType === 'hyperpay') {
    return [{ value: '', label: 'Default' }];
  }
  
  // ELOPAY options
  if (currency === 'INR') {
    return [
      { value: 'INRUPI', label: 'INRUPI (UPI)' },
      { value: 'usdt', label: 'USDT' },
    ];
  }
  if (currency === 'PKR') {
    return [
      { value: 'PKRPH', label: 'PKRPH (Easypaisa/JazzCash)' },
    ];
  }
  if (currency === 'BDT') {
    return [
      { value: 'nagad', label: 'Nagad' },
      { value: 'bkash', label: 'bKash' },
    ];
  }
  return [{ value: '', label: 'Default' }];
};

const AdminGatewaysPage = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [showGatewayApiKey, setShowGatewayApiKey] = useState<Set<string>>(new Set());
  const [newGateway, setNewGateway] = useState({
    gateway_code: '',
    gateway_name: '',
    gateway_type: 'hypersofts',
    base_url: 'https://www.lg-pay.com',
    app_id: '',
    api_key: '',
    payout_key: '',
    currency: 'INR',
    trade_type: '',
    min_withdrawal_amount: 1000,
  });

  const fetchGateways = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('created_at', { ascending: false });
      setGateways(data || []);
    } catch (error) {
      console.error('Error fetching gateways:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGateway = async () => {
    try {
      // For ELOPAY, payout_key is same as api_key
      const payoutKey = newGateway.gateway_type === 'hypersofts' 
        ? newGateway.api_key 
        : (newGateway.payout_key || null);

      if (editingGateway) {
        const { error } = await supabase
          .from('payment_gateways')
          .update({
            gateway_code: newGateway.gateway_code,
            gateway_name: newGateway.gateway_name,
            gateway_type: newGateway.gateway_type,
            base_url: newGateway.base_url,
            app_id: newGateway.app_id,
            api_key: newGateway.api_key,
            payout_key: payoutKey,
            currency: newGateway.currency,
            trade_type: newGateway.trade_type || null,
            min_withdrawal_amount: newGateway.min_withdrawal_amount || 1000,
          })
          .eq('id', editingGateway.id);
        if (error) throw error;
        toast({
          title: t('common.success'),
          description: language === 'zh' ? '网关已更新' : 'Gateway updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('payment_gateways')
          .insert({
            gateway_code: newGateway.gateway_code,
            gateway_name: newGateway.gateway_name,
            gateway_type: newGateway.gateway_type,
            base_url: newGateway.base_url,
            app_id: newGateway.app_id,
            api_key: newGateway.api_key,
            payout_key: payoutKey,
            currency: newGateway.currency,
            trade_type: newGateway.trade_type || null,
            min_withdrawal_amount: newGateway.min_withdrawal_amount || 1000,
          });
        if (error) throw error;
        toast({
          title: t('common.success'),
          description: language === 'zh' ? '网关已创建' : 'Gateway created successfully',
        });
      }
      setShowGatewayDialog(false);
      setEditingGateway(null);
      resetForm();
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setNewGateway({
      gateway_code: '',
      gateway_name: '',
      gateway_type: 'hypersofts',
      base_url: 'https://www.lg-pay.com',
      app_id: '',
      api_key: '',
      payout_key: '',
      currency: 'INR',
      trade_type: '',
      min_withdrawal_amount: 1000,
    });
  };

  const handleToggleGatewayStatus = async (gateway: PaymentGateway) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_active: !gateway.is_active })
        .eq('id', gateway.id);
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: gateway.is_active 
          ? (language === 'zh' ? '网关已禁用' : 'Gateway disabled')
          : (language === 'zh' ? '网关已启用' : 'Gateway enabled'),
      });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGateway = async (gateway: PaymentGateway) => {
    if (!confirm(language === 'zh' ? '确定删除此网关吗?' : 'Are you sure you want to delete this gateway?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('id', gateway.id);
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: language === 'zh' ? '网关已删除' : 'Gateway deleted successfully',
      });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditGateway = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setNewGateway({
      gateway_code: gateway.gateway_code,
      gateway_name: gateway.gateway_name,
      gateway_type: gateway.gateway_type,
      base_url: gateway.base_url,
      app_id: gateway.app_id,
      api_key: gateway.api_key,
      payout_key: gateway.payout_key || '',
      currency: gateway.currency,
      trade_type: gateway.trade_type || '',
      min_withdrawal_amount: gateway.min_withdrawal_amount || 1000,
    });
    setShowGatewayDialog(true);
  };

  const toggleGatewayApiKeyVisibility = (id: string) => {
    const newSet = new Set(showGatewayApiKey);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setShowGatewayApiKey(newSet);
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const tradeTypeOptions = getTradeTypeOptions(newGateway.gateway_type, newGateway.currency);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{language === 'zh' ? '网关管理' : 'Gateway Management'}</h1>
            <p className="text-muted-foreground">
              {language === 'zh' ? '管理支付网关凭证和配置' : 'Manage payment gateway credentials and configuration'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/gateway-health">
              <Button variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                {language === 'zh' ? '健康监控' : 'Health Monitor'}
              </Button>
            </Link>
            <Button 
              onClick={() => {
                resetForm();
                setEditingGateway(null);
                setShowGatewayDialog(true);
              }}
              className="btn-gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              {language === 'zh' ? '添加网关' : 'Add Gateway'}
            </Button>
          </div>
        </div>

        {/* Gateways Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {language === 'zh' ? '支付网关' : 'Payment Gateways'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '配置的支付处理网关' : 'Configured payment processing gateways'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : gateways.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'zh' ? '暂无网关配置' : 'No gateways configured'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'zh' ? '网关' : 'Gateway'}</TableHead>
                    <TableHead>{language === 'zh' ? '类型' : 'Type'}</TableHead>
                    <TableHead>{language === 'zh' ? '货币' : 'Currency'}</TableHead>
                    <TableHead>Trade Type</TableHead>
                    <TableHead>App ID</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>{language === 'zh' ? '状态' : 'Status'}</TableHead>
                    <TableHead>{language === 'zh' ? '操作' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway) => {
                    // Transform gateway names to ELOPAY branding
                    const getDisplayName = (name: string, type: string, currency: string) => {
                      if (type === 'hyperpay' || type === 'bondpay') {
                        return 'ELOPAY GATEWAY';
                      }
                      // For hypersofts/lgpay, show regional name
                      const regionMap: Record<string, string> = {
                        'INR': 'ELOPAY India',
                        'PKR': 'ELOPAY Pakistan', 
                        'BDT': 'ELOPAY Bangladesh',
                      };
                      return regionMap[currency] || 'ELOPAY';
                    };
                    
                    const displayName = getDisplayName(gateway.gateway_name, gateway.gateway_type, gateway.currency);
                    
                    return (
                    <TableRow key={gateway.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{gateway.gateway_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {gateway.gateway_type === 'hypersofts' ? 'ELOPAY' : 'ELOPAY GATEWAY'}
                        </Badge>
                      </TableCell>
                      <TableCell>{gateway.currency}</TableCell>
                      <TableCell>{gateway.trade_type || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{gateway.app_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showGatewayApiKey.has(gateway.id) 
                              ? gateway.api_key.slice(0, 20) + '...'
                              : '••••••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleGatewayApiKeyVisibility(gateway.id)}
                          >
                            {showGatewayApiKey.has(gateway.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={gateway.is_active}
                          onCheckedChange={() => handleToggleGatewayStatus(gateway)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditGateway(gateway)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteGateway(gateway)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{language === 'zh' ? 'ELOPAY 配置' : 'ELOPAY Configuration'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>INR:</strong> Trade Type = INRUPI (UPI) or usdt (USDT), Payout Code = INR</p>
              <p><strong>PKR:</strong> Trade Type = PKRPH, Payout Code = PKR</p>
              <p><strong>BDT:</strong> Trade Type = nagad/bkash, Payout Code = BDT</p>
              <p className="text-xs mt-2 text-primary">Note: ELOPAY uses same key for payin and payout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{language === 'zh' ? 'ELOPAY GATEWAY 配置' : 'ELOPAY GATEWAY Configuration'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>INR:</strong> Requires separate Payout Key</p>
              <p><strong>Base URL:</strong> https://api.bond-pays.com</p>
              <p className="text-xs mt-2 text-primary">Note: ELOPAY GATEWAY uses different keys for payin and payout</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gateway Add/Edit Dialog */}
      <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {editingGateway 
                ? (language === 'zh' ? '编辑网关' : 'Edit Gateway')
                : (language === 'zh' ? '添加网关' : 'Add Gateway')}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh' 
                ? '配置支付网关凭证和设置' 
                : 'Configure payment gateway credentials and settings'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关代码' : 'Gateway Code'}</Label>
                <Input
                  value={newGateway.gateway_code}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_code: e.target.value }))}
                  placeholder="ELOPAY_INR"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关名称' : 'Gateway Name'}</Label>
                <Input
                  value={newGateway.gateway_name}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_name: e.target.value }))}
                  placeholder="ELOPAY INR"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关类型' : 'Gateway Type'}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newGateway.gateway_type}
                  onChange={(e) => setNewGateway(g => ({ ...g, gateway_type: e.target.value, trade_type: '' }))}
                >
                  <option value="hypersofts">ELOPAY</option>
                  <option value="hyperpay">ELOPAY GATEWAY</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '货币' : 'Currency'}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newGateway.currency}
                  onChange={(e) => setNewGateway(g => ({ ...g, currency: e.target.value, trade_type: '' }))}
                >
                  <option value="INR">INR (India)</option>
                  <option value="PKR">PKR (Pakistan)</option>
                  <option value="BDT">BDT (Bangladesh)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'zh' ? '基础URL' : 'Base URL'}</Label>
              <Input
                value={newGateway.base_url}
                onChange={(e) => setNewGateway(g => ({ ...g, base_url: e.target.value }))}
                placeholder="https://api.elopay.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>App ID</Label>
                <Input
                  value={newGateway.app_id}
                  onChange={(e) => setNewGateway(g => ({ ...g, app_id: e.target.value }))}
                  placeholder="PKR3202"
                />
              </div>
              <div className="space-y-2">
                <Label>Trade Type (Payin)</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newGateway.trade_type}
                  onChange={(e) => setNewGateway(g => ({ ...g, trade_type: e.target.value }))}
                >
                  {tradeTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={newGateway.api_key}
                onChange={(e) => setNewGateway(g => ({ ...g, api_key: e.target.value }))}
                placeholder="Enter API Key"
              />
              {newGateway.gateway_type === 'hypersofts' && (
                <p className="text-xs text-muted-foreground">
                  {language === 'zh' ? 'ELOPAY使用相同的密钥进行收款和付款' : 'ELOPAY uses the same key for payin and payout'}
                </p>
              )}
            </div>

            {/* Only show payout_key for ELOPAY GATEWAY */}
            {newGateway.gateway_type === 'hyperpay' && (
              <div className="space-y-2">
                <Label>Payout Key</Label>
                <Input
                  type="password"
                  value={newGateway.payout_key}
                  onChange={(e) => setNewGateway(g => ({ ...g, payout_key: e.target.value }))}
                  placeholder="Enter Payout Key"
                />
              </div>
            )}

            {/* Minimum Withdrawal Amount */}
            <div className="space-y-2">
              <Label>{language === 'zh' ? '最低提现金额' : 'Min Withdrawal Amount'}</Label>
              <Input
                type="number"
                value={newGateway.min_withdrawal_amount}
                onChange={(e) => setNewGateway(g => ({ ...g, min_withdrawal_amount: parseFloat(e.target.value) || 1000 }))}
                placeholder="1000"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'zh' ? '商户最低提现金额限制' : 'Minimum withdrawal amount for merchants'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGatewayDialog(false)}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSaveGateway} 
              disabled={!newGateway.gateway_code || !newGateway.gateway_name || !newGateway.app_id || !newGateway.api_key}
              className="btn-gradient-primary"
            >
              {editingGateway 
                ? (language === 'zh' ? '更新网关' : 'Update Gateway')
                : (language === 'zh' ? '创建网关' : 'Create Gateway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminGatewaysPage;
