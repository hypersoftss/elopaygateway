import { useState, useEffect } from 'react';
import { Wallet, Banknote, Bitcoin } from 'lucide-react';
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
  const [payoutFee, setPayoutFee] = useState(0);

  // Bank form
  const [bankForm, setBankForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
    withdrawalPassword: '',
  });

  // USDT form
  const [usdtForm, setUsdtForm] = useState({
    amount: '',
    usdtAddress: '',
    withdrawalPassword: '',
  });

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!user?.merchantId) return;

      const { data } = await supabase
        .from('merchants')
        .select('balance, payout_fee')
        .eq('id', user.merchantId)
        .single();

      if (data) {
        setBalance(Number(data.balance));
        setPayoutFee(Number(data.payout_fee));
      }
    };

    fetchMerchantData();
  }, [user?.merchantId]);

  const calculateFee = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    return (numAmount * payoutFee) / 100;
  };

  const calculateNetAmount = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const fee = calculateFee(amount);
    return numAmount - fee;
  };

  const handleBankWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(bankForm.amount);
    if (amount <= 0) {
      toast({ title: t('common.error'), description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (amount > balance) {
      toast({ title: t('common.error'), description: 'Insufficient balance', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const fee = calculateFee(bankForm.amount);
      const netAmount = calculateNetAmount(bankForm.amount);
      const orderNo = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      });

      if (error) throw error;

      // Freeze the amount
      await supabase
        .from('merchants')
        .update({
          balance: balance - amount,
          frozen_balance: amount,
        })
        .eq('id', user.merchantId);

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '提现申请已提交' : 'Withdrawal request submitted',
      });

      setBankForm({
        amount: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolder: '',
        withdrawalPassword: '',
      });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsdtWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(usdtForm.amount);
    if (amount <= 0) {
      toast({ title: t('common.error'), description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (amount > balance) {
      toast({ title: t('common.error'), description: 'Insufficient balance', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const fee = calculateFee(usdtForm.amount);
      const netAmount = calculateNetAmount(usdtForm.amount);
      const orderNo = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase.from('transactions').insert({
        merchant_id: user.merchantId,
        order_no: orderNo,
        transaction_type: 'payout',
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        usdt_address: usdtForm.usdtAddress,
      });

      if (error) throw error;

      // Freeze the amount
      await supabase
        .from('merchants')
        .update({
          balance: balance - amount,
          frozen_balance: amount,
        })
        .eq('id', user.merchantId);

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '提现申请已提交' : 'Withdrawal request submitted',
      });

      setUsdtForm({
        amount: '',
        usdtAddress: '',
        withdrawalPassword: '',
      });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('withdrawal.title')}</h1>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t('dashboard.availableBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{balance.toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Withdrawal Forms */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="bank">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  {t('withdrawal.bankTransfer')}
                </TabsTrigger>
                <TabsTrigger value="usdt" className="flex items-center gap-2">
                  <Bitcoin className="h-4 w-4" />
                  {t('withdrawal.usdt')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('withdrawal.amount')}</Label>
                    <Input
                      type="number"
                      value={bankForm.amount}
                      onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                    {bankForm.amount && (
                      <div className="text-sm text-muted-foreground">
                        <p>{t('withdrawal.fee')}: ₹{calculateFee(bankForm.amount).toFixed(2)} ({payoutFee}%)</p>
                        <p>{t('withdrawal.netAmount')}: ₹{calculateNetAmount(bankForm.amount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.bankName')}</Label>
                    <Input
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      placeholder="HDFC Bank"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.accountNumber')}</Label>
                    <Input
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.ifscCode')}</Label>
                    <Input
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                      placeholder="HDFC0001234"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.accountHolder')}</Label>
                    <Input
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                      placeholder="Name as per bank account"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.password')}</Label>
                    <Input
                      type="password"
                      value={bankForm.withdrawalPassword}
                      onChange={(e) => setBankForm({ ...bankForm, withdrawalPassword: e.target.value })}
                      placeholder="Enter withdrawal password"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleBankWithdrawal}
                  disabled={isLoading || !bankForm.amount || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolder}
                >
                  {isLoading ? t('common.loading') : t('withdrawal.submit')}
                </Button>
              </TabsContent>

              <TabsContent value="usdt" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('withdrawal.amount')}</Label>
                    <Input
                      type="number"
                      value={usdtForm.amount}
                      onChange={(e) => setUsdtForm({ ...usdtForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                    {usdtForm.amount && (
                      <div className="text-sm text-muted-foreground">
                        <p>{t('withdrawal.fee')}: ₹{calculateFee(usdtForm.amount).toFixed(2)} ({payoutFee}%)</p>
                        <p>{t('withdrawal.netAmount')}: ₹{calculateNetAmount(usdtForm.amount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.usdtAddress')}</Label>
                    <Input
                      value={usdtForm.usdtAddress}
                      onChange={(e) => setUsdtForm({ ...usdtForm, usdtAddress: e.target.value })}
                      placeholder="TRC20 USDT Address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('withdrawal.password')}</Label>
                    <Input
                      type="password"
                      value={usdtForm.withdrawalPassword}
                      onChange={(e) => setUsdtForm({ ...usdtForm, withdrawalPassword: e.target.value })}
                      placeholder="Enter withdrawal password"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleUsdtWithdrawal}
                  disabled={isLoading || !usdtForm.amount || !usdtForm.usdtAddress}
                >
                  {isLoading ? t('common.loading') : t('withdrawal.submit')}
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
