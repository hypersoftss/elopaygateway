-- Add telegram_chat_id column to merchants table for merchant notifications
ALTER TABLE public.merchants 
ADD COLUMN telegram_chat_id TEXT NULL;

-- Add telegram_chat_id column to admin_settings for admin notifications
ALTER TABLE public.admin_settings 
ADD COLUMN admin_telegram_chat_id TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.merchants.telegram_chat_id IS 'Telegram group/chat ID for merchant notifications';
COMMENT ON COLUMN public.admin_settings.admin_telegram_chat_id IS 'Telegram group/chat ID for admin notifications';