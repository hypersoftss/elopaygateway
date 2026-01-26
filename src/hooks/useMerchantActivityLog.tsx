import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';

type ActionType = 
  | 'login'
  | 'logout' 
  | 'dashboard_view'
  | 'payin_view'
  | 'payout_view'
  | 'withdrawal_request'
  | 'payment_link_create'
  | 'payment_link_delete'
  | 'api_test'
  | 'docs_view'
  | 'security_2fa_enable'
  | 'security_2fa_disable'
  | 'password_change'
  | 'withdrawal_password_set'
  | 'callback_url_update'
  | 'telegram_connect'
  | 'analytics_view'
  | 'settlement_view'
  | 'channel_price_view'
  | 'account_info_view';

interface LogActivityParams {
  actionType: ActionType;
  actionDetails?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export const useMerchantActivityLog = () => {
  const { user } = useAuthStore();

  const logActivity = async ({ actionType, actionDetails, oldValues, newValues }: LogActivityParams) => {
    if (!user?.merchantId) return;

    try {
      await supabase.from('merchant_activity_logs').insert({
        merchant_id: user.merchantId,
        admin_user_id: null, // Merchant actions, not admin
        action_type: actionType,
        action_details: actionDetails || {},
        old_values: oldValues || null,
        new_values: newValues || null,
      });
    } catch (error) {
      console.error('Failed to log merchant activity:', error);
    }
  };

  return { logActivity };
};

// Standalone function for login/logout logging (when hook can't be used)
export const logMerchantAuth = async (merchantId: string, actionType: 'login' | 'logout') => {
  try {
    await supabase.from('merchant_activity_logs').insert({
      merchant_id: merchantId,
      admin_user_id: null,
      action_type: actionType,
      action_details: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Failed to log merchant auth:', error);
  }
};
