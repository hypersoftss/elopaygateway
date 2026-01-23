-- Add favicon_url column to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS favicon_url TEXT;