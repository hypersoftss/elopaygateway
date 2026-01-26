-- Drop the existing public policy that exposes merchant_id
DROP POLICY IF EXISTS "Public can view active links" ON public.payment_links;

-- Create a more restrictive public policy using a view approach
-- First, create a secure public view for payment links that only exposes necessary data
CREATE OR REPLACE VIEW public.public_payment_links
WITH (security_invoker=on) AS
  SELECT 
    link_code,
    amount,
    description,
    is_active,
    expires_at,
    trade_type
  FROM public.payment_links
  WHERE is_active = true;

-- Grant SELECT on the view to anon users (for payment page)
GRANT SELECT ON public.public_payment_links TO anon;
GRANT SELECT ON public.public_payment_links TO authenticated;

COMMENT ON VIEW public.public_payment_links IS 'Public-facing payment link data - excludes merchant_id and internal IDs for security';

-- Create a new policy that only allows viewing links the user needs
-- For authenticated users who are merchants viewing their own links
CREATE POLICY "Merchants can view own links"
ON public.payment_links
FOR SELECT
USING (
  (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- For anon users, we'll use the edge function with service role to look up links
-- This ensures merchant_id is never exposed to public queries