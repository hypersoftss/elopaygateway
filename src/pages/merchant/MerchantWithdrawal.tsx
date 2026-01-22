import { useState, useEffect } from 'react';
import { Wallet, Banknote, Bitcoin, Shield, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MerchantWithdrawal = () => {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [payoutFee, setPayoutFee] = useState(0);

  // Bank form
  const [bankForm, setBankForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });

  // USDT form
  const [usdtForm, setUsdtForm] = useState({
    amount: '',
    usdtAddress: '',
  });

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!user?.merchantId) return;

      const { data } = await supabase
        .from('merchants')
        .select('balance, frozen_balance, payout_fee')
        .eq('id', user.merchantId)
        .single();

      if (data) {
        setBalance(Number(data.balance) || 0);
        setFrozenBalance(Number(data.frozen_balance) || 0);
        setPayoutFee(Number(data.payout_fee) || 0);
      }
    };

    fetchMerchantData();
  }, [user?.merchantId]);

  const handleBankWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(bankForm.amount);
    if (amount <= 0) {
      toast({ 
        title: language === 'zh' ? '错误' : 'Error', 
        description: language === 'zh' ? '无效金额' : 'Invalid amount', 
        variant: 'destructive' 
      });
      return;
    }

    if (amount > balance) {
      toast({ 
        title: language === 'zh' ? '错误' : 'Error', 
        description: language === 'zh' ? '余额不足' : 'Insufficient balance', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);

    try {
      const fee = (amount * payoutFee) / 100;
      const netAmount = amount - fee;
      const orderNo = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Mark as withdrawal for admin approval with extra = 'withdrawal'
      const { error } = await supabase.from('transactions').insert({
        merchant_id: user.merchantId,
        order_no: orderNo,
        transaction_type: 'payout',
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        bank_name: bankForm.bankName,
        account_number: bankForm.accountNumber,
        ifsc_code: bankForm.ifscCode,
        account_holder_name: bankForm.accountHolder,
        extra: 'withdrawal', // Mark for admin control
      });

      if (error) throw error;

      // Freeze the amount - deduct from balance and add to frozen
      await supabase
        .from('merchants')
        .update({
          balance: balance - amount,
          frozen_balance: frozenBalance + amount,
        })
        .eq('id', user.merchantId);

      toast({
        title: language === 'zh' ? '成功' : 'Success',
        description: language === 'zh' ? '提现申请已提交，等待管理员审核' : 'Withdrawal request submitted, awaiting admin approval',
      });

      setBankForm({
        amount: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolder: '',
      });
      setBalance(balance - amount);
      setFrozenBalance(frozenBalance + amount);
    } catch (err: any) {
      toast({ title: language === 'zh' ? '错误' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsdtWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(usdtForm.amount);
    if (amount <= 0) {
      toast({ 
        title: language === 'zh' ? '错误' : 'Error', 
        description: language === 'zh' ? '无效金额' : 'Invalid amount', 
        variant: 'destructive' 
      });
      return;
    }

    if (amount > balance) {
      toast({ 
        title: language === 'zh' ? '错误' : 'Error', 
        description: language === 'zh' ? '余额不足' : 'Insufficient balance', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);

    try {
      const fee = (amount * payoutFee) / 100;
      const netAmount = amount - fee;
      const orderNo = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Mark as withdrawal for admin approval with extra = 'withdrawal'
      const { error } = await supabase.from('transactions').insert({
        merchant_id: user.merchantId,
        order_no: orderNo,
        transaction_type: 'payout',
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        usdt_address: usdtForm.usdtAddress,
        extra: 'withdrawal', // Mark for admin control
      });

      if (error) throw error;

      // Freeze the amount
      await supabase
        .from('merchants')
        .update({
          balance: balance - amount,
          frozen_balance: frozenBalance + amount,
        })
        .eq('id', user.merchantId);

      toast({
        title: language === 'zh' ? '成功' : 'Success',
        description: language === 'zh' ? '提现申请已提交，等待管理员审核' : 'Withdrawal request submitted, awaiting admin approval',
      });

      setUsdtForm({
        amount: '',
        usdtAddress: '',
      });
      setBalance(balance - amount);
      setFrozenBalance(frozenBalance + amount);
    } catch (err: any) {
      toast({ title: language === 'zh' ? '错误' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const bankFee = bankForm.amount ? (parseFloat(bankForm.amount) * payoutFee / 100) : 0;
  const bankNet = bankForm.amount ? (parseFloat(bankForm.amount) - bankFee) : 0;
  const usdtFee = usdtForm.amount ? (parseFloat(usdtForm.amount) * payoutFee / 100) : 0;
  const usdtNet = usdtForm.amount ? (parseFloat(usdtForm.amount) - usdtFee) : 0;

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
              {language === 'zh' ? '申请提现到您的银行账户或USDT地址' : 'Request withdrawal to your bank account or USDT address'}
            </p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="premium-card bg-gradient-to-br from-[hsl(var(--success))]/10 to-transparent border-[hsl(var(--success))]/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '可用余额' : 'Available Balance'}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">₹{balance.toLocaleString()}</p>
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
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '冻结余额' : 'Frozen Balance'}</p>
                  <p className="text-2xl font-bold text-[hsl(var(--warning))]">₹{frozenBalance.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-primary">{payoutFee}%</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    : 'All withdrawal requests require admin approval before processing. Funds will be frozen during review.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="premium-card overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="bank" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-muted/30 h-auto p-0">
                <TabsTrigger 
                  value="bank" 
                  className="rounded-none data-[state=active]:bg-[hsl(var(--success))] data-[state=active]:text-white py-4 gap-2 transition-all"
                >
                  <Banknote className="h-4 w-4" />
                  {language === 'zh' ? '银行提现' : 'Bank Withdrawal'}
                </TabsTrigger>
                <TabsTrigger 
                  value="usdt" 
                  className="rounded-none data-[state=active]:bg-[hsl(var(--warning))] data-[state=active]:text-white py-4 gap-2 transition-all"
                >
                  <Bitcoin className="h-4 w-4" />
                  {language === 'zh' ? 'USDT提现' : 'USDT Withdrawal'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="p-6 space-y-6 m-0">
                <div className="flex items-center gap-3 p-4 bg-[hsl(var(--success))]/5 rounded-xl border border-[hsl(var(--success))]/20">
                  <div className="p-2 rounded-full bg-[hsl(var(--success))]/10">
                    <Banknote className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                  <div>
                    <p className="font-semibold">{language === 'zh' ? '银行转账' : 'Bank Transfer'}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '提现到您的银行账户' : 'Withdraw to your bank account'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? '账户持有人' : 'Account Holder'}
                    </Label>
                    <Input
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                      placeholder={language === 'zh' ? '全名' : 'Full Name'}
                      className="bg-muted/30 border-border/50 focus:border-[hsl(var(--success))]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? '银行名称' : 'Bank Name'}
                    </Label>
                    <Input
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      placeholder={language === 'zh' ? '银行名称' : 'Bank Name'}
                      className="bg-muted/30 border-border/50 focus:border-[hsl(var(--success))]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? '账户号码' : 'Account Number'}
                    </Label>
                    <Input
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="XXXXXXXXXXXX"
                      className="bg-muted/30 border-border/50 focus:border-[hsl(var(--success))]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? 'IFSC代码' : 'IFSC Code'}
                    </Label>
                    <Input
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                      placeholder="ABCD0001234"
                      className="bg-muted/30 border-border/50 focus:border-[hsl(var(--success))]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-medium">
                    {language === 'zh' ? '提现金额' : 'Withdrawal Amount'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={bankForm.amount}
                      onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="pl-10 h-14 text-2xl font-bold bg-muted/30 border-border/50 focus:border-[hsl(var(--success))]"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'zh' ? '可用' : 'Available'}: ₹{balance.toLocaleString()}</span>
                    <button 
                      onClick={() => setBankForm({ ...bankForm, amount: balance.toString() })}
                      className="text-[hsl(var(--success))] font-medium hover:underline"
                    >
                      {language === 'zh' ? '全部提现' : 'Withdraw All'}
                    </button>
                  </div>
                </div>

                {/* Fee Breakdown */}
                {bankForm.amount && parseFloat(bankForm.amount) > 0 && (
                  <div className="p-4 bg-muted/30 rounded-xl space-y-2 border border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '提现金额' : 'Withdrawal Amount'}</span>
                      <span className="font-medium">₹{parseFloat(bankForm.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '手续费' : 'Fee'} ({payoutFee}%)</span>
                      <span className="font-medium text-destructive">-₹{bankFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-semibold">{language === 'zh' ? '实际到账' : 'Net Amount'}</span>
                      <span className="font-bold text-[hsl(var(--success))]">₹{bankNet.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white font-semibold gap-2"
                  onClick={handleBankWithdrawal}
                  disabled={isLoading || !bankForm.amount || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolder}
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
              </TabsContent>

              <TabsContent value="usdt" className="p-6 space-y-6 m-0">
                <div className="flex items-center gap-3 p-4 bg-[hsl(var(--warning))]/5 rounded-xl border border-[hsl(var(--warning))]/20">
                  <div className="p-2 rounded-full bg-[hsl(var(--warning))]/10">
                    <Bitcoin className="h-5 w-5 text-[hsl(var(--warning))]" />
                  </div>
                  <div>
                    <p className="font-semibold">{language === 'zh' ? 'USDT提现' : 'USDT Withdrawal'}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '提现USDT到您的TRC20地址' : 'Withdraw USDT to your TRC20 address'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? 'USDT地址 (TRC20)' : 'USDT Address (TRC20)'}
                    </Label>
                    <Input
                      value={usdtForm.usdtAddress}
                      onChange={(e) => setUsdtForm({ ...usdtForm, usdtAddress: e.target.value })}
                      placeholder="T..."
                      className="bg-muted/30 border-border/50 focus:border-[hsl(var(--warning))] font-mono"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]"></span>
                      {language === 'zh' ? '仅支持TRC20地址' : 'Only TRC20 addresses are supported'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {language === 'zh' ? '提现金额' : 'Withdrawal Amount'}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={usdtForm.amount}
                        onChange={(e) => setUsdtForm({ ...usdtForm, amount: e.target.value })}
                        placeholder="0.00"
                        className="pl-10 h-14 text-2xl font-bold bg-muted/30 border-border/50 focus:border-[hsl(var(--warning))]"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '可用' : 'Available'}: ₹{balance.toLocaleString()}</span>
                      <button 
                        onClick={() => setUsdtForm({ ...usdtForm, amount: balance.toString() })}
                        className="text-[hsl(var(--warning))] font-medium hover:underline"
                      >
                        {language === 'zh' ? '全部提现' : 'Withdraw All'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                {usdtForm.amount && parseFloat(usdtForm.amount) > 0 && (
                  <div className="p-4 bg-muted/30 rounded-xl space-y-2 border border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '提现金额' : 'Withdrawal Amount'}</span>
                      <span className="font-medium">₹{parseFloat(usdtForm.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'zh' ? '手续费' : 'Fee'} ({payoutFee}%)</span>
                      <span className="font-medium text-destructive">-₹{usdtFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-semibold">{language === 'zh' ? '实际到账' : 'Net Amount'}</span>
                      <span className="font-bold text-[hsl(var(--warning))]">₹{usdtNet.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-white font-semibold gap-2"
                  onClick={handleUsdtWithdrawal}
                  disabled={isLoading || !usdtForm.amount || !usdtForm.usdtAddress}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantWithdrawal;
