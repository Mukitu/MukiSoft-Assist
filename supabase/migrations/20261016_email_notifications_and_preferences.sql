-- ==============================================================================
-- MukiSoft Assist — Migration: Email Notifications, Queue Outbox & User Preferences
-- Prompt 9 Implementation
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. USER NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    orders_email BOOLEAN NOT NULL DEFAULT true,
    deposits_email BOOLEAN NOT NULL DEFAULT true,
    support_email BOOLEAN NOT NULL DEFAULT true,
    marketing_email BOOLEAN NOT NULL DEFAULT false,
    security_email BOOLEAN NOT NULL DEFAULT true, -- Mandatory security communications
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can view own notification preferences"
    ON public.user_notification_preferences FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
    ON public.user_notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can update own notification preferences"
    ON public.user_notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. EMAIL OUTBOX TABLE (Reliable queue with retry, idempotency & status tracking)
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_key TEXT UNIQUE, -- Unique event identifier to prevent duplicate sends
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    template_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    body_html TEXT NOT NULL,
    body_text TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    delivery_channel TEXT NOT NULL DEFAULT 'email',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_user_id ON public.email_outbox(user_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_event_key ON public.email_outbox(event_key);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email outbox" ON public.email_outbox;
CREATE POLICY "Users can view own email outbox"
    ON public.email_outbox FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage email outbox" ON public.email_outbox;
CREATE POLICY "Admins can manage email outbox"
    ON public.email_outbox FOR ALL
    USING (public.is_admin());

-- 3. ENSURE CATEGORY COLUMN ON NOTIFICATIONS TABLE
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'system';
    END IF;
END $$;

-- 4. DEFAULT PREFERENCES INITIALIZATION TRIGGER FOR NEW USERS
CREATE OR REPLACE FUNCTION public.handle_user_notification_preferences()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_notification_preferences (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_preferences_created ON auth.users;
CREATE TRIGGER on_auth_user_preferences_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_notification_preferences();
