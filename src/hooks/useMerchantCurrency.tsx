import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';

interface MerchantCurrencyData {
  currency: string;
  currencySymbol: string;
  gatewayType: string | null;
  tradeType: string | null;
  isLoading: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  PKR: 'Rs.',
  BDT: '৳',
};

export const useMerchantCurrency = (): MerchantCurrencyData => {
  const { user } = useAuthStore();
  const [data, setData] = useState<MerchantCurrencyData>({
    currency: 'INR',
    currencySymbol: '₹',
    gatewayType: null,
    tradeType: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user?.merchantId) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data: merchant, error } = await supabase
          .from('merchants')
          .select(`
            trade_type,
            payment_gateways (
              gateway_type,
              currency
            )
          `)
          .eq('id', user.merchantId)
          .single();

        if (error) throw error;

        if (merchant?.payment_gateways) {
          const gateway = merchant.payment_gateways as unknown as { gateway_type: string; currency: string };
          const currency = gateway.currency || 'INR';
          setData({
            currency,
            currencySymbol: CURRENCY_SYMBOLS[currency] || '₹',
            gatewayType: gateway.gateway_type,
            tradeType: merchant.trade_type,
            isLoading: false,
          });
        } else {
          setData(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error fetching merchant currency:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchCurrency();
  }, [user?.merchantId]);

  return data;
};

export const formatCurrency = (amount: number, symbol: string): string => {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrencyCompact = (amount: number, symbol: string): string => {
  return `${symbol}${amount.toLocaleString()}`;
};
