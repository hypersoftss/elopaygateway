-- Add bot token and webhook URL to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS telegram_bot_token text,
ADD COLUMN IF NOT EXISTS telegram_webhook_url text;