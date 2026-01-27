-- Add max_withdrawal_amount column to payment_gateways
ALTER TABLE public.payment_gateways 
ADD COLUMN IF NOT EXISTS max_withdrawal_amount NUMERIC DEFAULT 50000;

-- Drop and recreate get_my_gateway function to include max_withdrawal_amount
DROP FUNCTION IF EXISTS public.get_my_gateway();

CREATE FUNCTION public.get_my_gateway()
 RETURNS TABLE(gateway_id uuid, gateway_code text, gateway_name text, gateway_type text, currency text, min_withdrawal_amount numeric, max_withdrawal_amount numeric)
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
    COALESCE(pg.min_withdrawal_amount, 1000) as min_withdrawal_amount,
    COALESCE(pg.max_withdrawal_amount, 50000) as max_withdrawal_amount
  FROM public.merchants m
  JOIN public.payment_gateways pg ON pg.id = m.gateway_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$function$;