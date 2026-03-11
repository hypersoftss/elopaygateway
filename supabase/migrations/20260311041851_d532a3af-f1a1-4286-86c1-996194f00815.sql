ALTER TABLE public.payment_gateways ALTER COLUMN min_withdrawal_amount SET DEFAULT 200;
UPDATE public.payment_gateways SET min_withdrawal_amount = 200 WHERE min_withdrawal_amount = 1000;