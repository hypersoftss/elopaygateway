-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Enable realtime for admin_notifications table (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END $$;