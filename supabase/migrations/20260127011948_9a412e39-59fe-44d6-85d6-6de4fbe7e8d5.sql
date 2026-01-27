-- Create table to track last bot message per chat for auto-delete
CREATE TABLE public.telegram_bot_messages (
  chat_id TEXT PRIMARY KEY,
  last_message_id BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bot_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge function uses service role)
CREATE POLICY "Service role can manage bot messages"
ON public.telegram_bot_messages
FOR ALL
USING (true)
WITH CHECK (true);