-- ==============================================================================
-- MukiSoft Assist — Migration: Customer Support Desk & Service Management
-- Prompt 5 Implementation
-- ==============================================================================

-- 1. Extend ticket_status enum if waiting_for_user doesn't exist
DO $$
BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'waiting_for_user';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Enhance support_tickets table with order association, description & attachments
ALTER TABLE public.support_tickets 
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reopen_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- 3. Create ticket_messages table for conversation history
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    sender_role TEXT NOT NULL DEFAULT 'customer' CHECK (sender_role IN ('customer', 'admin', 'staff', 'system')),
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- 4. Enable Row Level Security (RLS) on ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Non-internal messages readable by the ticket owner OR any admin
DROP POLICY IF EXISTS "Ticket owners and admins can view ticket messages" ON public.ticket_messages;
CREATE POLICY "Ticket owners and admins can view ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        public.is_admin() 
        OR (
            EXISTS (
                SELECT 1 FROM public.support_tickets
                WHERE support_tickets.id = ticket_messages.ticket_id
                AND support_tickets.user_id = auth.uid()
            )
            AND is_internal = false
        )
    );

-- Ticket owners and admins can insert messages
DROP POLICY IF EXISTS "Ticket owners and admins can insert ticket messages" ON public.ticket_messages;
CREATE POLICY "Ticket owners and admins can insert ticket messages"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        (public.is_admin())
        OR (
            EXISTS (
                SELECT 1 FROM public.support_tickets
                WHERE support_tickets.id = ticket_messages.ticket_id
                AND support_tickets.user_id = auth.uid()
            )
            AND is_internal = false
            AND sender_id = auth.uid()
        )
    );

-- 5. Trigger to update updated_at on support_tickets when new message is posted
CREATE OR REPLACE FUNCTION public.touch_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_tickets
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_touch_ticket ON public.ticket_messages;
CREATE TRIGGER trigger_touch_ticket
    AFTER INSERT ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_ticket_updated_at();
