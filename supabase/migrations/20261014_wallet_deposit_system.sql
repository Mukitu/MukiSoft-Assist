-- ==============================================================================
-- MukiSoft Assist — Migration: Wallet, Deposit System & Financial Ledger
-- Prompt 3 of 8 Implementation
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Ensure deposit_reference column exists with auto-generation support
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'deposit_requests' 
        AND column_name = 'deposit_reference'
    ) THEN
        ALTER TABLE public.deposit_requests 
        ADD COLUMN deposit_reference VARCHAR(50);
    END IF;
END $$;

-- 2. Populate deposit_reference for existing rows if null
UPDATE public.deposit_requests 
SET deposit_reference = 'DEP-' || to_char(created_at, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE deposit_reference IS NULL;

-- 3. Case-insensitive and whitespace-normalized Unique Index on transaction_reference
-- This prevents duplicates like " trx123 ", "TRX123", "Trx123"
CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_requests_trx_normalized 
ON public.deposit_requests (LOWER(TRIM(transaction_reference)));

-- 4. Trigger to automatically generate unique deposit_reference on INSERT
CREATE OR REPLACE FUNCTION public.set_deposit_reference()
RETURNS trigger AS $$
BEGIN
    IF NEW.deposit_reference IS NULL OR NEW.deposit_reference = '' THEN
        NEW.deposit_reference := 'DEP-' || to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;
    -- Normalize transaction reference
    NEW.transaction_reference := UPPER(TRIM(NEW.transaction_reference));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_deposit_reference ON public.deposit_requests;
CREATE TRIGGER trg_set_deposit_reference
    BEFORE INSERT ON public.deposit_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_deposit_reference();

-- 5. ATOMIC APPROVAL STORED PROCEDURE (Financial Safety)
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
    -- Authorization verification
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve deposit requests.';
    END IF;

    -- Strict row lock on the deposit request
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

    -- Strict row lock on user wallet
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_deposit.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Safely create wallet if missing
        INSERT INTO public.wallets (user_id, balance, pending_balance, total_deposited, total_spent)
        VALUES (v_deposit.user_id, 0.00, 0.00, 0.00, 0.00)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- Update wallet balance and total deposited atomically
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
        description,
        metadata
    ) VALUES (
        v_wallet_id,
        v_deposit.user_id,
        'deposit',
        v_deposit.amount,
        v_new_balance,
        'completed',
        COALESCE(v_deposit.deposit_reference, v_deposit.id::text),
        'deposit_request',
        'ওয়ালেট ডিপোজিট অনুমোদিত: ' || v_deposit.payment_method || ' (TrxID: ' || v_deposit.transaction_reference || ')',
        jsonb_build_object(
            'approved_by', v_admin_id,
            'deposit_id', v_deposit.id,
            'payment_method', v_deposit.payment_method,
            'sender_account', v_deposit.sender_account,
            'transaction_reference', v_deposit.transaction_reference
        )
    );

    -- Update deposit request status
    UPDATE public.deposit_requests
    SET status = 'approved',
        admin_notes = COALESCE(p_admin_notes, 'অ্যাডমিন কর্তৃক ব্যাংকিং/পেমেন্ট স্টেটমেন্ট অনুযায়ী যাচাইকৃত ও অনুমোদিত।'),
        reviewed_by = v_admin_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_deposit_id;

    -- Insert database-backed audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'APPROVE_DEPOSIT',
        'deposit_requests',
        p_deposit_id::text,
        jsonb_build_object(
            'amount', v_deposit.amount,
            'user_id', v_deposit.user_id,
            'deposit_reference', v_deposit.deposit_reference,
            'transaction_reference', v_deposit.transaction_reference,
            'new_balance', v_new_balance
        )
    );

    -- Insert database-backed Bengali notification for the customer
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
        v_deposit.user_id,
        'ডিপোজিট অনুমোদিত হয়েছে',
        'আপনার ৳ ' || v_deposit.amount || ' টাকার ডিপোজিট (রেফারেন্স: ' || COALESCE(v_deposit.deposit_reference, v_deposit.id::text) || ') অনুমোদিত হয়েছে এবং ওয়ালেটে যুক্ত হয়েছে।',
        '/dashboard/wallet'
    );

    RETURN jsonb_build_object(
        'success', true,
        'deposit_id', p_deposit_id,
        'new_balance', v_new_balance,
        'message', 'Deposit approved successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ATOMIC REJECTION STORED PROCEDURE (Financial Safety)
CREATE OR REPLACE FUNCTION public.reject_deposit_request(
    p_deposit_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_deposit RECORD;
BEGIN
    -- Authorization verification
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can reject deposit requests.';
    END IF;

    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is mandatory.';
    END IF;

    -- Strict row lock on the deposit request
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

    -- Update deposit status to rejected without touching wallet balance
    UPDATE public.deposit_requests
    SET status = 'rejected',
        admin_notes = TRIM(p_rejection_reason),
        reviewed_by = v_admin_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_deposit_id;

    -- Create audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'REJECT_DEPOSIT',
        'deposit_requests',
        p_deposit_id::text,
        jsonb_build_object(
            'amount', v_deposit.amount,
            'user_id', v_deposit.user_id,
            'deposit_reference', v_deposit.deposit_reference,
            'transaction_reference', v_deposit.transaction_reference,
            'rejection_reason', TRIM(p_rejection_reason)
        )
    );

    -- Insert database-backed Bengali notification for the customer
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
        v_deposit.user_id,
        'ডিপোজিট অনুরোধ প্রত্যাখ্যাত হয়েছে',
        'আপনার ৳ ' || v_deposit.amount || ' টাকার জমার অনুরোধটি বাতিল করা হয়েছে। কারণ: ' || TRIM(p_rejection_reason),
        '/dashboard/wallet'
    );

    RETURN jsonb_build_object(
        'success', true,
        'deposit_id', p_deposit_id,
        'status', 'rejected',
        'message', 'Deposit rejected successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
