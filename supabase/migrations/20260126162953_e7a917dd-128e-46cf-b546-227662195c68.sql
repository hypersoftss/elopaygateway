-- Expose safe gateway info for the currently logged-in merchant
-- (Merchants cannot SELECT from payment_gateways directly because it contains secrets)

CREATE OR REPLACE FUNCTION public.get_my_gateway()
RETURNS TABLE(
  gateway_id uuid,
  gateway_code text,
  gateway_name text,
  gateway_type text,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    pg.id as gateway_id,
    pg.gateway_code,
    pg.gateway_name,
    pg.gateway_type,
    pg.currency
  FROM public.merchants m
  JOIN public.payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_gateway() TO authenticated;