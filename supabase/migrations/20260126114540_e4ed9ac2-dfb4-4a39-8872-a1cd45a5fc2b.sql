-- Fix SECRETS_EXPOSED: Remove hardcoded default credentials from admin_settings
-- Change defaults to placeholder values that require admin configuration

-- Remove hardcoded default API keys by changing defaults to clearly placeholder values
ALTER TABLE public.admin_settings 
ALTER COLUMN master_api_key SET DEFAULT 'CHANGE_ME_API_KEY',
ALTER COLUMN master_payout_key SET DEFAULT 'CHANGE_ME_PAYOUT_KEY',
ALTER COLUMN master_merchant_id SET DEFAULT 'CHANGE_ME_MERCHANT_ID';

-- Also update existing row if it has the exposed credentials
UPDATE public.admin_settings
SET 
  master_api_key = CASE 
    WHEN master_api_key = 'ab76fe01039a5a5aff089d193da40a40' 
    THEN 'CHANGE_ME_API_KEY' 
    ELSE master_api_key 
  END,
  master_payout_key = CASE 
    WHEN master_payout_key = 'D7EF0E76DE29CD13E6128D722C1F6270' 
    THEN 'CHANGE_ME_PAYOUT_KEY' 
    ELSE master_payout_key 
  END,
  master_merchant_id = CASE 
    WHEN master_merchant_id = '100888140' 
    THEN 'CHANGE_ME_MERCHANT_ID' 
    ELSE master_merchant_id 
  END;