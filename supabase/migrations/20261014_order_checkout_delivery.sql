-- ==============================================================================
-- MukiSoft Assist — Migration: Service Ordering, Wallet Checkout & Delivery
-- Prompt 4 of 8 Implementation
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Ensure required columns exist on public.orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'reference_link'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN reference_link TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'attachment_name'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN attachment_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'attachment_url'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN attachment_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'refund_amount'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN refund_amount DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. ATOMIC WALLET CHECKOUT & ORDER CREATION
CREATE OR REPLACE FUNCTION public.purchase_service_with_wallet(
    p_service_id UUID,
    p_requirements_text TEXT,
    p_reference_link TEXT DEFAULT NULL,
    p_attachment_name TEXT DEFAULT NULL,
    p_attachment_url TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
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
    v_existing_order RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to purchase service.';
    END IF;

    -- 1. Idempotency check: if key already exists, return previous order without double charging
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT id, order_number INTO v_existing_order 
        FROM public.orders 
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            SELECT balance INTO v_new_balance FROM public.wallets WHERE user_id = v_user_id;
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order.id,
                'order_number', v_existing_order.order_number,
                'remaining_balance', v_new_balance,
                'duplicate', true
            );
        END IF;
    END IF;

    -- 2. Fetch service and enforce active status
    SELECT * INTO v_service
    FROM public.services
    WHERE id = p_service_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found or is currently inactive.';
    END IF;

    -- Use server-determined price (promotional price if active)
    v_final_price := COALESCE(v_service.promotional_price, v_service.price);

    IF v_final_price < 0 THEN
        RAISE EXCEPTION 'Invalid service price configuration.';
    END IF;

    -- 3. Strict row lock on user wallet to prevent race conditions & double-spending
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found. Please initialize your wallet by making a deposit.';
    END IF;

    IF v_wallet.balance < v_final_price THEN
        RAISE EXCEPTION 'পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স ৳ %, কিন্তু প্রয়োজনীয় মূল্য ৳ %। দয়া করে আগে ওয়ালেটে টাকা জমা দিন।',
            v_wallet.balance, v_final_price;
    END IF;

    -- 4. Calculate new balance
    v_new_balance := v_wallet.balance - v_final_price;

    -- 5. Generate readable order number
    v_order_number := 'MS-' || to_char(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(uuid_generate_v4()::text, 1, 6));

    -- 6. Insert order record
    INSERT INTO public.orders (
        order_number,
        user_id,
        service_id,
        amount,
        status,
        requirements_submitted,
        reference_link,
        attachment_name,
        attachment_url,
        idempotency_key
    ) VALUES (
        v_order_number,
        v_user_id,
        p_service_id,
        v_final_price,
        'accepted',
        p_requirements_text,
        p_reference_link,
        p_attachment_name,
        p_attachment_url,
        p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- 7. Deduct balance from user wallet atomically
    UPDATE public.wallets
    SET balance = v_new_balance,
        total_spent = total_spent + v_final_price,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- 8. Write immutable financial ledger entry
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        type,
        amount,
        balance_after,
        status,
        reference_id,
        reference_type,
        description,
        metadata
    ) VALUES (
        v_wallet.id,
        v_user_id,
        'service_purchase',
        -v_final_price,
        v_new_balance,
        'completed',
        v_order_id::text,
        'order',
        'সেবা ক্রয়: ' || COALESCE(v_service.title_bn, v_service.title) || ' (অর্ডার #' || v_order_number || ')',
        jsonb_build_object(
            'order_id', v_order_id,
            'order_number', v_order_number,
            'service_id', v_service.id,
            'service_title', v_service.title,
            'price_debited', v_final_price
        )
    );

    -- 9. Add timeline milestone
    INSERT INTO public.order_events (
        order_id,
        actor_id,
        event_type,
        message,
        metadata
    ) VALUES (
        v_order_id,
        v_user_id,
        'ORDER_CREATED',
        'অর্ডার গৃহীত হয়েছে এবং ওয়ালেট এসক্রো থেকে ৳ ' || v_final_price || ' সফলভাবে পরিশোধ করা হয়েছে।',
        jsonb_build_object('amount', v_final_price)
    );

    -- 10. Send customer Bengali notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        link
    ) VALUES (
        v_user_id,
        'অর্ডার নিশ্চিত হয়েছে',
        'আপনার অর্ডার #' || v_order_number || ' সফলভাবে গ্রহণ করা হয়েছে। কাজের অগ্রগতি পর্যবেক্ষণ করতে অর্ডারের বিস্তারিত দেখুন।',
        '/dashboard/orders/' || v_order_id::text
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'remaining_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC REFUND PROCEDURE (Financial Integrity)
CREATE OR REPLACE FUNCTION public.refund_order(
    p_order_id UUID,
    p_refund_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_order RECORD;
    v_wallet RECORD;
    v_new_balance DECIMAL(14, 2);
BEGIN
    -- Verify administrator role
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can process refunds.';
    END IF;

    IF p_refund_reason IS NULL OR TRIM(p_refund_reason) = '' THEN
        RAISE EXCEPTION 'A valid refund reason is required.';
    END IF;

    -- Strict row lock on order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.status = 'refunded' THEN
        RAISE EXCEPTION 'This order has already been refunded.';
    END IF;

    -- Lock customer wallet
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_order.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer wallet not found.';
    END IF;

    -- Calculate credited balance
    v_new_balance := v_wallet.balance + v_order.amount;

    -- Atomically credit wallet
    UPDATE public.wallets
    SET balance = v_new_balance,
        total_spent = GREATEST(0.00, total_spent - v_order.amount),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- Insert immutable refund ledger entry
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        type,
        amount,
        balance_after,
        status,
        reference_id,
        reference_type,
        description,
        metadata
    ) VALUES (
        v_wallet.id,
        v_order.user_id,
        'refund',
        v_order.amount,
        v_new_balance,
        'completed',
        v_order.id::text,
        'order',
        'অর্ডার রিফান্ড: #' || v_order.order_number || ' (কারণ: ' || TRIM(p_refund_reason) || ')',
        jsonb_build_object(
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'refunded_by', v_admin_id,
            'reason', TRIM(p_refund_reason)
        )
    );

    -- Update order status
    UPDATE public.orders
    SET status = 'refunded',
        cancellation_reason = TRIM(p_refund_reason),
        refund_amount = v_order.amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Record event in timeline
    INSERT INTO public.order_events (
        order_id,
        actor_id,
        event_type,
        message
    ) VALUES (
        p_order_id,
        v_admin_id,
        'ORDER_REFUNDED',
        'অ্যাডমিন কর্তৃক ৳ ' || v_order.amount || ' সম্পূর্ণ রিফান্ড অনুমোদিত হয়েছে। কারণ: ' || TRIM(p_refund_reason)
    );

    -- Record in audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        'REFUND_ORDER',
        'orders',
        p_order_id::text,
        jsonb_build_object(
            'order_number', v_order.order_number,
            'amount', v_order.amount,
            'customer_id', v_order.user_id,
            'reason', TRIM(p_refund_reason)
        )
    );

    -- Notify customer
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        link
    ) VALUES (
        v_order.user_id,
        'টাকা ফেরত দেওয়া হয়েছে',
        'আপনার অর্ডার #' || v_order.order_number || '-এর জন্য ৳ ' || v_order.amount || ' আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।',
        '/dashboard/orders/' || v_order.id::text
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'refund_amount', v_order.amount,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATOMIC REVISION REQUEST PROCEDURE
CREATE OR REPLACE FUNCTION public.request_order_revision(
    p_order_id UUID,
    p_revision_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order RECORD;
BEGIN
    IF p_revision_notes IS NULL OR TRIM(p_revision_notes) = '' THEN
        RAISE EXCEPTION 'Revision notes are required.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or permission denied.';
    END IF;

    IF v_order.status NOT IN ('delivered', 'in_review', 'completed') THEN
        RAISE EXCEPTION 'Revision can only be requested after work is delivered or in review.';
    END IF;

    UPDATE public.orders
    SET status = 'revision_requested',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    INSERT INTO public.order_events (
        order_id,
        actor_id,
        event_type,
        message
    ) VALUES (
        p_order_id,
        v_user_id,
        'REVISION_REQUESTED',
        'গ্রাহক সংশোধনের অনুরোধ জানিয়েছেন: ' || TRIM(p_revision_notes)
    );

    RETURN jsonb_build_object('success', true, 'status', 'revision_requested');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
