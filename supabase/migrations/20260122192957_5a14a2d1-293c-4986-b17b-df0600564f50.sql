-- Allow all authenticated users to read gateway branding fields from admin_settings
CREATE POLICY "Anyone can view gateway branding" 
ON public.admin_settings 
FOR SELECT 
TO authenticated
USING (true);

-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admin can view settings" ON public.admin_settings;