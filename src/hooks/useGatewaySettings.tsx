import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gatewayName: string;
  logoUrl: string | null;
  supportEmail: string | null;
}

export const useGatewaySettings = () => {
  const [settings, setSettings] = useState<GatewaySettings>({
    gatewayName: 'PayGate',
    logoUrl: null,
    supportEmail: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('gateway_name, logo_url, support_email')
          .limit(1);

        const settingsData = data?.[0];
        if (settingsData) {
          setSettings({
            gatewayName: settingsData.gateway_name || 'PayGate',
            logoUrl: settingsData.logo_url,
            supportEmail: settingsData.support_email,
          });
        }
      } catch (error) {
        console.error('Error fetching gateway settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, isLoading };
};
