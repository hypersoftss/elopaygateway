import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';

interface MerchantCurrencyData {
  currency: string;
  currencySymbol: string;
  currencyFlag: string;
  currencyWithFlag: string;
  gatewayType: string | null;
  gatewayCode: string | null;
  gatewayName: string | null;
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
    gatewayCode: null,
    gatewayName: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user?.merchantId) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Use the secure RPC function to get gateway info
        // This function only exposes safe fields (no API keys)
        const { data: gatewayData, error } = await supabase.rpc('get_my_gateway');

        if (error) {
          console.error('Error fetching gateway info:', error);
          setData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (gatewayData && gatewayData.length > 0) {
          const gateway = gatewayData[0];
          const currency = gateway.currency || 'INR';
          const symbol = CURRENCY_SYMBOLS[currency] || '₹';
          const flag = CURRENCY_FLAGS[currency] || '🇮🇳';
          
          setData({
            currency,
            currencySymbol: symbol,
            currencyFlag: flag,
            currencyWithFlag: `${flag} ${symbol}`,
            gatewayType: gateway.gateway_type,
            gatewayCode: gateway.gateway_code,
            gatewayName: gateway.gateway_name,
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
