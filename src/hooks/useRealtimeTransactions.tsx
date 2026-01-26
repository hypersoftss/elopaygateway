import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

interface Transaction {
  id: string;
  order_no: string;
  transaction_type: 'payin' | 'payout';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  merchant_id: string;
  created_at: string;
}

interface RealtimeTransactionsOptions {
  onNewTransaction?: (transaction: Transaction) => void;
  onTransactionUpdate?: (transaction: Transaction) => void;
  merchantId?: string; // Filter by merchant if provided
  isAdmin?: boolean;
}

export const useRealtimeTransactions = ({
  onNewTransaction,
  onTransactionUpdate,
  merchantId,
  isAdmin = false,
}: RealtimeTransactionsOptions) => {
  const { toast } = useToast();
  const { t, language } = useTranslation();

  const handleInsert = useCallback((payload: any) => {
    const newTx = payload.new as Transaction;
    
    // Show toast notification
    const isPayin = newTx.transaction_type === 'payin';
    const currencySymbol = '₹';
    
    toast({
      title: isPayin 
        ? (language === 'zh' ? '新收款订单' : '🔔 New Pay-in') 
        : (language === 'zh' ? '新付款请求' : '🔔 New Payout Request'),
      description: `${newTx.order_no} - ${currencySymbol}${newTx.amount.toLocaleString()}`,
      variant: 'default',
    });

    onNewTransaction?.(newTx);
  }, [onNewTransaction, toast, language]);

  const handleUpdate = useCallback((payload: any) => {
    const updatedTx = payload.new as Transaction;
    const oldTx = payload.old as Transaction;

    // Only notify on status change
    if (oldTx.status !== updatedTx.status) {
      const statusLabels: Record<string, { en: string; zh: string }> = {
        success: { en: '✅ Transaction Successful', zh: '交易成功' },
        failed: { en: '❌ Transaction Failed', zh: '交易失败' },
        pending: { en: '⏳ Transaction Pending', zh: '交易处理中' },
      };

      const statusLabel = statusLabels[updatedTx.status] || statusLabels.pending;

      toast({
        title: language === 'zh' ? statusLabel.zh : statusLabel.en,
        description: `${updatedTx.order_no} - ₹${updatedTx.amount.toLocaleString()}`,
        variant: updatedTx.status === 'failed' ? 'destructive' : 'default',
      });
    }

    onTransactionUpdate?.(updatedTx);
  }, [onTransactionUpdate, toast, language]);

  useEffect(() => {
    // Build filter based on role
    const filter = merchantId ? `merchant_id=eq.${merchantId}` : undefined;
    const channelName = merchantId 
      ? `transactions-merchant-${merchantId}` 
      : 'transactions-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          ...(filter && { filter }),
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          ...(filter && { filter }),
        },
        handleUpdate
      )
      .subscribe((status) => {
        console.log('Realtime transactions subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, handleInsert, handleUpdate]);
};
