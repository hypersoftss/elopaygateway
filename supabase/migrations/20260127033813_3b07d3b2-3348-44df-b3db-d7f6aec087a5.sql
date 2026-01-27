-- Fix: Remove overly permissive INSERT policy on admin_notifications
-- Edge functions use service role key which bypasses RLS, so this policy is unnecessary
-- and creates a security vulnerability allowing any authenticated user to insert notifications

DROP POLICY IF EXISTS "Service can insert notifications" ON public.admin_notifications;