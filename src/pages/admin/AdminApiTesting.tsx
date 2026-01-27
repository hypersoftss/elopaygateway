import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Plus, Minus, Hash, Play, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { md5 } from 'js-md5';

interface Merchant {
  id: string;
  account_number: string;
  merchant_name: string;
  api_key: string;
  payout_key: string;
  balance: number;
  trade_type: string | null;
  gateway_id: string | null;
  gateway_type: string | null;
  gateway_code: string | null;
  currency: string | null;
}

const AdminApiTesting = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balanceAmount, setBalanceAmount] = useState('1000');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Payin form
  const [payinAmount, setPayinAmount] = useState('100');
  const [payinOrderNo, setPayinOrderNo] = useState('');
  const [payinCallbackUrl, setPayinCallbackUrl] = useState('https://example.com/callback');
  const [payinSignature, setPayinSignature] = useState('');
  const [payinTradeType, setPayinTradeType] = useState('');
  const [isSubmittingPayin, setIsSubmittingPayin] = useState(false);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState('100');
  const [payoutTransactionId, setPayoutTransactionId] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('1234567890');
  const [payoutIfsc, setPayoutIfsc] = useState('HDFC0001234');
  const [payoutAccountHolder, setPayoutAccountHolder] = useState('Test User');
  const [payoutBankName, setPayoutBankName] = useState('HDFC Bank');
  const [payoutCallbackUrl, setPayoutCallbackUrl] = useState('https://example.com/payout-callback');
  const [payoutSignature, setPayoutSignature] = useState('');
  const [payoutTradeType, setPayoutTradeType] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          id, account_number, merchant_name, api_key, payout_key, balance, trade_type, gateway_id,
          payment_gateways (gateway_type, gateway_code, currency)
        `)
        .order('merchant_name');

      if (error) throw error;
      
      const formattedData = data?.map(m => ({
        ...m,
        gateway_type: (m.payment_gateways as any)?.gateway_type || null,
        gateway_code: (m.payment_gateways as any)?.gateway_code || null,
        currency: (m.payment_gateways as any)?.currency || 'INR',
      })) || [];
      
      setMerchants(formattedData);
      if (formattedData.length > 0) {
        setSelectedMerchant(formattedData[0]);
        // Set default trade type based on merchant's gateway
        updateTradeTypeOptions(formattedData[0]);
      }
    } catch (error: any) {
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
    fetchMerchants();
  }, []);

  // Get currency symbol based on merchant's currency
  const getCurrencySymbol = (merchant: Merchant | null) => {
    if (!merchant) return '₹';
    switch (merchant.currency) {
      case 'PKR': return 'Rs.';
      case 'BDT': return '৳';
      case 'INR':
      default: return '₹';
    }
  };

  const getTradeTypeOptions = (merchant: Merchant | null) => {
    if (!merchant) return [];
    
    const { gateway_type, gateway_code, currency } = merchant;
    
    // ELOPAY GATEWAY - default UPI
    if (gateway_type === 'hyperpay' || gateway_code?.includes('ELOPAYGATEWAY')) {
      return [{ value: 'default', label: '🇮🇳 UPI (Default)' }];
    }
    
    // ELOPAY options based on gateway_code/currency
    if (gateway_type === 'hypersofts' || gateway_code?.includes('ELOPAY_')) {
      if (currency === 'INR' || gateway_code === 'ELOPAY_INR' || gateway_code === 'hypersofts_inr') {
        return [
          { value: 'INRUPI', label: '🇮🇳 UPI (INRUPI)' },
          { value: 'usdt', label: '💰 USDT' },
        ];
      }
      if (currency === 'BDT' || gateway_code === 'ELOPAY_BDT' || gateway_code === 'hypersofts_bdt') {
        return [
          { value: 'nagad', label: '🇧🇩 Nagad' },
          { value: 'bkash', label: '🇧🇩 bKash' },
        ];
      }
      if (currency === 'PKR' || gateway_code === 'ELOPAY_PKR' || gateway_code === 'hypersofts_pkr') {
        return [
          { value: 'easypaisa', label: '🇵🇰 Easypaisa' },
          { value: 'jazzcash', label: '🇵🇰 JazzCash' },
        ];
      }
    }
    
    return [{ value: 'default', label: 'Default' }];
  };

  // Get payout trade type options based on currency
  const getPayoutTradeTypeOptions = (merchant: Merchant | null) => {
    if (!merchant) return [];
    
    const { gateway_type, gateway_code, currency } = merchant;
    
    // ELOPAY GATEWAY - INR bank transfer
    if (gateway_type === 'hyperpay' || gateway_code?.includes('ELOPAYGATEWAY')) {
      return [{ value: 'bank', label: '🏦 Bank Transfer' }];
    }
    
    // ELOPAY payout options based on currency
    if (gateway_type === 'hypersofts' || gateway_code?.includes('ELOPAY_')) {
      if (currency === 'INR' || gateway_code === 'ELOPAY_INR' || gateway_code === 'hypersofts_inr') {
        return [
          { value: 'bank', label: '🏦 Bank Transfer (INR)' },
          { value: 'usdt', label: '💰 USDT' },
        ];
      }
      if (currency === 'BDT' || gateway_code === 'ELOPAY_BDT' || gateway_code === 'hypersofts_bdt') {
        return [
          { value: 'nagad', label: '🇧🇩 Nagad' },
          { value: 'bkash', label: '🇧🇩 bKash' },
        ];
      }
      if (currency === 'PKR' || gateway_code === 'ELOPAY_PKR' || gateway_code === 'hypersofts_pkr') {
        return [
          { value: 'easypaisa', label: '🇵🇰 Easypaisa' },
          { value: 'jazzcash', label: '🇵🇰 JazzCash' },
        ];
      }
    }
    
    return [{ value: 'bank', label: '🏦 Bank Transfer' }];
  };

  const updateTradeTypeOptions = (merchant: Merchant | null) => {
    const payinOptions = getTradeTypeOptions(merchant);
    if (payinOptions.length > 0) {
      setPayinTradeType(merchant?.trade_type || payinOptions[0].value);
    }
    const payoutOptions = getPayoutTradeTypeOptions(merchant);
    if (payoutOptions.length > 0) {
      setPayoutTradeType(payoutOptions[0].value);
    }
    
    // Set default wallet/bank name based on currency
    if (merchant?.currency === 'PKR') {
      setPayoutBankName('Easypaisa');
      setPayoutAccountNumber('03001234567');
      setPayoutIfsc('N/A');
    } else if (merchant?.currency === 'BDT') {
      setPayoutBankName('Nagad');
      setPayoutAccountNumber('01712345678');
      setPayoutIfsc('N/A');
    } else {
      setPayoutBankName('HDFC Bank');
      setPayoutAccountNumber('1234567890');
      setPayoutIfsc('HDFC0001234');
    }
  };

  const handleMerchantChange = (merchantId: string) => {
    const merchant = merchants.find(m => m.id === merchantId);
    setSelectedMerchant(merchant || null);
    updateTradeTypeOptions(merchant || null);
  };

  const updateBalance = async (action: 'add' | 'subtract') => {
    if (!selectedMerchant) return;

    setIsUpdatingBalance(true);
    try {
      const amount = parseFloat(balanceAmount);
      const newBalance = action === 'add' 
        ? selectedMerchant.balance + amount 
        : selectedMerchant.balance - amount;

      const { error } = await supabase
        .from('merchants')
        .update({ balance: newBalance })
        .eq('id', selectedMerchant.id);

      if (error) throw error;

      setSelectedMerchant({ ...selectedMerchant, balance: newBalance });
      toast({
        title: t('common.success'),
        description: `${language === 'zh' ? '余额已更新' : 'Balance updated'}`,
      });
      fetchMerchants();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  const generatePayinSignature = () => {
    if (!selectedMerchant) return;
    
    const orderNo = payinOrderNo || `TEST_${Date.now()}`;
    setPayinOrderNo(orderNo);
    
    // MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)
    const signString = `${selectedMerchant.account_number}${payinAmount}${orderNo}${selectedMerchant.api_key}${payinCallbackUrl}`;
    const signature = md5(signString);
    setPayinSignature(signature);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '签名已生成' : 'Signature generated',
    });
  };

  const generatePayoutSignature = () => {
    if (!selectedMerchant) return;
    
    const txId = payoutTransactionId || `WD_${Date.now()}`;
    setPayoutTransactionId(txId);
    
    // MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
    const signString = `${payoutAccountNumber}${payoutAmount}${payoutBankName}${payoutCallbackUrl}${payoutIfsc}${selectedMerchant.account_number}${payoutAccountHolder}${txId}${selectedMerchant.payout_key}`;
    const signature = md5(signString);
    setPayoutSignature(signature);
    
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '签名已生成' : 'Signature generated',
    });
  };

  const submitPayinRequest = async () => {
    if (!selectedMerchant || !payinSignature) return;

    setIsSubmittingPayin(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: selectedMerchant.account_number,
            amount: payinAmount,
            merchant_order_no: payinOrderNo,
            callback_url: payinCallbackUrl,
            sign: payinSignature,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      toast({
        title: t('common.success'),
        description: `Order: ${result.order_no}`,
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayin(false);
    }
  };

  const submitPayoutRequest = async () => {
    if (!selectedMerchant || !payoutSignature) return;

    setIsSubmittingPayout(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: selectedMerchant.account_number,
            amount: payoutAmount,
            transaction_id: payoutTransactionId,
            account_number: payoutAccountNumber,
            ifsc: payoutIfsc,
            name: payoutAccountHolder,
            bank_name: payoutBankName,
            callback_url: payoutCallbackUrl,
            sign: payoutSignature,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      toast({
        title: t('common.success'),
        description: `Order: ${result.order_no}`,
      });
      fetchMerchants();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.success'),
      description: language === 'zh' ? '已复制' : 'Copied',
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
              <TestTube className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('sidebar.apiTesting')}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '测试Payin/Payout API和管理测试余额' : 'Test Payin/Payout APIs and manage test balances'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchMerchants}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Select Merchant */}
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg">{language === 'zh' ? '选择商户' : 'Select Merchant'}</CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择一个商户来测试其API凭证' : 'Choose a merchant to test their API credentials'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>{language === 'zh' ? '商户' : 'Merchant'}</Label>
                <Select
                  value={selectedMerchant?.id || ''}
                  onValueChange={handleMerchantChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'zh' ? '选择商户' : 'Select merchant'} />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.merchant_name} ({merchant.account_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '账号' : 'Account Number'}</Label>
                <div className="flex gap-2">
                  <Input value={selectedMerchant?.account_number || ''} readOnly />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(selectedMerchant?.account_number || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '网关/Trade Type' : 'Gateway/Trade Type'}</Label>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-purple-600">
                      {selectedMerchant?.gateway_code?.includes('ELOPAY_') || selectedMerchant?.gateway_code?.startsWith('hypersofts') ? 'ELOPAY' : 
                       selectedMerchant?.gateway_code?.includes('ELOPAYGATEWAY') || selectedMerchant?.gateway_code?.startsWith('hyperpay') ? 'ELOPAY GATEWAY' : 'DEFAULT'}
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm">{selectedMerchant?.currency || 'INR'}</span>
                    {selectedMerchant?.trade_type && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">{selectedMerchant.trade_type}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Available methods: {getTradeTypeOptions(selectedMerchant).map(o => o.label).join(', ')}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'zh' ? '当前余额' : 'Current Balance'}</Label>
                <div className="p-3 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20">
                  <span className="text-2xl font-bold text-[hsl(var(--success))]">
                    {getCurrencySymbol(selectedMerchant)}{selectedMerchant?.balance?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Balance */}
        <Card className="border-blue-500/20">
          <CardHeader className="bg-blue-500/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs">{getCurrencySymbol(selectedMerchant)}</span>
              {language === 'zh' ? '测试余额' : 'Test Balance'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '为此商户添加或减少测试余额' : 'Add or subtract test balance for this merchant'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label>{language === 'zh' ? `金额 (${getCurrencySymbol(selectedMerchant)})` : `Amount (${getCurrencySymbol(selectedMerchant)})`}</Label>
                <Input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="1000"
                />
              </div>
              <Button 
                onClick={() => updateBalance('add')} 
                disabled={isUpdatingBalance}
                className="btn-gradient-success"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'zh' ? '增加余额' : 'Add Balance'}
              </Button>
              <Button 
                onClick={() => updateBalance('subtract')} 
                disabled={isUpdatingBalance}
                variant="destructive"
              >
                <Minus className="h-4 w-4 mr-2" />
                {language === 'zh' ? '减少余额' : 'Subtract Balance'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Testing Tabs */}
        <Tabs defaultValue="payin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payin" className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">⊕</span>
              {language === 'zh' ? 'Payin API测试' : 'Payin API Test'}
            </TabsTrigger>
            <TabsTrigger value="payout" className="flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">⊖</span>
              {language === 'zh' ? 'Payout API测试' : 'Payout API Test'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payin">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '测试Payin API' : 'Test Payin API'}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  MD5(merchant_id + amount + merchant_order_no + api_key + callback_url)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '金额' : 'Amount'}</Label>
                    <Input
                      type="number"
                      value={payinAmount}
                      onChange={(e) => setPayinAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '订单号' : 'Order Number'}</Label>
                    <Input
                      value={payinOrderNo}
                      onChange={(e) => setPayinOrderNo(e.target.value)}
                      placeholder={language === 'zh' ? '自动生成(留空)' : 'Auto-generated if empty'}
                    />
                  </div>
                </div>

                {/* Trade Type Selection */}
                {getTradeTypeOptions(selectedMerchant).length > 1 && (
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '支付方式' : 'Payment Method (Trade Type)'}</Label>
                    <Select value={payinTradeType} onValueChange={setPayinTradeType}>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getTradeTypeOptions(selectedMerchant).map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedMerchant?.currency === 'PKR' && 'PKR supports both Easypaisa and JazzCash'}
                      {selectedMerchant?.currency === 'BDT' && 'BDT supports both Nagad and bKash'}
                      {selectedMerchant?.currency === 'INR' && 'INR supports UPI and USDT'}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{language === 'zh' ? '回调URL' : 'Callback URL'}</Label>
                  <Input
                    value={payinCallbackUrl}
                    onChange={(e) => setPayinCallbackUrl(e.target.value)}
                    placeholder="https://example.com/callback"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generatePayinSignature}>
                    <Hash className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '生成签名' : 'Generate Signature'}
                  </Button>
                </div>
                {payinSignature && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">{language === 'zh' ? '签名' : 'Signature'}</Label>
                    <p className="font-mono text-sm break-all">{payinSignature}</p>
                  </div>
                )}
                <Button 
                  className="w-full btn-gradient-success" 
                  onClick={submitPayinRequest}
                  disabled={isSubmittingPayin || !payinSignature}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmittingPayin ? t('common.loading') : (language === 'zh' ? '发送Payin请求' : 'Send Payin Request')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '测试Payout API' : 'Test Payout API'}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  MD5(account_number + amount + bank_name + callback_url + ifsc + merchant_id + name + transaction_id + payout_key)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payout Method Selection */}
                {getPayoutTradeTypeOptions(selectedMerchant).length > 0 && (
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '提款方式' : 'Withdrawal Method'}</Label>
                    <Select value={payoutTradeType} onValueChange={setPayoutTradeType}>
                      <SelectTrigger className="bg-orange-500/10 border-orange-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getPayoutTradeTypeOptions(selectedMerchant).map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedMerchant?.currency === 'PKR' && '🇵🇰 PKR supports Easypaisa and JazzCash withdrawals'}
                      {selectedMerchant?.currency === 'BDT' && '🇧🇩 BDT supports Nagad and bKash withdrawals'}
                      {selectedMerchant?.currency === 'INR' && '🇮🇳 INR supports Bank Transfer and USDT withdrawals'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '金额' : 'Amount'}</Label>
                    <Input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '交易ID' : 'Transaction ID'}</Label>
                    <Input
                      value={payoutTransactionId}
                      onChange={(e) => setPayoutTransactionId(e.target.value)}
                      placeholder={language === 'zh' ? '自动生成(留空)' : 'Auto-generated if empty'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{selectedMerchant?.currency === 'PKR' || selectedMerchant?.currency === 'BDT' ? (language === 'zh' ? '手机号' : 'Mobile Number') : (language === 'zh' ? '账号' : 'Account Number')}</Label>
                    <Input
                      value={payoutAccountNumber}
                      onChange={(e) => setPayoutAccountNumber(e.target.value)}
                      placeholder={selectedMerchant?.currency === 'PKR' ? '03001234567' : selectedMerchant?.currency === 'BDT' ? '01712345678' : '1234567890'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{selectedMerchant?.currency === 'PKR' || selectedMerchant?.currency === 'BDT' ? 'N/A' : (language === 'zh' ? 'IFSC代码' : 'IFSC Code')}</Label>
                    <Input
                      value={payoutIfsc}
                      onChange={(e) => setPayoutIfsc(e.target.value)}
                      placeholder={selectedMerchant?.currency === 'PKR' || selectedMerchant?.currency === 'BDT' ? 'N/A' : 'HDFC0001234'}
                      disabled={selectedMerchant?.currency === 'PKR' || selectedMerchant?.currency === 'BDT'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '账户持有人' : 'Account Holder Name'}</Label>
                    <Input
                      value={payoutAccountHolder}
                      onChange={(e) => setPayoutAccountHolder(e.target.value)}
                      placeholder="Test User"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{selectedMerchant?.currency === 'PKR' || selectedMerchant?.currency === 'BDT' ? (language === 'zh' ? '钱包类型' : 'Wallet Type') : (language === 'zh' ? '银行名称' : 'Bank Name')}</Label>
                    {selectedMerchant?.currency === 'PKR' ? (
                      <Select value={payoutBankName} onValueChange={setPayoutBankName}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easypaisa">🇵🇰 Easypaisa</SelectItem>
                          <SelectItem value="JazzCash">🇵🇰 JazzCash</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : selectedMerchant?.currency === 'BDT' ? (
                      <Select value={payoutBankName} onValueChange={setPayoutBankName}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nagad">🇧🇩 Nagad</SelectItem>
                          <SelectItem value="bKash">🇧🇩 bKash</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={payoutBankName} onValueChange={setPayoutBankName}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDFC Bank">🏦 HDFC Bank</SelectItem>
                          <SelectItem value="ICICI Bank">🏦 ICICI Bank</SelectItem>
                          <SelectItem value="SBI Bank">🏦 SBI Bank</SelectItem>
                          <SelectItem value="Axis Bank">🏦 Axis Bank</SelectItem>
                          <SelectItem value="Kotak Bank">🏦 Kotak Bank</SelectItem>
                          <SelectItem value="Other Bank">🏦 Other Bank</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '回调URL' : 'Callback URL'}</Label>
                  <Input
                    value={payoutCallbackUrl}
                    onChange={(e) => setPayoutCallbackUrl(e.target.value)}
                    placeholder="https://example.com/payout-callback"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generatePayoutSignature}>
                    <Hash className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '生成签名' : 'Generate Signature'}
                  </Button>
                </div>
                {payoutSignature && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">{language === 'zh' ? '签名' : 'Signature'}</Label>
                    <p className="font-mono text-sm break-all">{payoutSignature}</p>
                  </div>
                )}
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" 
                  onClick={submitPayoutRequest}
                  disabled={isSubmittingPayout || !payoutSignature}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmittingPayout ? t('common.loading') : (language === 'zh' ? '发送Payout请求' : 'Send Payout Request')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminApiTesting;