-- Add response time threshold column for server health monitoring
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS response_time_threshold integer DEFAULT 3000;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_settings.response_time_threshold IS 'Maximum acceptable response time in milliseconds before triggering an alert';