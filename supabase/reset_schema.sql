-- ==============================================================================
-- MukiSoft Assist — Complete Database Reset & Fresh Start SQL
-- Description: Clears all test data from public & auth tables, recreates missing
--              tables, sets up RLS policies, and registers Realtime channels.
-- ==============================================================================

-- 1. CLEAN DATA RESET (সমস্ত আগের টেস্ট ডেটা মুছে নতুন করে শুরু করা)
DO $$ 
BEGIN
    EXECUTE 'TRUNCATE TABLE 
        public.audit_logs,
        public.notifications,
        public.ticket_messages,
        public.support_tickets,
        public.order_deliverables,
        public.order_events,
        public.orders,
        public.deposit_requests,
        public.wallet_transactions,
        public.wallets,
        public.withdrawal_requests,
        public.payout_accounts,
        public.worker_applications,
        public.company_profit_records,
        public.live_chat_messages,
        public.live_chat_sessions,
        public.profiles
    CASCADE;';
EXCEPTION WHEN OTHERS THEN
    -- যদি কোনো টেবিল পূর্বে তৈরি করা না থাকে, তবে নোটিশ স্কিপ হবে
    NULL;
END $$;

-- Supabase Auth ব্যবহারকারীদের তালিকাও মুছে ফেলার জন্য (অপশনাল কিন্তু ক্লিন স্টার্টের জন্য কার্যকর)
DELETE FROM auth.users;

-- 2. EXTENSIONS & COMPLETE SCHEMA CREATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'super_admin', 'admin', 'worker', 'user'
    preferred_language VARCHAR(5) DEFAULT 'bn',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    icon TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    cover_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SERVICES
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    promotional_price DECIMAL(12, 2) CHECK (promotional_price >= 0),
    delivery_days INT NOT NULL DEFAULT 3 CHECK (delivery_days > 0),
    requirements TEXT,
    revision_policy TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    thumbnail TEXT,
    is_gov_service BOOLEAN NOT NULL DEFAULT false,
    gov_fee_notice TEXT,
    gov_official_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    pending_balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0.00),
    total_deposited DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0.00),
    total_spent DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0.00),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    balance_after DECIMAL(14, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    reference_id TEXT,
    reference_type TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEPOSIT REQUESTS
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    payment_method VARCHAR(50) NOT NULL,
    sender_account TEXT NOT NULL,
    transaction_reference TEXT NOT NULL UNIQUE,
    slip_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_title TEXT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending_requirements',
    requirements_submitted TEXT,
    notes TEXT,
    assigned_admin UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_admin_name TEXT,
    assigned_admin_email TEXT,
    cancellation_reason TEXT,
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    completed_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER EVENTS
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER DELIVERABLES
CREATE TABLE IF NOT EXISTS public.order_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    deliverable_notes TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WITHDRAWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    role TEXT DEFAULT 'worker',
    amount NUMERIC DEFAULT 0,
    payout_account JSONB,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    processed_at TIMESTAMPTZ,
    processed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYOUT ACCOUNTS
CREATE TABLE IF NOT EXISTS public.payout_accounts (
    user_id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT,
    branch_name TEXT,
    account_holder_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.worker_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    skills TEXT NOT NULL,
    experience TEXT NOT NULL,
    portfolio_url TEXT,
    nid_or_passport TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMISSION SETTINGS
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id TEXT PRIMARY KEY DEFAULT 'comm_default',
    worker_commission_percentage NUMERIC DEFAULT 80,
    admin_commission_percentage NUMERIC DEFAULT 70,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANY PROFIT RECORDS
CREATE TABLE IF NOT EXISTS public.company_profit_records (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    service_title TEXT NOT NULL,
    total_order_amount NUMERIC NOT NULL,
    assigned_id TEXT NOT NULL,
    assigned_name TEXT NOT NULL,
    assigned_role TEXT NOT NULL,
    worker_or_admin_payout NUMERIC NOT NULL,
    company_profit_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    description TEXT,
    attachment_url TEXT,
    attachment_name TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reopened_at TIMESTAMPTZ,
    reopen_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TICKET MESSAGES
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL DEFAULT 'customer',
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LIVE CHAT SESSIONS
CREATE TABLE IF NOT EXISTS public.live_chat_sessions (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ai_mode',
    assigned_agent_id TEXT,
    assigned_agent_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIVE CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR ALL TABLES (Idempotent)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
    CREATE POLICY "Public select profiles" ON public.profiles FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
    CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
    CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select categories" ON public.service_categories;
    CREATE POLICY "Public select categories" ON public.service_categories FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert categories" ON public.service_categories;
    CREATE POLICY "Public insert categories" ON public.service_categories FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update categories" ON public.service_categories;
    CREATE POLICY "Public update categories" ON public.service_categories FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select services" ON public.services;
    CREATE POLICY "Public select services" ON public.services FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert services" ON public.services;
    CREATE POLICY "Public insert services" ON public.services FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update services" ON public.services;
    CREATE POLICY "Public update services" ON public.services FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select wallets" ON public.wallets;
    CREATE POLICY "Public select wallets" ON public.wallets FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert wallets" ON public.wallets;
    CREATE POLICY "Public insert wallets" ON public.wallets FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update wallets" ON public.wallets;
    CREATE POLICY "Public update wallets" ON public.wallets FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select wallet_tx" ON public.wallet_transactions;
    CREATE POLICY "Public select wallet_tx" ON public.wallet_transactions FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert wallet_tx" ON public.wallet_transactions;
    CREATE POLICY "Public insert wallet_tx" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public select deposits" ON public.deposit_requests;
    CREATE POLICY "Public select deposits" ON public.deposit_requests FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert deposits" ON public.deposit_requests;
    CREATE POLICY "Public insert deposits" ON public.deposit_requests FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update deposits" ON public.deposit_requests;
    CREATE POLICY "Public update deposits" ON public.deposit_requests FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select orders" ON public.orders;
    CREATE POLICY "Public select orders" ON public.orders FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
    CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update orders" ON public.orders;
    CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select order_events" ON public.order_events;
    CREATE POLICY "Public select order_events" ON public.order_events FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert order_events" ON public.order_events;
    CREATE POLICY "Public insert order_events" ON public.order_events FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public select order_deliv" ON public.order_deliverables;
    CREATE POLICY "Public select order_deliv" ON public.order_deliverables FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert order_deliv" ON public.order_deliverables;
    CREATE POLICY "Public insert order_deliv" ON public.order_deliverables FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public select withdrawals" ON public.withdrawal_requests;
    CREATE POLICY "Public select withdrawals" ON public.withdrawal_requests FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert withdrawals" ON public.withdrawal_requests;
    CREATE POLICY "Public insert withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update withdrawals" ON public.withdrawal_requests;
    CREATE POLICY "Public update withdrawals" ON public.withdrawal_requests FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete withdrawals" ON public.withdrawal_requests;
    CREATE POLICY "Public delete withdrawals" ON public.withdrawal_requests FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select payout" ON public.payout_accounts;
    CREATE POLICY "Public select payout" ON public.payout_accounts FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert payout" ON public.payout_accounts;
    CREATE POLICY "Public insert payout" ON public.payout_accounts FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update payout" ON public.payout_accounts;
    CREATE POLICY "Public update payout" ON public.payout_accounts FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Public select live_sessions" ON public.live_chat_sessions;
    CREATE POLICY "Public select live_sessions" ON public.live_chat_sessions FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert live_sessions" ON public.live_chat_sessions;
    CREATE POLICY "Public insert live_sessions" ON public.live_chat_sessions FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update live_sessions" ON public.live_chat_sessions;
    CREATE POLICY "Public update live_sessions" ON public.live_chat_sessions FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete live_sessions" ON public.live_chat_sessions;
    CREATE POLICY "Public delete live_sessions" ON public.live_chat_sessions FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select live_msgs" ON public.live_chat_messages;
    CREATE POLICY "Public select live_msgs" ON public.live_chat_messages FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert live_msgs" ON public.live_chat_messages;
    CREATE POLICY "Public insert live_msgs" ON public.live_chat_messages FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public delete live_msgs" ON public.live_chat_messages;
    CREATE POLICY "Public delete live_msgs" ON public.live_chat_messages FOR DELETE USING (true);
END $$;

-- 4. REALTIME PUBLICATION CONFIGURATION (Error 42710 থেকে সুরক্ষিত)
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'orders', 
        'wallets', 
        'wallet_transactions', 
        'deposit_requests', 
        'withdrawal_requests', 
        'live_chat_sessions', 
        'live_chat_messages', 
        'support_tickets',
        'ticket_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;
