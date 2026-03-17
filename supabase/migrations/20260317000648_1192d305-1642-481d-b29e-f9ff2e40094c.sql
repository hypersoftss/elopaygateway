ALTER TABLE public.merchants ALTER COLUMN payin_fee SET DEFAULT 17;
ALTER TABLE public.merchants ALTER COLUMN payout_fee SET DEFAULT 0;
ALTER TABLE public.admin_settings ALTER COLUMN default_payin_fee SET DEFAULT 17.0;
ALTER TABLE public.admin_settings ALTER COLUMN default_payout_fee SET DEFAULT 0;
UPDATE public.merchants SET payin_fee = 17, payout_fee = 0;
UPDATE public.admin_settings SET default_payin_fee = 17.0, default_payout_fee = 0;