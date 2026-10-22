-- ==============================================================================
-- MukiSoft Assist — Migration: Safe order_messages Setup & Realtime Configuration
-- Handles error 42710 idempotently (table already a member of publication)
-- ==============================================================================

-- 1. Create table if not exists (using UUID id with gen_random_uuid default)
CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    receiver_id UUID,
    sender_name TEXT,
    sender_role TEXT DEFAULT 'customer',
    message_content TEXT,
    message TEXT,
    attachment_name TEXT,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add columns safely if table already existed with missing fields
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'customer';
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS message_content TEXT;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Indexes for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON public.order_messages(created_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- 5. Idempotent policies (drop and re-create safely)
DROP POLICY IF EXISTS "Allow select for order messages" ON public.order_messages;
CREATE POLICY "Allow select for order messages"
    ON public.order_messages FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert for order messages" ON public.order_messages;
CREATE POLICY "Allow insert for order messages"
    ON public.order_messages FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for order messages" ON public.order_messages;
CREATE POLICY "Allow update for order messages"
    ON public.order_messages FOR UPDATE
    USING (true);

-- 6. Set REPLICA IDENTITY FULL so all columns are included in realtime payloads
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;

-- 7. Add to supabase_realtime publication safely without error 42710
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'order_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;
