-- Fix: Remove overly permissive RLS policy that exposes sensitive admin settings
-- The gateway_branding view and get_gateway_branding() function already provide safe access to branding
DROP POLICY IF EXISTS "Anyone can view gateway branding" ON public.admin_settings;

-- Fix: Drop public_payment_links view that allows enumeration of all active payment links
-- The get-payment-link-merchant edge function should be used instead for secure access
REVOKE SELECT ON public.public_payment_links FROM anon;
REVOKE SELECT ON public.public_payment_links FROM authenticated;
DROP VIEW IF EXISTS public.public_payment_links;