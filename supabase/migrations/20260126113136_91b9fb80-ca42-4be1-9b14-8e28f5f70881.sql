-- Fix 1: PUBLIC_DATA_EXPOSURE - Create secure view for public branding and fix RLS

-- Drop the overly permissive policy that exposes all admin_settings columns
DROP POLICY IF EXISTS "Anyone can view gateway branding" ON public.admin_settings;

-- Create a secure view that only exposes public branding fields
CREATE OR REPLACE VIEW public.gateway_branding AS
SELECT 
  gateway_name, 
  logo_url, 
  favicon_url, 
  support_email, 
  gateway_domain
FROM public.admin_settings
LIMIT 1;

-- Grant SELECT on the view to authenticated and anon users (for public pages like payment)
GRANT SELECT ON public.gateway_branding TO authenticated;
GRANT SELECT ON public.gateway_branding TO anon;

-- Create admin-only SELECT policy for full table access
CREATE POLICY "Admin can view all settings"
ON public.admin_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: SECRETS_EXPOSED - Add hashed password column for withdrawal passwords
-- Add new column for hashed passwords
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS withdrawal_password_hash TEXT;

-- Note: The old withdrawal_password column will be deprecated after migration
-- Keep it temporarily to allow password migration