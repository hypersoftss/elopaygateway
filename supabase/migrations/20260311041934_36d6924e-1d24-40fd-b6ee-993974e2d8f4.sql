CREATE OR REPLACE FUNCTION public.get_my_gateway()
 RETURNS TABLE(gateway_id uuid, gateway_code text, gateway_name text, gateway_type text, currency text, min_withdrawal_amount numeric, max_withdrawal_amount numeric, daily_withdrawal_limit numeric)
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
    COALESCE(pg.min_withdrawal_amount, 200) as min_withdrawal_amount,
    COALESCE(pg.max_withdrawal_amount, 50000) as max_withdrawal_amount,
    COALESCE(pg.daily_withdrawal_limit, 200000) as daily_withdrawal_limit
  FROM public.merchants m
  JOIN public.payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$function$;