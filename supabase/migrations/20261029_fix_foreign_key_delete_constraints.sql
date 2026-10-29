-- ==============================================================================
-- MukiSoft Assist: Foreign Key & Nullability Fix for Safe Deletion
-- Fixes: ERROR 23502 (null value in column violates not-null constraint)
-- Reason: When foreign key is configured with ON DELETE SET NULL, the referencing
--         column MUST allow NULL. Otherwise deleting parent row crashes.
-- ==============================================================================

-- 1. FIX ORDERS TABLE: Allow service_id to be NULL when a service is deleted
ALTER TABLE public.orders ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_service_id_fkey 
  FOREIGN KEY (service_id) 
  REFERENCES public.services(id) 
  ON DELETE SET NULL;

-- 2. FIX SERVICES TABLE: Allow category_id to be NULL when a category is deleted
ALTER TABLE public.services ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_id_fkey;
ALTER TABLE public.services 
  ADD CONSTRAINT services_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.service_categories(id) 
  ON DELETE SET NULL;

-- 3. CASCADE DEPENDENTS FOR ORDERS
DO $$ 
BEGIN
  -- order_events cascade
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_events') THEN
    ALTER TABLE public.order_events DROP CONSTRAINT IF EXISTS order_events_order_id_fkey;
    ALTER TABLE public.order_events ADD CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- order_deliverables cascade
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_deliverables') THEN
    ALTER TABLE public.order_deliverables DROP CONSTRAINT IF EXISTS order_deliverables_order_id_fkey;
    ALTER TABLE public.order_deliverables ADD CONSTRAINT order_deliverables_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- chat_messages cascade
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_order_id_fkey;
    ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- support_tickets set null
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    ALTER TABLE public.support_tickets ALTER COLUMN order_id DROP NOT NULL;
    ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_order_id_fkey;
    ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;
