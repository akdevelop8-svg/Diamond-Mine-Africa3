-- =============================================================================
-- DIAMOND MINE AFRICA (DMA) DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Target: PostgreSQL / Supabase
-- IMPORTANT: This is a Supabase schema foundation for DEVELOPMENT/TESTING only, not a live-money backend.
-- The current React app still uses localStorage/demo login until its source is integrated with Supabase Auth.
-- This is the baseline schema. The later `supabase/migrations/202610140003_finance_review_staging.sql` adds staging-only RPCs, private receipt storage, wallet ledger, and admin review flows.
-- Neither this file nor the later migration provides automatic bank verification or automatic payouts, and neither is production-certified.
-- Run in the intended Supabase project only after reviewing the complete SQL. Existing tables are not altered
-- to reconcile mismatched columns; use only where the tables are new or already match this schema.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles & Roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='user_status_enum') THEN
    EXECUTE 'CREATE TYPE public.user_status_enum AS ENUM (''active'', ''suspended'', ''warned'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='user_role_enum') THEN
    EXECUTE 'CREATE TYPE public.user_role_enum AS ENUM (''user'', ''admin'')';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    role user_role_enum DEFAULT 'user',
    status user_status_enum DEFAULT 'active',
    account_badge VARCHAR(100) DEFAULT 'Standard Member',
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    demo_balance NUMERIC(15, 2) DEFAULT 0.00 CHECK (demo_balance >= 0),
    total_recharged_demo NUMERIC(15, 2) DEFAULT 0.00,
    total_withdrawn_demo NUMERIC(15, 2) DEFAULT 0.00,
    has_completed_rules BOOLEAN DEFAULT false,
    internal_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id_unique ON public.profiles(user_id) WHERE user_id IS NOT NULL;

-- Automatically create a standard (non-admin) profile after Supabase Auth phone signup.
-- Only name and invitation-code metadata are read from user metadata; role/balances are server-owned.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_invite_code text;
  v_referrer_id uuid;
  v_generated_code text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), '');
  v_phone := NULLIF(BTRIM(NEW.phone), '');
  IF v_phone IS NULL THEN
    v_phone := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  END IF;
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'A phone number is required to create a Diamond Mine Africa profile';
  END IF;
  IF v_name IS NULL THEN
    v_name := 'Diamond Mine Member';
  END IF;

  v_invite_code := NULLIF(UPPER(BTRIM(COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'inviteCode', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'invite_code', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'ref_by', '')
  ))), '');

  IF v_invite_code IS NOT NULL THEN
    SELECT p.id INTO v_referrer_id
    FROM public.profiles AS p
    WHERE UPPER(p.referral_code) = v_invite_code
    LIMIT 1;
  END IF;

  LOOP
    v_generated_code := 'DMA' || UPPER(SUBSTRING(REPLACE(pg_catalog.gen_random_uuid()::text, '-', '') FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_generated_code);
  END LOOP;

  INSERT INTO public.profiles (user_id, name, phone, referral_code, referred_by)
  VALUES (NEW.id, v_name, v_phone, v_generated_code, v_referrer_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_dma_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_dma_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- 2. VIP Products Catalogue
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(50) PRIMARY KEY,
    tier INT NOT NULL UNIQUE CHECK (tier >= 1 AND tier <= 10),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price > 0),
    daily_return NUMERIC(15, 2) NOT NULL CHECK (daily_return > 0),
    period_days INT DEFAULT 365 CHECK (period_days > 0),
    illustrative_total NUMERIC(15, 2) NOT NULL,
    cut_name VARCHAR(100) NOT NULL,
    carat_equivalent VARCHAR(50) NOT NULL,
    color_grade VARCHAR(50) NOT NULL,
    clarity_grade VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_one_time BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Owned Products
CREATE TABLE IF NOT EXISTS public.user_owned_products (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES public.products(id),
    tier INT NOT NULL,
    purchase_price NUMERIC(15, 2) NOT NULL,
    daily_return NUMERIC(15, 2) NOT NULL,
    period_days INT DEFAULT 365,
    total_claimed_days INT DEFAULT 0,
    last_claim_timestamp TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uop_profile ON public.user_owned_products(profile_id);

-- 4. Daily Claim History
CREATE TABLE IF NOT EXISTS public.claim_history (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_product_id UUID NOT NULL REFERENCES public.user_owned_products(id) ON DELETE CASCADE,
    tier INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_history_profile ON public.claim_history(profile_id);

-- 5. Daily Check-Ins
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_str DATE NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 1.00,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_checkin_per_day UNIQUE(profile_id, date_str)
);

-- 6. Platform Tasks & Completions
CREATE TABLE IF NOT EXISTS public.platform_tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reward_etb NUMERIC(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    action_type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_task_completions (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id VARCHAR(50) NOT NULL REFERENCES public.platform_tasks(id),
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    CONSTRAINT uq_profile_task UNIQUE(profile_id, task_id)
);

-- 7. Recharge Requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='request_status_enum') THEN
    EXECUTE 'CREATE TYPE public.request_status_enum AS ENUM (''draft'', ''submitted'', ''pending_verification'', ''under_review'', ''approved'', ''rejected'', ''cancelled'', ''completed'')';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.recharge_requests (
    id VARCHAR(50) PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    provider VARCHAR(100) NOT NULL,
    tx_reference VARCHAR(255) NOT NULL,
    evidence_url TEXT,
    status request_status_enum DEFAULT 'pending_verification',
    rejection_reason TEXT,
    payment_config_version INT NOT NULL,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Withdrawal Requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id VARCHAR(50) PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 150),
    fee NUMERIC(15, 2) NOT NULL,
    net_amount NUMERIC(15, 2) NOT NULL,
    method VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    status request_status_enum DEFAULT 'pending_verification',
    rejection_reason TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Business Payment Settings & Historical Versions
CREATE TABLE IF NOT EXISTS public.business_payment_config (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    provider VARCHAR(255) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    version INT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    updated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Team Rewards & Manager Reward Configuration
CREATE TABLE IF NOT EXISTS public.team_reward_tiers (
    id VARCHAR(50) PRIMARY KEY,
    min_recharge NUMERIC(15, 2) NOT NULL,
    max_recharge NUMERIC(15, 2) NOT NULL,
    reward_etb NUMERIC(15, 2) NOT NULL,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.manager_reward_config (
    id VARCHAR(50) PRIMARY KEY,
    amount NUMERIC(15, 2) DEFAULT 25000.00,
    criteria TEXT NOT NULL,
    period VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255)
);

-- 11. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id VARCHAR(50) PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. In-App Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(50) PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_request_id VARCHAR(50),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Account Warnings
CREATE TABLE IF NOT EXISTS public.account_warnings (
    id VARCHAR(50) PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Administrative Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_owned_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- SECURITY DEFINER helper avoids a self-referencing profiles SELECT policy.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id FROM public.profiles AS p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

-- Profiles: Users can view their own profile; admins can view/manage all. Team data will use a restricted view/RPC.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- Deliberately no direct-referral SELECT policy: exposing profile rows would reveal phone/private fields.
-- A reviewed team RPC/view returning only approved fields must be added when the team UI is integrated.
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles"
    ON public.profiles FOR ALL TO authenticated
    USING (public.is_admin());

-- Recharges: Customer can insert and view their own; Only admins can update status.
DROP POLICY IF EXISTS "Users view own recharge requests" ON public.recharge_requests;
CREATE POLICY "Users view own recharge requests"
    ON public.recharge_requests FOR SELECT
    USING (profile_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users create own recharge requests" ON public.recharge_requests;
CREATE POLICY "Users create own recharge requests"
    ON public.recharge_requests FOR INSERT
    WITH CHECK (
      profile_id = public.current_profile_id()
      AND status = 'pending_verification'
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
    );

DROP POLICY IF EXISTS "Admins update recharge requests" ON public.recharge_requests;
CREATE POLICY "Admins update recharge requests"
    ON public.recharge_requests FOR UPDATE TO authenticated
    USING (public.is_admin());

-- Withdrawals: Customer can insert and view their own; Only admins can update status.
DROP POLICY IF EXISTS "Users view own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users view own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (profile_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users create own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users create own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (
      profile_id = public.current_profile_id()
      AND status = 'pending_verification'
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
    );

DROP POLICY IF EXISTS "Admins update withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins update withdrawal requests"
    ON public.withdrawal_requests FOR UPDATE TO authenticated
    USING (public.is_admin());

-- Payment config: All authenticated users can read active config; only admins can write.
DROP POLICY IF EXISTS "Authenticated users read active payment config" ON public.business_payment_config;
CREATE POLICY "Authenticated users read active payment config"
    ON public.business_payment_config FOR SELECT TO authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins modify payment config" ON public.business_payment_config;
CREATE POLICY "Admins modify payment config"
    ON public.business_payment_config FOR ALL TO authenticated
    USING (public.is_admin());


-- Read-only catalogue/configuration tables. Financial mutations must be server-side only.
DROP POLICY IF EXISTS "Anyone can read product catalogue" ON public.products;
CREATE POLICY "Anyone can read product catalogue"
  ON public.products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage product catalogue" ON public.products;
CREATE POLICY "Admins manage product catalogue"
  ON public.products FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read available platform tasks" ON public.platform_tasks;
CREATE POLICY "Anyone can read available platform tasks"
  ON public.platform_tasks FOR SELECT TO authenticated USING (is_available = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage platform tasks" ON public.platform_tasks;
CREATE POLICY "Admins manage platform tasks"
  ON public.platform_tasks FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read team reward tiers" ON public.team_reward_tiers;
CREATE POLICY "Anyone can read team reward tiers"
  ON public.team_reward_tiers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage team reward tiers" ON public.team_reward_tiers;
CREATE POLICY "Admins manage team reward tiers"
  ON public.team_reward_tiers FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read manager reward configuration" ON public.manager_reward_config;
CREATE POLICY "Anyone can read manager reward configuration"
  ON public.manager_reward_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage manager reward configuration" ON public.manager_reward_config;
CREATE POLICY "Admins manage manager reward configuration"
  ON public.manager_reward_config FOR ALL TO authenticated USING (public.is_admin());

-- User-owned records are readable only by the owner and admins. Inserts/updates for
-- claims, check-ins, owned products, and task completion are intentionally not granted
-- to ordinary clients: implement validated server-side RPC/Edge Functions first.
DROP POLICY IF EXISTS "Read own owned products" ON public.user_owned_products;
CREATE POLICY "Read own owned products"
  ON public.user_owned_products FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage owned products" ON public.user_owned_products;
CREATE POLICY "Admins manage owned products"
  ON public.user_owned_products FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Read own claim history" ON public.claim_history;
CREATE POLICY "Read own claim history"
  ON public.claim_history FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage claim history" ON public.claim_history;
CREATE POLICY "Admins manage claim history"
  ON public.claim_history FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Read own daily checkins" ON public.daily_checkins;
CREATE POLICY "Read own daily checkins"
  ON public.daily_checkins FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage daily checkins" ON public.daily_checkins;
CREATE POLICY "Admins manage daily checkins"
  ON public.daily_checkins FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Read own task completions" ON public.user_task_completions;
CREATE POLICY "Read own task completions"
  ON public.user_task_completions FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage task completions" ON public.user_task_completions;
CREATE POLICY "Admins manage task completions"
  ON public.user_task_completions FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Read own notifications" ON public.notifications;
CREATE POLICY "Read own notifications"
  ON public.notifications FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Users submit own support tickets" ON public.support_tickets;
CREATE POLICY "Users submit own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND status = 'Open' AND admin_response IS NULL
  );
DROP POLICY IF EXISTS "Users read own support tickets" ON public.support_tickets;
CREATE POLICY "Users read own support tickets"
  ON public.support_tickets FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins manage support tickets"
  ON public.support_tickets FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Users read own account warnings" ON public.account_warnings;
CREATE POLICY "Users read own account warnings"
  ON public.account_warnings FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage account warnings" ON public.account_warnings;
CREATE POLICY "Admins manage account warnings"
  ON public.account_warnings FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Only admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Table privileges for the signed-in app. RLS policies above remain mandatory and limit each operation.
-- No anon/public table grants are added by this script. Privileged financial operations are intentionally
-- unavailable to ordinary users until reviewed server-side RPC/Edge Functions are implemented.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.products,
  public.user_owned_products,
  public.claim_history,
  public.daily_checkins,
  public.platform_tasks,
  public.user_task_completions,
  public.recharge_requests,
  public.withdrawal_requests,
  public.business_payment_config,
  public.team_reward_tiers,
  public.manager_reward_config,
  public.support_tickets,
  public.notifications,
  public.account_warnings,
  public.audit_logs
TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

-- Persist platform-rules acknowledgement for the signed-in owner without broad profile UPDATE rights.
-- Persist rule acknowledgement without granting clients general UPDATE access to profiles.
-- Safe to run after the initial schema has been created.
CREATE OR REPLACE FUNCTION public.accept_platform_rules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET has_completed_rules = true,
      updated_at = pg_catalog.now()
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile is linked to the current authenticated user';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_platform_rules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_platform_rules() TO authenticated;
