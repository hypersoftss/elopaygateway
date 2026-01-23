-- Add trade_type column to payment_links for gateway-specific payment methods
ALTER TABLE public.payment_links ADD COLUMN trade_type text;