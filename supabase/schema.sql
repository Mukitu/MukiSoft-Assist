-- ==============================================================================
-- MukiSoft Assist — Production PostgreSQL Schema & Security Architecture
-- Operating Organization: MukiSoft Technology
-- Generated: 2026-10-14
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'service_purchase', 'refund', 'admin_adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE deposit_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending_requirements', 'in_progress', 'in_review', 'delivered', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'user',
    preferred_language VARCHAR(5) DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. SERVICE CATEGORIES TABLE (9 Core Categories)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. WALLETS TABLE (One per user, strictly balance tracked)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    pending_balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0.00),
    total_deposited DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0.00),
    total_spent DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0.00),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. WALLET TRANSACTIONS TABLE (Immutable Financial Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    balance_after DECIMAL(14, 2) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'completed',
    reference_id TEXT,
    reference_type TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. DEPOSIT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    payment_method VARCHAR(50) NOT NULL, -- 'bKash', 'Nagad', 'Rocket', 'Bank Transfer'
    sender_account TEXT NOT NULL,
    transaction_reference TEXT NOT NULL UNIQUE,
    slip_url TEXT,
    status deposit_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    status order_status NOT NULL DEFAULT 'pending_requirements',
    requirements_submitted TEXT,
    notes TEXT,
    assigned_admin UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ORDER EVENTS TIMELINE
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. ORDER DELIVERABLES TABLE
CREATE TABLE IF NOT EXISTS public.order_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    deliverable_notes TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    description TEXT,
    attachment_url TEXT,
    attachment_name TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reopened_at TIMESTAMPTZ,
    reopen_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12.1 TICKET MESSAGES TABLE (Prompt 5 Conversation History)
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

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checks in RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Public read active profiles or own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own non-sensitive profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Super admin can manage profiles"
    ON public.profiles FOR ALL
    USING (public.is_super_admin());

-- SERVICE CATEGORIES & SERVICES POLICIES (Public read active, Admin write)
CREATE POLICY "Anyone can view active categories"
    ON public.service_categories FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage categories"
    ON public.service_categories FOR ALL
    USING (public.is_admin());

CREATE POLICY "Anyone can view active services"
    ON public.services FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage services"
    ON public.services FOR ALL
    USING (public.is_admin());

-- WALLETS POLICIES (Users can only read own wallet, updates must occur through server functions)
CREATE POLICY "Users can read own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- WALLET TRANSACTIONS POLICIES (Immutable ledger, read own only)
CREATE POLICY "Users can read own transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- DEPOSIT REQUESTS POLICIES
CREATE POLICY "Users can read and submit own deposit requests"
    ON public.deposit_requests FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create deposit request"
    ON public.deposit_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can review deposit requests"
    ON public.deposit_requests FOR UPDATE
    USING (public.is_admin());

-- ORDERS POLICIES
CREATE POLICY "Users can read own orders, admins read all"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

-- ORDER EVENTS POLICIES
CREATE POLICY "Users can read events for own orders"
    ON public.order_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_events.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

-- ORDER DELIVERABLES POLICIES
CREATE POLICY "Users can read deliverables for own orders"
    ON public.order_deliverables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_deliverables.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Admins can insert deliverables"
    ON public.order_deliverables FOR INSERT
    WITH CHECK (public.is_admin());

-- SUPPORT TICKETS POLICIES
CREATE POLICY "Users can view and create own support tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets"
    ON public.support_tickets FOR UPDATE
    USING (public.is_admin());

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view and update own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notification read"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- AUDIT LOGS POLICIES (Super admin only)
CREATE POLICY "Only super admin can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_super_admin());

-- PLATFORM SETTINGS POLICIES
CREATE POLICY "Anyone can view platform settings"
    ON public.platform_settings FOR SELECT
    USING (true);

CREATE POLICY "Super admin can update platform settings"
    ON public.platform_settings FOR ALL
    USING (public.is_super_admin());

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (FINANCIAL & WALLET SAFETY)
-- ==============================================================================

-- Trigger to create profile and initial wallet when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'MukiSoft User'),
        'user'
    );

    INSERT INTO public.wallets (user_id, balance, pending_balance, total_deposited, total_spent)
    VALUES (new.id, 0.00, 0.00, 0.00, 0.00);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic deposit approval procedure
CREATE OR REPLACE FUNCTION public.approve_deposit_request(
    p_deposit_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_deposit RECORD;
    v_new_balance DECIMAL(14, 2);
    v_wallet_id UUID;
BEGIN
    -- Check authorization
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve deposit requests.';
    END IF;

    -- Lock deposit request row for update
    SELECT * INTO v_deposit
    FROM public.deposit_requests
    WHERE id = p_deposit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit request not found.';
    END IF;

    IF v_deposit.status != 'pending' THEN
        RAISE EXCEPTION 'Deposit request is already processed with status: %', v_deposit.status;
    END IF;

    -- Fetch and lock target wallet
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_deposit.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found.';
    END IF;

    -- Update wallet balance atomically
    UPDATE public.wallets
    SET balance = balance + v_deposit.amount,
        total_deposited = total_deposited + v_deposit.amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- Write immutable ledger record
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        type,
        amount,
        balance_after,
        status,
        reference_id,
        reference_type,
        description
    ) VALUES (
        v_wallet_id,
        v_deposit.user_id,
        'deposit',
        v_deposit.amount,
        v_new_balance,
        'completed',
        v_deposit.id::text,
        'deposit_request',
        'Approved wallet deposit via ' || v_deposit.payment_method || ' (Ref: ' || v_deposit.transaction_reference || ')'
    );

    -- Update deposit status
    UPDATE public.deposit_requests
    SET status = 'approved',
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        reviewed_by = v_admin_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_deposit_id;

    -- Create audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'APPROVE_DEPOSIT',
        'deposit_requests',
        p_deposit_id::text,
        jsonb_build_object('amount', v_deposit.amount, 'user_id', v_deposit.user_id, 'new_balance', v_new_balance)
    );

    -- Notify user
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
        v_deposit.user_id,
        'Deposit Approved',
        'Your deposit of BDT ' || v_deposit.amount || ' has been approved and credited to your wallet.',
        '/dashboard/wallet'
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic deposit rejection procedure
CREATE OR REPLACE FUNCTION public.reject_deposit_request(
    p_deposit_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_deposit RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can reject deposit requests.';
    END IF;

    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is mandatory.';
    END IF;

    SELECT * INTO v_deposit
    FROM public.deposit_requests
    WHERE id = p_deposit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit request not found.';
    END IF;

    IF v_deposit.status != 'pending' THEN
        RAISE EXCEPTION 'Deposit request has already been processed with status: %', v_deposit.status;
    END IF;

    UPDATE public.deposit_requests
    SET status = 'rejected',
        admin_notes = TRIM(p_rejection_reason),
        reviewed_by = v_admin_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_deposit_id;

    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'REJECT_DEPOSIT',
        'deposit_requests',
        p_deposit_id::text,
        jsonb_build_object(
            'amount', v_deposit.amount,
            'user_id', v_deposit.user_id,
            'transaction_reference', v_deposit.transaction_reference,
            'rejection_reason', TRIM(p_rejection_reason)
        )
    );

    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
        v_deposit.user_id,
        'ডিপোজিট অনুরোধ প্রত্যাখ্যাত হয়েছে',
        'আপনার ৳ ' || v_deposit.amount || ' টাকার জমার অনুরোধটি বাতিল করা হয়েছে। কারণ: ' || TRIM(p_rejection_reason),
        '/dashboard/wallet'
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic service purchase procedure with wallet balance check and debit
CREATE OR REPLACE FUNCTION public.purchase_service_with_wallet(
    p_service_id UUID,
    p_requirements_text TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_service RECORD;
    v_wallet RECORD;
    v_final_price DECIMAL(12, 2);
    v_order_number TEXT;
    v_order_id UUID;
    v_new_balance DECIMAL(14, 2);
    v_existing_order UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to purchase service.';
    END IF;

    -- Prevent double charging if idempotency key was already processed
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_existing_order, 'duplicate', true);
        END IF;
    END IF;

    -- Fetch service details
    SELECT * INTO v_service
    FROM public.services
    WHERE id = p_service_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service is either inactive or not found.';
    END IF;

    v_final_price := COALESCE(v_service.promotional_price, v_service.price);

    -- Lock wallet for this user
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found.';
    END IF;

    -- Balance check
    IF v_wallet.balance < v_final_price THEN
        RAISE EXCEPTION 'Insufficient balance: required BDT %, available BDT %', v_final_price, v_wallet.balance;
    END IF;

    -- Generate order number
    v_order_number := 'MS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));

    -- Debit wallet balance
    UPDATE public.wallets
    SET balance = balance - v_final_price,
        total_spent = total_spent + v_final_price,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

    -- Create order record
    INSERT INTO public.orders (
        order_number,
        user_id,
        service_id,
        amount,
        status,
        requirements_submitted,
        idempotency_key
    ) VALUES (
        v_order_number,
        v_user_id,
        v_service.id,
        v_final_price,
        'in_progress',
        p_requirements_text,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- Record transaction in immutable financial ledger
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        type,
        amount,
        balance_after,
        status,
        reference_id,
        reference_type,
        description
    ) VALUES (
        v_wallet.id,
        v_user_id,
        'service_purchase',
        -v_final_price,
        v_new_balance,
        'completed',
        v_order_id::text,
        'order',
        'Purchased service: ' || v_service.title
    );

    -- Log initial event
    INSERT INTO public.order_events (order_id, actor_id, event_type, message)
    VALUES (
        v_order_id,
        v_user_id,
        'ORDER_CREATED',
        'Order initialized with requirements submitted. Payment verified through wallet balance.'
    );

    -- Notification
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
        v_user_id,
        'Order Confirmed',
        'Order ' || v_order_number || ' for ' || v_service.title || ' has been received and is now in progress.',
        '/dashboard/orders/' || v_order_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'remaining_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- INITIAL SEED CATALOG (9 Core Service Categories)
-- ==============================================================================
INSERT INTO public.service_categories (id, name, name_bn, slug, description, description_bn, icon, display_order)
VALUES
(
    '11111111-1111-1111-1111-111111111101',
    'Document & Presentation Services',
    'ডকুমেন্ট ও প্রেজেন্টেশন সার্ভিস',
    'document-presentation',
    'Executive pitch decks, corporate proposals, PDF structuring, and publication-ready formatting.',
    'এক্সিকিউটিভ প্রেজেন্টেশন, কর্পোরেট প্রস্তাবনা, পিডিএফ ফরম্যাটিং এবং প্রকাশনা প্রস্তুত ডিজাইন।',
    'FileText',
    1
),
(
    '11111111-1111-1111-1111-111111111102',
    'Career & Job Application Services',
    'ক্যারিয়ার ও চাকুরির আবেদন সার্ভিস',
    'career-job-application',
    'ATS-optimized resumes, LinkedIn profile makeovers, cover letter engineering, and interview preparation guides.',
    'এটিএস-অপ্টিমাইজড রেজুমে, লিংকডইন প্রোফাইল ব্র্যান্ডিং, কভার লেটার ও ইন্টারভিউ গাইড।',
    'Briefcase',
    2
),
(
    '11111111-1111-1111-1111-111111111103',
    'Digital Marketing & Creative Services',
    'ডিজিটাল মার্কেটিং ও ক্রিয়েটিভ সার্ভিস',
    'digital-marketing-creative',
    'Campaign assets, visual branding kits, high-conversion copy, social banners, and digital advertising collateral.',
    'ক্যাম্পেইন ভিজ্যুয়াল, ব্র্যান্ডিং কিট, কনভার্সন কপিরাইটিং এবং সোশ্যাল অ্যাডভার্টাইজিং অ্যাসেট।',
    'Megaphone',
    3
),
(
    '11111111-1111-1111-1111-111111111104',
    'E-commerce Seller Support',
    'ই-কমার্স সেলার সাপোর্ট',
    'ecommerce-seller-support',
    'Product listing optimization, marketplace catalog entry, SKU management, and seller account operations.',
    'প্রোডাক্ট লিস্টিং অপ্টিমাইজেশন, মার্কেটপ্লেস ক্যাটালগ এন্ট্রি, এসকেইউ ম্যানেজমেন্ট ও সেলার সাপোর্ট।',
    'ShoppingCart',
    4
),
(
    '11111111-1111-1111-1111-111111111105',
    'Website & Technical Help Desk',
    'ওয়েবসাইট ও টেকনিক্যাল হেল্প ডেস্ক',
    'website-technical-helpdesk',
    'Cloud DNS configuration, SSL deployment, website bug fixes, CMS management, and domain integrations.',
    'ক্লাউড ডিএনএস কনফিগারেশন, এসএসএল ডিপ্লয়মেন্ট, বাগ ফিক্স, সিএমএস সাপোর্ট ও টেকনিক্যাল হেল্প।',
    'Cpu',
    5
),
(
    '11111111-1111-1111-1111-111111111106',
    'Data Entry & Business Operations',
    'ডাটা এন্ট্রি ও বিজনেস অপারেশনস',
    'data-entry-operations',
    'Spreadsheet clean-up, CRM record normalization, web research, invoice data entry, and workflow indexing.',
    'স্প্রেডশিট ডেটা ক্লিনআপ, সিআরএম এন্ট্রি, ওয়েব রিসার্চ, ইনভয়েস প্রসেসিং ও ডেটা নরমালাইজেশন।',
    'Database',
    6
),
(
    '11111111-1111-1111-1111-111111111107',
    'Language & Document Localization',
    'ভাষা ও ডকুমেন্ট লোকালাইজেশন',
    'language-localization',
    'Bengali to English translation, legal agreement proofreading, technical copywriting, and bilingual documentation.',
    'ইংরেজি-বাংলা অনুবাদ, আইনি ও টেকনিক্যাল ডকুমেন্ট প্রুফরিডিং এবং দ্বিভাষিক কন্টেন্ট লোকালাইজেশন।',
    'Globe',
    7
),
(
    '11111111-1111-1111-1111-111111111108',
    'Event & Organization Digital Support',
    'ইভেন্ট ও অর্গানাইজেশন ডিজিটাল সাপোর্ট',
    'event-organization-support',
    'Digital invitation management, conference schedule design, participant badge generation, and slide decks.',
    'ডিজিটাল ইনভাইটেশন কার্ড, কনফারেন্স শিডিউল ডিজাইন, পার্টিসিপেন্ট ব্যাজ তৈরি ও ইভেন্ট স্লাইড ডেক।',
    'Calendar',
    8
),
(
    '11111111-1111-1111-1111-111111111109',
    'Government Document & Citizen Service Assistance',
    'সরকারি ডকুমেন্ট ও সিটিজেন সার্ভিস সহায়তা',
    'government-citizen-assistance',
    'Information structuring, portal guidance, application formatting, and document compliance check. (Platform service fee only - independent from official government fees).',
    'তথ্য প্রস্তুতকরণ, পোর্টাল গাইডেন্স, ফর্ম ফরম্যাটিং ও ডকুমেন্ট কমপ্লায়েন্স সহায়তা। (শুধুমাত্র প্ল্যাটফর্ম সার্ভিস ফি - সরকারি ফি থেকে পৃথক)।',
    'Building2',
    9
)
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Services
INSERT INTO public.services (
    id, category_id, title, title_bn, slug, description, description_bn,
    price, promotional_price, delivery_days, requirements, revision_policy,
    is_active, is_featured, is_gov_service, gov_fee_notice, gov_official_link
) VALUES
(
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Executive Pitch Deck & Investor Presentation',
    'এক্সিকিউটিভ পিচ ডেক ও ইনভেস্টর প্রেজেন্টেশন',
    'executive-pitch-deck',
    'Full redesign and structuring of your 10–15 slide pitch deck with modern corporate layout, financial charts, and storytelling typography.',
    '১০-১৫ স্লাইডের সম্পূর্ণ ইনভেস্টর পিচ ডেক রিডিজাইন, আধুনিক কর্পোরেট লেআউট, চার্ট এবং টাইপোগ্রাফি সহ।',
    3500.00, 2800.00, 3,
    'Draft slides or outline, company logo in vector/PNG, brand color preferences, key financial figures.',
    '2 rounds of comprehensive structural revisions included.',
    true, true, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Executive ATS Resume & LinkedIn Optimization',
    'এক্সিকিউটিভ এটিএস রেজুমে ও লিংকডইন অপ্টিমাইজেশন',
    'executive-ats-resume',
    'Engineered for applicant tracking systems with keyword density, achievement metrics, clean single-page formatting, and complete LinkedIn headline/summary rewrite.',
    'এটিএস ফ্রেন্ডলি রেজুমে ফরম্যাটিং, অ্যাচিভমেন্ট মেট্রিক্স, পরিষ্কার লেআউট এবং লিংকডইন হেডলাইন/সামারি রিরাইট।',
    1800.00, 1500.00, 2,
    'Current CV/resume, target job titles or URLs of 2 sample job postings, list of recent certifications.',
    'Unlimited minor revisions for 7 days post-delivery.',
    true, true, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Corporate Visual Identity & Social Launch Kit',
    'কর্পোরেট ভিজ্যুয়াল আইডেন্টিটি ও সোশ্যাল লঞ্চ কিট',
    'corporate-visual-identity-kit',
    'Cohesive social media banner bundle, post templates, typography guidelines, and branded promotional graphics for commercial campaigns.',
    'সোশ্যাল মিডিয়া ব্যানার বান্ডেল, পোস্ট টেমপ্লেট, টাইপোগ্রাফি গাইডলাইন এবং ক্যাম্পেইন প্রোমোশনাল গ্রাফিক্স।',
    2500.00, 2200.00, 3,
    'Brand logo, color codes, slogan, and campaign objective overview.',
    '2 revision cycles included.',
    true, false, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'E-Commerce Catalog & Bulk Product Listing',
    'ই-কমার্স ক্যাটালগ ও বাল্ক প্রোডাক্ট লিস্টিং',
    'ecommerce-catalog-listing',
    'Clean entry, categorization, tag attributes, image sizing, and search-optimized copy for up to 30 product listings on WooCommerce, Shopify, or Daraz.',
    'WooCommerce, Shopify বা Daraz-এ ৩০টি পণ্যের জন্য ডেটা এন্ট্রি, ট্যাগ অ্যাট্রিবিউট, ইমেজ সাইজিং ও এসইও কপি।',
    2000.00, NULL, 2,
    'Product spreadsheets or raw images, pricing list, store CMS credentials or CSV export.',
    '1 revision cycle for accuracy verification.',
    true, false, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111105',
    'Cloud DNS, Custom Domain & SSL Deployment',
    'ক্লাউড ডিএনএস, কাস্টম ডোমেইন ও এসএসএল সেটআপ',
    'cloud-dns-ssl-setup',
    'Expert configuration of Cloudflare DNS records, apex domain redirects, DMARC/DKIM/SPF email security records, and zero-downtime SSL setup.',
    'Cloudflare DNS রেকর্ড কনফিগারেশন, ডোমেইন রিডাইরেক্ট, ইমেইল সিকিউরিটি (SPF/DKIM/DMARC) এবং এসএসএল ডিপ্লয়মেন্ট।',
    1200.00, 950.00, 1,
    'Domain registrar access or DNS panel credentials, hosting IP address or target platform URL.',
    'Post-setup verification and 48-hour propagation check.',
    true, true, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111106',
    'Enterprise Spreadsheet Normalization & Dashboard',
    'স্প্রেডশিট ডেটা নরমালাইজেশন ও এক্সেল ড্যাশবোর্ড',
    'spreadsheet-data-normalization',
    'Deduplication, schema normalization, dynamic lookup formulas (INDEX/MATCH, XLOOKUP), and interactive executive KPI summary sheet.',
    'ডুপ্লিকেট ডেটা রিমুভাল, স্কিমা নরমালাইজেশন, ডায়নামিক লুকআপ ফর্মুলা এবং ইন্টারঅ্যাক্টিভ কেপিআই সামারি ড্যাশবোর্ড।',
    2400.00, 1900.00, 2,
    'Raw CSV/XLSX file, description of desired metric outputs, confidentiality requirements.',
    '2 revision cycles for formula and layout adjustments.',
    true, false, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111107',
    'Technical & Legal Document English Localization',
    'টেকনিক্যাল ও লিগ্যাল ডকুমেন্ট ইংরেজি লোকালাইজেশন',
    'technical-legal-localization',
    'Accurate, context-sensitive translation and proofreading of contracts, policy handbooks, and software manuals from Bengali to professional English.',
    'চুক্তিপত্র, পলিসি হ্যান্ডবুক এবং সফটওয়্যার ম্যানুয়াল-এর বাংলা থেকে নির্ভুল আন্তর্জাতিক ইংরেজি অনুবাদ ও প্রুফরিডিং।',
    2200.00, NULL, 3,
    'Editable document text (DOCX/TXT), glossary of proprietary terminology if applicable.',
    '2 rounds of terminology adjustments.',
    true, false, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111108',
    'Conference & Seminar Digital Collateral Package',
    'কনফারেন্স ও সেমিনার ডিজিটাল প্যাকেজ',
    'conference-digital-collateral',
    'Complete digital kit: Speaker introduction slides, interactive agenda booklet (PDF), attendee certificate template, and digital check-in badges.',
    'স্পিকার প্রেজেন্টেশন স্লাইড, ইন্টারঅ্যাক্টিভ এজেন্ডা বুকলেট, সার্টিফিকেট টেমপ্লেট এবং ডিজিটাল ব্যাজ।',
    3000.00, 2600.00, 3,
    'Event name, schedule, speaker bios, organizer logos, sponsor branding guidelines.',
    '2 revision cycles.',
    true, false, false, NULL, NULL
),
(
    '22222222-2222-2222-2222-222222222209',
    '11111111-1111-1111-1111-111111111109',
    'Trade License & Business Registration Documentation Assistance',
    'ট্রেড লাইসেন্স ও ব্যবসা নিবন্ধন ডকুমেন্টেশন সহায়তা',
    'trade-license-documentation-guidance',
    'Professional document preparation, compliance checklist verification, portal application draft structuring, and step-by-step submission guidance for corporate registration.',
    'ট্রেড লাইসেন্স ও কর্পোরেট রেজিস্ট্রেশনের জন্য ডকুমেন্ট প্রস্তুতি, কমপ্লায়েন্স যাচাই এবং নির্ভুল অনলাইন আবেদন নির্দেশিকা।',
    1500.00, 1200.00, 2,
    'Company proposed name, nature of business, office lease/rent agreement copy, national ID copy of directors.',
    'Guidance until initial submission draft verification is completed.',
    true, true, true,
    'Official government registration fees, city corporation taxes, or stamp duties must be paid directly to the respective government treasury portal. MukiSoft Assist charges solely for documentation assistance, review, and application formatting.',
    'https://services.nidw.gov.bd'
)
ON CONFLICT (id) DO NOTHING;

-- Initial Platform Settings
INSERT INTO public.platform_settings (key, value, description)
VALUES
(
    'general',
    jsonb_build_object(
        'platform_name', 'MukiSoft Assist',
        'parent_company', 'MukiSoft Technology',
        'support_email', 'support@mukisoft.com',
        'support_phone', '+880 1700 000000',
        'currency', 'BDT',
        'currency_symbol', '৳'
    ),
    'General corporate and branding configuration'
),
(
    'payment_methods',
    jsonb_build_object(
        'bKash', jsonb_build_object('account_number', '01700000000', 'type', 'Merchant', 'instructions', 'Make payment via bKash App Merchant option using reference MS-DEPOSIT'),
        'Nagad', jsonb_build_object('account_number', '01800000000', 'type', 'Merchant', 'instructions', 'Send payment to Nagad Merchant number with your username as reference'),
        'Bank_Transfer', jsonb_build_object('bank_name', 'City Bank PLC', 'account_name', 'MukiSoft Technology Ltd.', 'account_number', '11002233445566', 'routing', '085272183')
    ),
    'Authorized manual and instant deposit payment gateways'
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- BOOTSTRAP INITIAL SUPER ADMIN INSTRUCTION
-- ==============================================================================
-- To promote an existing user account to super_admin safely after signing up:
-- UPDATE public.profiles
-- SET role = 'super_admin'
-- WHERE email = 'your-admin-email@example.com';
