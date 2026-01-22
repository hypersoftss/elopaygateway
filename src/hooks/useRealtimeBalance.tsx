import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

interface RealtimeBalanceOptions {
  merchantId: string;
  onBalanceChange: (balance: number, frozenBalance: number) => void;
}

export const useRealtimeBalance = ({ merchantId, onBalanceChange }: RealtimeBalanceOptions) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!merchantId) return;

    const channel = supabase
      .channel(`merchant-balance-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'merchants',
          filter: `id=eq.${merchantId}`,
        },
        (payload) => {
          const newData = payload.new as { balance: number; frozen_balance: number };
          onBalanceChange(newData.balance, newData.frozen_balance);
          toast({
            title: t('common.success'),
            description: t('dashboard.availableBalance') + ': ₹' + newData.balance.toFixed(2),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, onBalanceChange, toast, t]);
};
