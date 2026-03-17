ALTER TABLE public.merchants ALTER COLUMN payin_fee SET DEFAULT 19;
ALTER TABLE public.admin_settings ALTER COLUMN default_payin_fee SET DEFAULT 19.0;
UPDATE public.merchants SET payin_fee = 19;
UPDATE public.admin_settings SET default_payin_fee = 19.0;