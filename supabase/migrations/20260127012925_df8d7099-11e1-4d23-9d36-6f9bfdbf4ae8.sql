-- Add column for configurable no-auto-delete commands
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS no_auto_delete_commands TEXT DEFAULT '/help,/tg_id,/id,/chatid,/setmenu,/create_merchant,/broadcast';