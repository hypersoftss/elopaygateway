import { useState, useEffect } from 'react';
import { Wallet, Banknote, Bitcoin, Shield, ArrowRight, Sparkles, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MerchantData {
  balance: number;
  frozen_balance: number;
  payout_fee: number;
  currency: string | null;
  hasWithdrawalPassword: boolean;
  min_withdrawal_amount: number;
}

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  PKR: 'Rs',
  BDT: '৳',
};

// Currency flags
const CURRENCY_FLAGS: Record<string, string> = {
  INR: '🇮🇳',
  PKR: '🇵🇰',
  BDT: '🇧🇩',
};

// Withdrawal methods by currency
const WITHDRAWAL_METHODS: Record<string, { value: string; label: string; icon: string }[]> = {
  INR: [
    { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
    { value: 'usdt', label: 'USDT (TRC20)', icon: '💰' },
  ],
  PKR: [
    { value: 'easypaisa', label: 'Easypaisa', icon: '📱' },
    { value: 'jazzcash', label: 'JazzCash', icon: '📲' },
    { value: 'usdt', label: 'USDT (TRC20)', icon: '💰' },
  ],
  BDT: [
    { value: 'nagad', label: 'Nagad', icon: '📱' },
    { value: 'bkash', label: 'bKash', icon: '📲' },
    { value: 'usdt', label: 'USDT (TRC20)', icon: '💰' },
  ],
};

const MerchantWithdrawal = () => {
  const { language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Common form fields
  const [form, setForm] = useState({
    amount: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    usdtAddress: '',
    withdrawalPassword: '',
  });

  const currency = merchantData?.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '₹';
  const currencyFlag = CURRENCY_FLAGS[currency] || '🇮🇳';
  const availableMethods = WITHDRAWAL_METHODS[currency] || WITHDRAWAL_METHODS.INR;

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!user?.merchantId) return;

      // Fetch merchant data
      const { data } = await supabase
        .from('merchants')
        .select('balance, frozen_balance, payout_fee, withdrawal_password_hash, withdrawal_password')
        .eq('id', user.merchantId)
        .single();

      // Use secure RPC function to get gateway info (merchants can't read payment_gateways directly)
      const { data: gatewayData } = await supabase.rpc('get_my_gateway');
      
      let currency = 'INR';
      let minWithdrawalAmount = 1000;
      if (gatewayData && gatewayData.length > 0) {
        currency = gatewayData[0].currency || 'INR';
        minWithdrawalAmount = Number(gatewayData[0].min_withdrawal_amount) || 1000;
      }

      if (data) {
        setMerchantData({
          balance: Number(data.balance) || 0,
          frozen_balance: Number(data.frozen_balance) || 0,
          payout_fee: Number(data.payout_fee) || 0,
          currency,
          // Check if either hashed or legacy password exists
          hasWithdrawalPassword: !!(data.withdrawal_password_hash || data.withdrawal_password),
          min_withdrawal_amount: minWithdrawalAmount,
        });

        // Set default method based on currency
        const methods = WITHDRAWAL_METHODS[currency] || WITHDRAWAL_METHODS.INR;
        if (methods.length > 0) {
          setSelectedMethod(methods[0].value);
        }
      }
    };

    fetchMerchantData();
  }, [user?.merchantId]);

  // Server-side password verification using edge function
  const validatePassword = async (): Promise<boolean> => {
    if (!merchantData?.hasWithdrawalPassword) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请先设置提现密码' : 'Please set withdrawal password first',
        variant: 'destructive',
      });
      return false;
    }

    if (!form.withdrawalPassword) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请输入提现密码' : 'Please enter withdrawal password',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Verify password server-side
      const { data, error } = await supabase.functions.invoke('verify-withdrawal-password', {
        body: {
          merchantId: user?.merchantId,
          password: form.withdrawalPassword,
          action: 'verify'
        }
      });

      if (error) throw error;

      if (!data.success || !data.valid) {
        toast({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '提现密码错误' : 'Invalid withdrawal password',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message || 'Password verification failed',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleWithdrawal = async () => {
    if (!user?.merchantId || !merchantData) return;

    const amount = parseFloat(form.amount);
    const minAmount = merchantData.min_withdrawal_amount || 1000;
    
    if (amount <= 0) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '无效金额' : 'Invalid amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount < minAmount) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? `最低提现金额为 ${currencySymbol}${minAmount}` : `Minimum withdrawal amount is ${currencySymbol}${minAmount}`,
        variant: 'destructive',
      });
      return;
    }

    if (amount > merchantData.balance) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '余额不足' : 'Insufficient balance',
        variant: 'destructive',
      });
      return;
    }

    // Validate withdrawal password (now async)
    const isPasswordValid = await validatePassword();
    if (!isPasswordValid) return;

    // Validate required fields based on method
    if (selectedMethod === 'usdt') {
      if (!form.usdtAddress) {
        toast({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '请输入USDT地址' : 'Please enter USDT address',
          variant: 'destructive',
        });
        return;
      }
    } else if (selectedMethod === 'bank') {
      if (!form.accountName || !form.accountNumber || !form.bankName || !form.ifscCode) {
        toast({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '请填写所有银行信息' : 'Please fill all bank details',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Mobile wallets (easypaisa, jazzcash, nagad, bkash)
      if (!form.accountName || !form.accountNumber) {
        toast({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '请填写账户信息' : 'Please fill account details',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const fee = (amount * merchantData.payout_fee) / 100;
      const netAmount = amount - fee;
      const orderNo = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build transaction data based on method
      const transactionData: any = {
        merchant_id: user.merchantId,
        order_no: orderNo,
        transaction_type: 'payout',
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        extra: JSON.stringify({ withdrawal: true, method: selectedMethod, currency }),
      };

      if (selectedMethod === 'usdt') {
        transactionData.usdt_address = form.usdtAddress;
      } else if (selectedMethod === 'bank') {
        transactionData.bank_name = form.bankName;
        transactionData.account_number = form.accountNumber;
        transactionData.ifsc_code = form.ifscCode;
        transactionData.account_holder_name = form.accountName;
      } else {
        // Mobile wallets - store method in bank_name field
        transactionData.bank_name = selectedMethod.toUpperCase();
        transactionData.account_number = form.accountNumber;
        transactionData.account_holder_name = form.accountName;
      }

      const { error } = await supabase.from('transactions').insert(transactionData);

      if (error) throw error;

      // Freeze the amount
      await supabase
        .from('merchants')
        .update({
          balance: merchantData.balance - amount,
          frozen_balance: merchantData.frozen_balance + amount,
        })
        .eq('id', user.merchantId);

      toast({
        title: language === 'zh' ? '成功' : 'Success',
        description: language === 'zh' ? '提现申请已提交，等待管理员审核' : 'Withdrawal request submitted, awaiting admin approval',
      });

      // Reset form
      setForm({
        amount: '',
        accountName: '',
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        usdtAddress: '',
        withdrawalPassword: '',
      });

      // Update local state
      setMerchantData({
        ...merchantData,
        balance: merchantData.balance - amount,
        frozen_balance: merchantData.frozen_balance + amount,
      });
    } catch (err: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fee = form.amount ? (parseFloat(form.amount) * (merchantData?.payout_fee || 0)) / 100 : 0;
  const netAmount = form.amount ? parseFloat(form.amount) - fee : 0;

  const getMethodLabel = (method: string) => {
    const found = availableMethods.find(m => m.value === method);
    return found ? `${found.icon} ${found.label}` : method;
  };

  if (!merchantData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5 shadow-lg">
            <Wallet className="h-6 w-6 text-[hsl(var(--success))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{language === 'zh' ? '提现' : 'Withdrawal'}</h1>
            <p className="text-sm text-muted-foreground">
              {language === 'zh' ? '申请提现到您的账户' : 'Request withdrawal to your account'} • {currencyFlag} {currency}
            </p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="premium-card bg-gradient-to-br from-[hsl(var(--success))]/10 to-transparent border-[hsl(var(--success))]/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{currencyFlag} {language === 'zh' ? '可用余额' : 'Available Balance'}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">
                    {currencySymbol}{merchantData.balance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--success))]/10">
                  <Wallet className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card bg-gradient-to-br from-[hsl(var(--warning))]/10 to-transparent border-[hsl(var(--warning))]/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{currencyFlag} {language === 'zh' ? '冻结余额' : 'Frozen Balance'}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--warning))]">
                    {currencySymbol}{merchantData.frozen_balance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--warning))]/10">
                  <Shield className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '提现费率' : 'Withdrawal Fee'}</p>
                  <p className="text-2xl font-bold text-primary">{merchantData.payout_fee}%</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No Password Warning */}
        {!merchantData.hasWithdrawalPassword && (
          <Card className="premium-card border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Lock className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-destructive">
                    {language === 'zh' ? '未设置提现密码' : 'Withdrawal Password Not Set'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh'
                      ? '请联系管理员设置提现密码后才能提现'
                      : 'Please contact admin to set your withdrawal password before withdrawing'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="premium-card border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[hsl(var(--warning))]/10">
                <Shield className="h-5 w-5 text-[hsl(var(--warning))]" />
              </div>
              <div>
                <p className="font-semibold text-sm">{language === 'zh' ? '安全提现' : 'Secure Withdrawal'}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'zh'
                    ? '所有提现请求需要管理员审核批准后才会处理。资金在审核期间将被冻结。'
                    : 'All withdrawal requests require admin approval. Funds will be frozen during review.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="premium-card overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Method Selection */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-medium">
                {language === 'zh' ? '提现方式' : 'Withdrawal Method'}
              </Label>
              <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="w-full">
                <TabsList className="grid w-full h-auto p-1" style={{ gridTemplateColumns: `repeat(${availableMethods.length}, 1fr)` }}>
                  {availableMethods.map((method) => (
                    <TabsTrigger
                      key={method.value}
                      value={method.value}
                      className="py-3 text-xs sm:text-sm gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <span>{method.icon}</span>
                      <span className="hidden sm:inline">{method.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Bank Transfer (INR only) */}
                <TabsContent value="bank" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs font-medium">
                        {language === 'zh' ? '账户持有人' : 'Account Holder Name'}
                      </Label>
                      <Input
                        value={form.accountName}
                        onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                        placeholder={language === 'zh' ? '全名' : 'Full Name'}
                        className="bg-muted/30 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs font-medium">
                        {language === 'zh' ? '银行名称' : 'Bank Name'}
                      </Label>
                      <Input
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder={language === 'zh' ? '银行名称' : 'Bank Name'}
                        className="bg-muted/30 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs font-medium">
                        {language === 'zh' ? '账户号码' : 'Account Number'}
                      </Label>
                      <Input
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        placeholder="XXXXXXXXXXXX"
                        className="bg-muted/30 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs font-medium">
                        {language === 'zh' ? 'IFSC代码' : 'IFSC Code'}
                      </Label>
                      <Input
                        value={form.ifscCode}
                        onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                        placeholder="ABCD0001234"
                        className="bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Mobile Wallets (PKR/BDT) */}
                {['easypaisa', 'jazzcash', 'nagad', 'bkash'].map((method) => (
                  <TabsContent key={method} value={method} className="mt-4 space-y-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-4">
                      <p className="text-sm font-medium">{getMethodLabel(method)}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'zh' ? '提现到您的' : 'Withdraw to your'} {method.charAt(0).toUpperCase() + method.slice(1)} {language === 'zh' ? '账户' : 'account'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-medium">
                          {language === 'zh' ? '账户名称' : 'Account Name'}
                        </Label>
                        <Input
                          value={form.accountName}
                          onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                          placeholder={language === 'zh' ? '账户持有人姓名' : 'Account holder name'}
                          className="bg-muted/30 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-medium">
                          {language === 'zh' ? '账户号码' : 'Account Number'}
                        </Label>
                        <Input
                          value={form.accountNumber}
                          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                          placeholder={language === 'zh' ? '手机号码/账户号码' : 'Mobile/Account Number'}
                          className="bg-muted/30 border-border/50"
                        />
                      </div>
                    </div>
                  </TabsContent>
                ))}

                {/* USDT */}
                <TabsContent value="usdt" className="mt-4 space-y-4">
                  <div className="p-4 bg-[hsl(var(--warning))]/5 rounded-xl border border-[hsl(var(--warning))]/20">
                    <div className="flex items-center gap-2">
                      <Bitcoin className="h-5 w-5 text-[hsl(var(--warning))]" />
                      <p className="text-sm font-medium">USDT (TRC20)</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'zh' ? '仅支持TRC20网络' : 'Only TRC20 network supported'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? 'USDT地址 (TRC20)' : 'USDT Address (TRC20)'}
                    </Label>
                    <Input
                      value={form.usdtAddress}
                      onChange={(e) => setForm({ ...form, usdtAddress: e.target.value })}
                      placeholder="T..."
                      className="bg-muted/30 border-border/50 font-mono"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-medium">
                {language === 'zh' ? '提现金额' : 'Withdrawal Amount'}
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="pl-10 h-14 text-2xl font-bold bg-muted/30 border-border/50"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'zh' ? '最低' : 'Min'}: {currencySymbol}{merchantData.min_withdrawal_amount.toLocaleString()} • {language === 'zh' ? '可用' : 'Available'}: {currencySymbol}{merchantData.balance.toLocaleString()}
                </span>
                <button
                  onClick={() => setForm({ ...form, amount: merchantData.balance.toString() })}
                  className="text-primary font-medium hover:underline"
                >
                  {language === 'zh' ? '全部提现' : 'Withdraw All'}
                </button>
              </div>
            </div>

            {/* Fee Breakdown */}
            {form.amount && parseFloat(form.amount) > 0 && (
              <div className="p-4 bg-muted/30 rounded-xl space-y-2 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'zh' ? '提现金额' : 'Withdrawal Amount'}</span>
                  <span className="font-medium">{currencySymbol}{parseFloat(form.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'zh' ? '手续费' : 'Fee'} ({merchantData.payout_fee}%)
                  </span>
                  <span className="font-medium text-destructive">-{currencySymbol}{fee.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold">{language === 'zh' ? '实际到账' : 'Net Amount'}</span>
                  <span className="font-bold text-[hsl(var(--success))]">{currencySymbol}{netAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Withdrawal Password */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-medium flex items-center gap-2">
                <Lock className="h-3 w-3" />
                {language === 'zh' ? '提现密码' : 'Withdrawal Password'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.withdrawalPassword}
                  onChange={(e) => setForm({ ...form, withdrawalPassword: e.target.value })}
                  placeholder={language === 'zh' ? '输入提现密码' : 'Enter withdrawal password'}
                  className="bg-muted/30 border-border/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white font-semibold gap-2"
              onClick={handleWithdrawal}
              disabled={isLoading || !form.amount || !form.withdrawalPassword || !merchantData.hasWithdrawalPassword}
            >
              {isLoading ? (
                <>{language === 'zh' ? '处理中...' : 'Processing...'}</>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  {language === 'zh' ? '提交提现申请' : 'Submit Withdrawal Request'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantWithdrawal;
