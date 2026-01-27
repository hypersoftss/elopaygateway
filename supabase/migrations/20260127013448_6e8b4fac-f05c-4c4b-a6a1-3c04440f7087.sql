-- Add minimum withdrawal amount column to payment_gateways
ALTER TABLE public.payment_gateways 
ADD COLUMN IF NOT EXISTS min_withdrawal_amount NUMERIC DEFAULT 1000;