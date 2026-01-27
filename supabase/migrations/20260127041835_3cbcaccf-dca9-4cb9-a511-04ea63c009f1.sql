-- Fix: Replace overly permissive RLS policy on telegram_bot_messages
-- This table should only be accessible by service role (edge functions)
DROP POLICY IF EXISTS "Service role can manage bot messages" ON public.telegram_bot_messages;

-- Create a restrictive policy that only allows access via service role
-- Since edge functions use service role which bypasses RLS, we don't need any permissive policies
-- But we need at least one policy for RLS to work, so we create a deny-all policy for regular users
CREATE POLICY "No direct user access" ON public.telegram_bot_messages
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);