import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gatewayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
}

// Cache the settings globally to avoid flicker on navigation
let cachedSettings: GatewaySettings | null = null;

export const useGatewaySettings = () => {
  const [settings, setSettings] = useState<GatewaySettings>(
    cachedSettings || {
      gatewayName: '', // Empty string instead of fallback - prevents showing wrong name
      logoUrl: null,
      faviconUrl: null,
      supportEmail: null,
    }
  );
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    // If we have cached settings, use them immediately
    if (cachedSettings) {
      setSettings(cachedSettings);
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('gateway_name, logo_url, favicon_url, support_email')
          .limit(1);

        if (error) {
          console.error('Error fetching gateway settings:', error);
          return;
        }

        const settingsData = data?.[0];
        if (settingsData) {
          const newSettings = {
            gatewayName: settingsData.gateway_name || 'Payment Gateway',
            logoUrl: settingsData.logo_url,
            faviconUrl: (settingsData as any).favicon_url || null,
            supportEmail: settingsData.support_email,
          };
          // Cache the settings
          cachedSettings = newSettings;
          setSettings(newSettings);
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

// Function to clear cache (useful when admin updates settings)
export const clearGatewaySettingsCache = () => {
  cachedSettings = null;
};
