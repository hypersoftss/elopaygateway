-- Drop and recreate get_my_gateway function with min_withdrawal_amount
DROP FUNCTION IF EXISTS public.get_my_gateway();

CREATE FUNCTION public.get_my_gateway()
 RETURNS TABLE(gateway_id uuid, gateway_code text, gateway_name text, gateway_type text, currency text, min_withdrawal_amount numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pg.id as gateway_id,
    pg.gateway_code,
    pg.gateway_name,
    pg.gateway_type,
    pg.currency,
    COALESCE(pg.min_withdrawal_amount, 1000) as min_withdrawal_amount
  FROM public.merchants m
  JOIN public.payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$function$;