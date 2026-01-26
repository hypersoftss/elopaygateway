import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';

interface MerchantCurrencyData {
  currency: string;
  currencySymbol: string;
  currencyFlag: string;
  currencyWithFlag: string;
  gatewayType: string | null;
  tradeType: string | null;
  isLoading: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  PKR: 'Rs.',
  BDT: '৳',
};

const CURRENCY_FLAGS: Record<string, string> = {
  INR: '🇮🇳',
  PKR: '🇵🇰',
  BDT: '🇧🇩',
};

export const useMerchantCurrency = (): MerchantCurrencyData => {
  const { user } = useAuthStore();
  const [data, setData] = useState<MerchantCurrencyData>({
    currency: 'INR',
    currencySymbol: '₹',
    currencyFlag: '🇮🇳',
    currencyWithFlag: '🇮🇳 ₹',
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
        // First get the merchant's gateway_id and trade_type
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('gateway_id, trade_type')
          .eq('id', user.merchantId)
          .single();

        if (merchantError) throw merchantError;

        if (merchant?.gateway_id) {
          // Then get the gateway details
          const { data: gateway, error: gatewayError } = await supabase
            .from('payment_gateways')
            .select('gateway_type, currency')
            .eq('id', merchant.gateway_id)
            .single();

          if (gatewayError) throw gatewayError;

          if (gateway) {
            const currency = gateway.currency || 'INR';
            const symbol = CURRENCY_SYMBOLS[currency] || '₹';
            const flag = CURRENCY_FLAGS[currency] || '🇮🇳';
            setData({
              currency,
              currencySymbol: symbol,
              currencyFlag: flag,
              currencyWithFlag: `${flag} ${symbol}`,
              gatewayType: gateway.gateway_type,
              tradeType: merchant.trade_type,
              isLoading: false,
            });
            return;
          }
        }

        // Fallback to INR if no gateway found
        setData(prev => ({ ...prev, isLoading: false }));
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
