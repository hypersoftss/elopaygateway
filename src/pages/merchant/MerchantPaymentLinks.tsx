import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Plus, Copy, ExternalLink, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PaymentLink {
  id: string;
  link_code: string;
  amount: number;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  trade_type: string | null;
}

interface MerchantGateway {
  gateway_type: string;
  currency: string;
  trade_type: string | null;
}

interface TradeTypeOption {
  value: string;
  label: string;
}

const MerchantPaymentLinks = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [merchantGateway, setMerchantGateway] = useState<MerchantGateway | null>(null);
  const [tradeTypeOptions, setTradeTypeOptions] = useState<TradeTypeOption[]>([]);
  const [newLink, setNewLink] = useState({
    amount: '',
    description: '',
    hasExpiry: false,
    expiryDate: '',
    trade_type: '',
  });

  // Get trade type options based on gateway
  const getTradeTypeOptions = (gateway: MerchantGateway | null): TradeTypeOption[] => {
    if (!gateway) return [];

    const { gateway_type, currency } = gateway;

    // HYPER PAY - no selection needed (uses default)
    if (gateway_type === 'hyperpay') {
      return [{ value: 'default', label: 'UPI (Default)' }];
    }

    // LG Pay options based on currency
    if (gateway_type === 'lgpay') {
      switch (currency) {
        case 'INR':
          return [
            { value: 'INRUPI', label: '🇮🇳 UPI (INRUPI)' },
            { value: 'usdt', label: '💰 USDT' },
          ];
        case 'BDT':
          return [
            { value: 'nagad', label: '🇧🇩 Nagad' },
            { value: 'bkash', label: '🇧🇩 bKash' },
          ];
        case 'PKR':
          return [
            { value: 'easypaisa', label: '🇵🇰 Easypaisa' },
            { value: 'jazzcash', label: '🇵🇰 JazzCash' },
          ];
        default:
          return [];
      }
    }

    return [];
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = { INR: '₹', PKR: 'Rs.', BDT: '৳' };
    return symbols[currency] || '₹';
  };

  const fetchMerchantGateway = async () => {
    if (!user?.merchantId) return;

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          gateway_id,
          trade_type,
          payment_gateways (
            gateway_type,
            currency,
            trade_type
          )
        `)
        .eq('id', user.merchantId)
        .single();

      if (error) throw error;

      if (data?.payment_gateways) {
        const gateway = data.payment_gateways as unknown as { gateway_type: string; currency: string; trade_type: string | null };
        const merchantData: MerchantGateway = {
          gateway_type: gateway.gateway_type,
          currency: gateway.currency,
          trade_type: data.trade_type || gateway.trade_type,
        };
        setMerchantGateway(merchantData);
        
        const options = getTradeTypeOptions(merchantData);
        setTradeTypeOptions(options);
        
        // Set default trade_type
        if (options.length > 0) {
          setNewLink(prev => ({ ...prev, trade_type: options[0].value }));
        }
      }
    } catch (error) {
      console.error('Error fetching merchant gateway:', error);
    }
  };

  const fetchLinks = async () => {
    if (!user?.merchantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('merchant_id', user.merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      toast({ title: 'Error', description: 'Failed to fetch payment links', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantGateway();
    fetchLinks();
  }, [user?.merchantId]);

  const generateLinkCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateLink = async () => {
    if (!user?.merchantId || !newLink.amount) return;
    
    setIsCreating(true);
    try {
      const linkCode = generateLinkCode();
      
      const { error } = await supabase
        .from('payment_links')
        .insert({
          merchant_id: user.merchantId,
          link_code: linkCode,
          amount: parseFloat(newLink.amount),
          description: newLink.description || null,
          expires_at: newLink.hasExpiry && newLink.expiryDate ? new Date(newLink.expiryDate).toISOString() : null,
          trade_type: newLink.trade_type !== 'default' ? newLink.trade_type : null,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Payment link created' });
      setNewLink({ amount: '', description: '', hasExpiry: false, expiryDate: '', trade_type: tradeTypeOptions[0]?.value || '' });
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast({ title: 'Error', description: 'Failed to create payment link', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (linkCode: string) => {
    const url = `${window.location.origin}/pay/${linkCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkCode);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied', description: 'Link copied to clipboard' });
  };

  const getTradeTypeLabel = (tradeType: string | null): string => {
    if (!tradeType) return '-';
    const labels: Record<string, string> = {
      INRUPI: 'UPI',
      usdt: 'USDT',
      nagad: 'Nagad',
      bkash: 'bKash',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
    };
    return labels[tradeType] || tradeType;
  };

  const currencySymbol = merchantGateway ? getCurrencySymbol(merchantGateway.currency) : '₹';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <LinkIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{language === 'zh' ? '支付链接' : 'Payment Links'}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '创建和管理您的支付链接' : 'Create and manage your payment links'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLinks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gradient-success">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '创建链接' : 'Create Link'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{language === 'zh' ? '创建支付链接' : 'Create Payment Link'}</DialogTitle>
                  <DialogDescription>
                    {language === 'zh' ? '为您的客户创建新的支付链接' : 'Create a new payment link for your customers'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '金额 *' : 'Amount *'}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={newLink.amount}
                        onChange={(e) => setNewLink({ ...newLink, amount: e.target.value })}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  {tradeTypeOptions.length > 1 && (
                    <div className="space-y-2">
                      <Label>{language === 'zh' ? '支付方式 *' : 'Payment Method *'}</Label>
                      <Select
                        value={newLink.trade_type}
                        onValueChange={(value) => setNewLink({ ...newLink, trade_type: value })}
                      >
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue placeholder={language === 'zh' ? '选择支付方式' : 'Select payment method'} />
                        </SelectTrigger>
                        <SelectContent>
                          {tradeTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {language === 'zh' 
                          ? '选择客户将使用的支付渠道' 
                          : 'Select the payment channel your customer will use'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '描述' : 'Description'}</Label>
                    <Textarea
                      placeholder={language === 'zh' ? '支付说明...' : 'Payment for...'}
                      value={newLink.description}
                      onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{language === 'zh' ? '设置过期时间' : 'Set Expiry'}</Label>
                    <Switch
                      checked={newLink.hasExpiry}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, hasExpiry: checked })}
                    />
                  </div>
                  {newLink.hasExpiry && (
                    <div className="space-y-2">
                      <Label>{language === 'zh' ? '过期日期' : 'Expiry Date'}</Label>
                      <Input
                        type="datetime-local"
                        value={newLink.expiryDate}
                        onChange={(e) => setNewLink({ ...newLink, expiryDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleCreateLink}
                    disabled={isCreating || !newLink.amount}
                    className="btn-gradient-success"
                  >
                    {isCreating ? t('common.loading') : (language === 'zh' ? '创建' : 'Create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Links Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '链接代码' : 'Link Code'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '金额' : 'Amount'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '支付方式' : 'Method'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '描述' : 'Description'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '状态' : 'Status'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '过期时间' : 'Expires At'}</TableHead>
                  <TableHead className="text-muted-foreground">{language === 'zh' ? '创建时间' : 'Created At'}</TableHead>
                  <TableHead className="text-muted-foreground text-center">{language === 'zh' ? '操作' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : links.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <LinkIcon className="h-8 w-8 text-muted-foreground/50" />
                        <p>{language === 'zh' ? '暂无支付链接' : 'No payment links yet'}</p>
                        <p className="text-xs">{language === 'zh' ? '点击上方按钮创建' : 'Click the button above to create one'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((link) => (
                    <TableRow key={link.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{link.link_code}</TableCell>
                      <TableCell className="text-[hsl(var(--success))] font-semibold">
                        {currencySymbol}{link.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getTradeTypeLabel(link.trade_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{link.description || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={link.is_active ? 'default' : 'secondary'}
                          className={link.is_active ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90' : ''}
                        >
                          {link.is_active ? (language === 'zh' ? '有效' : 'Active') : (language === 'zh' ? '无效' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.expires_at ? format(new Date(link.expires_at), 'yyyy-MM-dd') : (language === 'zh' ? '永不' : 'Never')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(link.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(link.link_code)}
                          >
                            <Copy className={`h-4 w-4 ${copiedId === link.link_code ? 'text-[hsl(var(--success))]' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => window.open(`/pay/${link.link_code}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
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

export default MerchantPaymentLinks;