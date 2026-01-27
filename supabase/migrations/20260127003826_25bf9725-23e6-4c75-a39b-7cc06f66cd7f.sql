-- Drop the existing foreign key constraint
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_transaction_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_transaction_id_fkey 
FOREIGN KEY (transaction_id) 
REFERENCES public.transactions(id) 
ON DELETE CASCADE;

-- Also add ON DELETE SET NULL for merchant_id to handle merchant deletions gracefully
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_merchant_id_fkey;

ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_merchant_id_fkey 
FOREIGN KEY (merchant_id) 
REFERENCES public.merchants(id) 
ON DELETE SET NULL;