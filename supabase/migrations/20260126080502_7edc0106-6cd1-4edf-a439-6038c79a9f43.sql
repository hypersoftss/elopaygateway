-- Allow admin to delete transactions
CREATE POLICY "Admin can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));