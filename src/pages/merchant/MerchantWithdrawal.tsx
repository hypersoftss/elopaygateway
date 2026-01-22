import { useState, useEffect } from 'react';
import { Wallet, Banknote, Bitcoin, Copy, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  const handleBankWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(bankForm.amount);
    if (amount <= 0) {
      toast({ title: 'Error', description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (amount > balance) {
      toast({ title: 'Error', description: 'Insufficient balance', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const fee = (amount * payoutFee) / 100;
      const netAmount = amount - fee;
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
        title: 'Success',
        description: 'Withdrawal request submitted',
      });

      setBankForm({
        amount: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolder: '',
      });
      setBalance(balance - amount);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsdtWithdrawal = async () => {
    if (!user?.merchantId) return;

    const amount = parseFloat(usdtForm.amount);
    if (amount <= 0) {
      toast({ title: 'Error', description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (amount > balance) {
      toast({ title: 'Error', description: 'Insufficient balance', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const fee = (amount * payoutFee) / 100;
      const netAmount = amount - fee;
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
        title: 'Success',
        description: 'Withdrawal request submitted',
      });

      setUsdtForm({
        amount: '',
        usdtAddress: '',
      });
      setBalance(balance - amount);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-[hsl(174_62%_47%)] to-[hsl(174_62%_35%)] border-0 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 text-sm font-medium">Available Balance</p>
                <p className="text-4xl font-bold mt-1">₹{balance.toFixed(2)}</p>
                <p className="text-white/60 text-sm mt-2">Fee: {payoutFee}% per withdrawal</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secure Withdrawal Notice */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Secure Withdrawal</p>
                <p className="text-xs text-muted-foreground">
                  All withdrawals require Google Authenticator verification and withdrawal password for your security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Tabs defaultValue="bank" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="bank" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--success))] data-[state=active]:bg-[hsl(var(--success))] data-[state=active]:text-white py-3"
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Bank Withdrawal
                </TabsTrigger>
                <TabsTrigger 
                  value="usdt" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--success))] data-[state=active]:bg-[hsl(var(--success))] data-[state=active]:text-white py-3"
                >
                  <Bitcoin className="h-4 w-4 mr-2" />
                  USDT Withdrawal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Bank Withdrawal</p>
                    <p className="text-sm text-muted-foreground">Withdraw funds to your bank account</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Account Holder</Label>
                    <Input
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                      placeholder="Full Name"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Bank Name</Label>
                    <Input
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      placeholder="Bank Name"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Account Number</Label>
                    <Input
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="XXXXXXXXXXXX"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">IFSC Code</Label>
                    <Input
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                      placeholder="ABCD0001234"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={bankForm.amount}
                      onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="pl-7 bg-muted/50 border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Available Balance: ₹{balance.toFixed(2)}</p>
                </div>

                <Button
                  className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                  onClick={handleBankWithdrawal}
                  disabled={isLoading || !bankForm.amount || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolder}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  {isLoading ? 'Processing...' : 'Withdrawal'}
                </Button>
              </TabsContent>

              <TabsContent value="usdt" className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Bitcoin className="h-5 w-5 text-[hsl(var(--warning))]" />
                  <div>
                    <p className="font-semibold">USDT Withdrawal</p>
                    <p className="text-sm text-muted-foreground">Withdraw funds as USDT (TRC20)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">USDT Address (TRC20)</Label>
                    <Input
                      value={usdtForm.usdtAddress}
                      onChange={(e) => setUsdtForm({ ...usdtForm, usdtAddress: e.target.value })}
                      placeholder="T..."
                      className="bg-muted/50 border-border"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                      Only TRC20 addresses are supported
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={usdtForm.amount}
                        onChange={(e) => setUsdtForm({ ...usdtForm, amount: e.target.value })}
                        placeholder="0.00"
                        className="pl-7 bg-muted/50 border-border"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Available Balance: ₹{balance.toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                  onClick={handleUsdtWithdrawal}
                  disabled={isLoading || !usdtForm.amount || !usdtForm.usdtAddress}
                >
                  <Bitcoin className="h-4 w-4 mr-2" />
                  {isLoading ? 'Processing...' : 'Withdrawal'}
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
