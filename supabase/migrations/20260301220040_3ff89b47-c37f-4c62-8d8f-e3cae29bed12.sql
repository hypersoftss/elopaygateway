-- Drop the restrictive INSERT policy and replace with permissive one
-- that allows both admins and merchants to insert their own logs
DROP POLICY IF EXISTS "Admin can insert merchant logs" ON merchant_activity_logs;

CREATE POLICY "Users can insert activity logs"
ON merchant_activity_logs
FOR INSERT
WITH CHECK (
  -- Admin can insert any log
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Merchant can insert logs for their own merchant_id
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
);