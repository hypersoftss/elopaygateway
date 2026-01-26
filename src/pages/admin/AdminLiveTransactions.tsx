import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import { 
  Activity, Search, Filter, Volume2, VolumeX, Bell, BellOff, 
  ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, XCircle,
  Pause, Play, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  order_no: string;
  merchant_order_no: string | null;
  amount: number;
  fee: number | null;
  net_amount: number | null;
  status: 'pending' | 'success' | 'failed';
  transaction_type: 'payin' | 'payout';
  created_at: string;
  merchant_id: string;
  merchants?: { merchant_name: string; account_number: string } | null;
}

// Notification sound URL (simple beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleB8NLIrS6Z5ZFQY5k9G6dxkEB0aW0sqWXAsEPprMtm0eDQU4lsW0dRwNBzaYvq5wHBMMN5e5p2ocEg02l7OhZhsUDTaWrJphGhUNNpaolF4ZFg42laGOWxgXDjaVm4lXFxkON5WWg1MWGg44lZF+TxUbDzmVjXlLFBwPOpWJdEcTHRA7lYVwQxIfETuVgnE/EB8SPJJ8bDsPIBM9kXdoPQ8hFD2Pc2M6DiIVPo5wXzYNIxY+jWxbMwskFz+LZ1YvCiQYQIpjUSwJJRlAiF5NKQgmGkGHWkkl';

export default function AdminLiveTransactions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [merchants, setMerchants] = useState<{ id: string; merchant_name: string }[]>([]);
  const [filterMerchant, setFilterMerchant] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Show desktop notification
  const showDesktopNotification = useCallback((tx: Transaction) => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const isPayin = tx.transaction_type === 'payin';
    const title = isPayin ? '🔔 New Pay-in Order' : '🔔 New Payout Request';
    const body = `${tx.order_no} - ₹${tx.amount.toLocaleString()}`;

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: tx.id,
      requireInteraction: false,
    });
  }, [notificationsEnabled]);

  // Fetch merchants
  useEffect(() => {
    const fetchMerchants = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('id, merchant_name')
        .order('merchant_name');
      if (data) setMerchants(data);
    };
    fetchMerchants();
  }, []);

  // Fetch initial transactions
  const fetchTransactions = useCallback(async () => {
    let query = supabase
      .from('transactions')
      .select('*, merchants(merchant_name, account_number)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterType !== 'all') {
      query = query.eq('transaction_type', filterType as 'payin' | 'payout');
    }
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus as 'pending' | 'success' | 'failed');
    }
    if (filterMerchant !== 'all') {
      query = query.eq('merchant_id', filterMerchant);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }
    setTransactions(data || []);
  }, [filterType, filterStatus, filterMerchant]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel('live-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        async (payload) => {
          const newTx = payload.new as Transaction;
          
          // Fetch merchant info
          const { data: merchant } = await supabase
            .from('merchants')
            .select('merchant_name, account_number')
            .eq('id', newTx.merchant_id)
            .maybeSingle();

          const txWithMerchant = { ...newTx, merchants: merchant };
          
          setTransactions(prev => [txWithMerchant, ...prev.slice(0, 99)]);
          playNotificationSound();
          showDesktopNotification(txWithMerchant);
          
          toast({
            title: newTx.transaction_type === 'payin' ? '🔔 New Pay-in' : '🔔 New Payout',
            description: `${newTx.order_no} - ₹${newTx.amount.toLocaleString()}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const updated = payload.new as Transaction;
          setTransactions(prev =>
            prev.map(tx => tx.id === updated.id ? { ...tx, ...updated } : tx)
          );

          if (payload.old.status !== updated.status) {
            const statusIcon = updated.status === 'success' ? '✅' : updated.status === 'failed' ? '❌' : '⏳';
            toast({
              title: `${statusIcon} Status Updated`,
              description: `${updated.order_no} → ${updated.status.toUpperCase()}`,
              variant: updated.status === 'failed' ? 'destructive' : 'default',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, playNotificationSound, showDesktopNotification, toast]);

  // Filter transactions by search
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.order_no.toLowerCase().includes(query) ||
      tx.merchant_order_no?.toLowerCase().includes(query) ||
      tx.merchants?.merchant_name.toLowerCase().includes(query) ||
      tx.merchants?.account_number.includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const enableDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Not Supported', description: 'Desktop notifications not supported', variant: 'destructive' });
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      toast({ title: 'Enabled', description: 'Desktop notifications enabled' });
    } else {
      toast({ title: 'Denied', description: 'Notification permission denied', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Live Transactions</h1>
              <p className="text-sm text-muted-foreground">Real-time transaction feed</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Live Toggle */}
            <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border">
              {isLive ? (
                <Pause className="h-4 w-4 text-yellow-500" />
              ) : (
                <Play className="h-4 w-4 text-green-500" />
              )}
              <Label htmlFor="live-toggle" className="text-sm cursor-pointer">
                {isLive ? 'Live' : 'Paused'}
              </Label>
              <Switch
                id="live-toggle"
                checked={isLive}
                onCheckedChange={setIsLive}
              />
            </div>

            {/* Sound Toggle */}
            <Button
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Desktop Notifications */}
            <Button
              variant={notificationsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (notificationsEnabled) {
                  setNotificationsEnabled(false);
                } else {
                  enableDesktopNotifications();
                }
              }}
            >
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>

            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders, merchants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payin">Pay-in</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMerchant} onValueChange={setFilterMerchant}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Merchant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Merchants</SelectItem>
                  {merchants.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.merchant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Feed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className={`h-5 w-5 ${isLive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                Transaction Feed
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {filteredTransactions.length} transactions
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                  <p className="text-sm">Transactions will appear here in real-time</p>
                </div>
              ) : (
                filteredTransactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-all ${
                      index === 0 && isLive ? 'animate-in slide-in-from-top-2 duration-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        tx.transaction_type === 'payin' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {tx.transaction_type === 'payin' ? (
                          <ArrowDownCircle className="h-5 w-5" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{tx.order_no}</span>
                          {getStatusBadge(tx.status)}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{tx.merchants?.merchant_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{format(new Date(tx.created_at), 'HH:mm:ss')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">₹{tx.amount.toLocaleString()}</p>
                      {tx.fee && (
                        <p className="text-xs text-muted-foreground">
                          Fee: ₹{tx.fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
