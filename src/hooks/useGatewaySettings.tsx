import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GatewaySettings {
  gatewayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  gatewayDomain: string | null;
}

interface GatewayBrandingRow {
  gateway_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string | null;
  gateway_domain: string | null;
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
      gatewayDomain: null,
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
        // Use the secure gateway_branding view instead of admin_settings
        // This view only exposes public branding fields, not sensitive data
        // Using RPC to query the view since it's not in the generated types
        const { data, error } = await supabase.rpc('get_gateway_branding' as any);

        if (error) {
          // Fallback: try querying admin_settings for admins or use empty settings
          console.warn('Gateway branding view not available, falling back');
          setIsLoading(false);
          return;
        }

        const settingsData = Array.isArray(data) ? data[0] : data;
        if (settingsData) {
          const row = settingsData as GatewayBrandingRow;
          const newSettings = {
            gatewayName: row.gateway_name || 'Payment Gateway',
            logoUrl: row.logo_url,
            faviconUrl: row.favicon_url || null,
            supportEmail: row.support_email,
            gatewayDomain: row.gateway_domain || null,
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
