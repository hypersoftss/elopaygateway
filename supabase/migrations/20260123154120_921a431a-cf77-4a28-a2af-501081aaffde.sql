-- Create gateway balance history table for tracking
CREATE TABLE public.gateway_balance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  balance NUMERIC,
  status TEXT NOT NULL DEFAULT 'unknown',
  message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_gateway_balance_history_gateway_checked 
  ON public.gateway_balance_history(gateway_id, checked_at DESC);

-- Enable RLS
ALTER TABLE public.gateway_balance_history ENABLE ROW LEVEL SECURITY;

-- Admin can view gateway history
CREATE POLICY "Admin can view gateway history"
  ON public.gateway_balance_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add balance threshold columns to admin_settings
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS balance_threshold_inr NUMERIC DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS balance_threshold_pkr NUMERIC DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS balance_threshold_bdt NUMERIC DEFAULT 50000;

-- Enable realtime for gateway_balance_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.gateway_balance_history;