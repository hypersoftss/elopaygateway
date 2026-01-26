-- Drop the existing security definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.gateway_branding;

-- Recreate the view with SECURITY INVOKER (safer - uses caller's permissions)
CREATE VIEW public.gateway_branding
WITH (security_invoker=on) AS
  SELECT 
    gateway_name,
    logo_url,
    favicon_url,
    support_email,
    gateway_domain
  FROM public.admin_settings
  LIMIT 1;

-- Grant SELECT access to authenticated and anon users for branding info
GRANT SELECT ON public.gateway_branding TO authenticated;
GRANT SELECT ON public.gateway_branding TO anon;

-- Create an RLS policy on admin_settings to allow SELECT of branding columns only via RPC
-- The get_gateway_branding() function already handles this securely with SECURITY DEFINER
-- The view approach is deprecated in favor of the RPC function

COMMENT ON VIEW public.gateway_branding IS 'Public branding view - use get_gateway_branding() RPC function instead for secure access';