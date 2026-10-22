-- ==============================================================================
-- MukiSoft Assist — Migration: Unified chat_messages Table & Realtime Setup
-- Solves bidirectional chat visibility between customers and workers
-- ==============================================================================

-- 1. Create unified chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    receiver_id UUID,
    sender_name TEXT,
    sender_role TEXT DEFAULT 'customer',
    message TEXT NOT NULL,
    message_content TEXT,
    attachment_name TEXT,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist safely
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'customer';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_content TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);

-- 3. Row Level Security (RLS) - Fully Open & Symmetric for Order Participants
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for chat messages" ON public.chat_messages;
CREATE POLICY "Allow select for chat messages"
    ON public.chat_messages FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert for chat messages" ON public.chat_messages;
CREATE POLICY "Allow insert for chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for chat messages" ON public.chat_messages;
CREATE POLICY "Allow update for chat messages"
    ON public.chat_messages FOR UPDATE
    USING (true);

-- 4. Enable Realtime Payload with All Columns
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 5. Safe Publication Subscription (Idempotent - Prevents ERROR 42710)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- 6. Also ensure order_messages is fully open for backward compatibility
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'order_messages'
    ) THEN
        ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow select for order messages" ON public.order_messages;
        CREATE POLICY "Allow select for order messages"
            ON public.order_messages FOR SELECT
            USING (true);

        DROP POLICY IF EXISTS "Allow insert for order messages" ON public.order_messages;
        CREATE POLICY "Allow insert for order messages"
            ON public.order_messages FOR INSERT
            WITH CHECK (true);

        ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
    END IF;
END $$;
