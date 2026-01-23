-- Create payment_gateways table to store gateway configurations
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_code TEXT NOT NULL UNIQUE, -- 'bondpay', 'lgpay_inr', 'lgpay_pkr', 'lgpay_bdt'
  gateway_name TEXT NOT NULL,
  gateway_type TEXT NOT NULL, -- 'bondpay' or 'lgpay'
  currency TEXT NOT NULL, -- 'INR', 'PKR', 'BDT'
  base_url TEXT NOT NULL,
  app_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  payout_key TEXT,
  trade_type TEXT, -- For LG Pay trade_type
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Only admins can manage gateways
CREATE POLICY "Admin can manage gateways"
ON public.payment_gateways
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add gateway_id to merchants table
ALTER TABLE public.merchants 
ADD COLUMN gateway_id UUID REFERENCES public.payment_gateways(id);

-- Add gateway_id to transactions for tracking which gateway was used
ALTER TABLE public.transactions
ADD COLUMN gateway_id UUID REFERENCES public.payment_gateways(id);

-- Insert default gateways
INSERT INTO public.payment_gateways (gateway_code, gateway_name, gateway_type, currency, base_url, app_id, api_key, payout_key, trade_type, is_active) VALUES
('bondpay', 'BondPay India', 'bondpay', 'INR', 'https://api.bond-pays.com', '100888140', 'ab76fe01039a5a5aff089d193da40a40', 'D7EF0E76DE29CD13E6128D722C1F6270', NULL, true),
('lgpay_inr', 'LG Pay India', 'lgpay', 'INR', 'https://www.lg-pay.com', '', '', '', 'inr', false),
('lgpay_pkr', 'LG Pay Pakistan', 'lgpay', 'PKR', 'https://www.lg-pay.com', 'PKR3202', 't5RO5J1afOgrnzqfjg2xg6tKuJYxV3xM', 't5RO5J1afOgrnzqfjg2xg6tKuJYxV3xM', 'test', true),
('lgpay_bdt', 'LG Pay Bangladesh', 'lgpay', 'BDT', 'https://www.lg-pay.com', 'MJL3110', 'J5kEdQO5Yb4rmRdJr3K7iKbUfDOT5W3X', 'J5kEdQO5Yb4rmRdJr3K7iKbUfDOT5W3X', 'test', true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_gateways_updated_at
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();