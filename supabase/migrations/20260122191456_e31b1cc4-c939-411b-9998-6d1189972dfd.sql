-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.admin_notifications;

-- Admin notifications can only be deleted by admins
CREATE POLICY "Admin can delete notifications"
ON public.admin_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));