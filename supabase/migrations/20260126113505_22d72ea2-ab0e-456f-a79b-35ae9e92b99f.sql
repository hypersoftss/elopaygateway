-- Create a function to get gateway branding (works around view type issues)
CREATE OR REPLACE FUNCTION public.get_gateway_branding()
RETURNS TABLE(
  gateway_name text,
  logo_url text,
  favicon_url text,
  support_email text,
  gateway_domain text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gateway_name,
    logo_url,
    favicon_url,
    support_email,
    gateway_domain
  FROM public.admin_settings
  LIMIT 1;
$$;