-- Create merchant activity logs table
CREATE TABLE public.merchant_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  admin_user_id UUID,
  action_type TEXT NOT NULL,
  action_details JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.merchant_activity_logs IS 'Tracks all admin actions on merchant accounts';

-- Enable RLS
ALTER TABLE public.merchant_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admin can view merchant logs"
ON public.merchant_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert logs
CREATE POLICY "Admin can insert merchant logs"
ON public.merchant_activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_merchant_activity_logs_merchant_id ON public.merchant_activity_logs(merchant_id);
CREATE INDEX idx_merchant_activity_logs_created_at ON public.merchant_activity_logs(created_at DESC);