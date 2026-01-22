-- Create admin_notifications table for large transaction alerts
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  amount NUMERIC,
  merchant_id UUID REFERENCES public.merchants(id),
  transaction_id UUID REFERENCES public.transactions(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admin can view notifications"
ON public.admin_notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update notifications (mark as read)
CREATE POLICY "Admin can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- Add notification_threshold columns to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS large_payin_threshold NUMERIC DEFAULT 10000,
ADD COLUMN IF NOT EXISTS large_payout_threshold NUMERIC DEFAULT 5000,
ADD COLUMN IF NOT EXISTS large_withdrawal_threshold NUMERIC DEFAULT 5000;