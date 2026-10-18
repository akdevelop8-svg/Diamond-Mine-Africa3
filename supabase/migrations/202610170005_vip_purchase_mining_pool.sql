-- Diamond Mine Africa: server-authoritative VIP purchase and reserve-backed mining claims.
-- IMPORTANT: Apply only after taking a backup and reviewing the live schema.
-- VIP purchases debit the member wallet atomically. Mining claims are only credited
-- when the separate reserve has been funded and audited by an administrator.
-- The reserve must represent actual verified operating revenue, not pending/customer deposits.

BEGIN;

-- These catalogue flags are absent on older deployments; add them idempotently.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN NOT NULL DEFAULT TRUE;

-- Seed missing catalogue rows. Existing admin-configured rows/prices are preserved.
-- Daily figures remain illustrations and are NOT a guarantee of earnings.
INSERT INTO public.products (
  id, tier, name, price, daily_return, period_days, illustrative_total,
  cut_name, carat_equivalent, color_grade, clarity_grade, description,
  is_one_time, is_available
) VALUES
  ('vip-1', 1, 'VIP 1 Diamond Tier', 300, 30, 365, 10950, 'Brilliant Round Cut', '0.75 Carat Eq.', 'D (Colorless)', 'VVS1', 'Entry-level exploration gemstone. Features brilliant round cut precision facets with pristine transparency.', TRUE, TRUE),
  ('vip-2', 2, 'VIP 2 Diamond Tier', 500, 50, 365, 18250, 'Princess Cut', '1.20 Carat Eq.', 'D (Colorless)', 'VVS1', 'Square princess cut diamond with exceptional scintillation and symmetrical geometric facets.', TRUE, TRUE),
  ('vip-3', 3, 'VIP 3 Diamond Tier', 1000, 70, 365, 25550, 'Radiant Cut', '2.10 Carat Eq.', 'E (Exceptional)', 'VVS2', 'Radiant cut diamond combining emerald shape elegance with round brilliant brilliance.', TRUE, TRUE),
  ('vip-4', 4, 'VIP 4 Diamond Tier', 3000, 225, 365, 82125, 'Emerald Step Cut', '3.50 Carat Eq.', 'D (Flawless)', 'FL (Flawless)', 'Classic step-cut emerald gemstone showcasing pure internal clarity and royal pedigree.', TRUE, TRUE),
  ('vip-5', 5, 'VIP 5 Diamond Tier', 7000, 560, 365, 204400, 'Cushion Modified Cut', '5.20 Carat Eq.', 'E (Ice White)', 'IF (Internally Flawless)', 'Pillow cushion cut gemstone exhibiting deep dispersion rainbows and vintage romance.', TRUE, TRUE),
  ('vip-6', 6, 'VIP 6 Diamond Tier', 15000, 1300, 365, 474500, 'Navette Marquise Cut', '8.00 Carat Eq.', 'D (Super White)', 'IF (Internally Flawless)', 'Marquise football silhouette cut diamond delivering maximized surface crown reflection.', TRUE, TRUE),
  ('vip-7', 7, 'VIP 7 Diamond Tier', 30000, 2750, 365, 1003750, 'Imperial Oval Cut', '12.50 Carat Eq.', 'D (Type IIa)', 'FL (Flawless)', 'Grand oval cut diamond with fire dispersion and elongated proportions for elite collections.', TRUE, TRUE),
  ('vip-8', 8, 'VIP 8 Diamond Tier', 60000, 5700, 365, 2080500, 'Royal Pear Cut', '18.00 Carat Eq.', 'D (Type IIa)', 'FL (Flawless)', 'Teardrop pear cut diamond with a tapered point, cut by master diamond lapidaries.', TRUE, TRUE),
  ('vip-9', 9, 'VIP 9 Diamond Tier', 120000, 11800, 365, 4307000, 'Prestige Heart Cut', '25.00 Carat Eq.', 'D (Golconda Type)', 'FL (Flawless)', 'Exquisite heart cut diamond with perfect symmetry and unmistakable prestige luster.', TRUE, TRUE),
  ('vip-10', 10, 'VIP 10 Diamond Tier', 200000, 20500, 365, 7482500, 'Crown Royal Asscher Cut', '40.00 Carat Eq.', 'D (Kullinan Tier)', 'FL (Museum Heritage)', 'The pinnacle of African mineral heritage. Octagonal royal Asscher cut with high step facets and hypnotic depth.', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Allow the two new wallet ledger categories while preserving all categories already in use.
DO $dma$
DECLARE
  v_constraint RECORD;
  v_allowed_values TEXT;
BEGIN
  FOR v_constraint IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = 'public.wallet_ledger'::pg_catalog.regclass
      AND c.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%entry_type%'
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.wallet_ledger DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;

  SELECT pg_catalog.string_agg(pg_catalog.quote_literal(entry_type), ', ' ORDER BY entry_type)
    INTO v_allowed_values
  FROM (
    SELECT DISTINCT entry_type::TEXT AS entry_type FROM public.wallet_ledger
    UNION
    SELECT unnest(ARRAY[
      'recharge_credit', 'withdrawal_reserve', 'withdrawal_release', 'admin_adjustment',
      'daily_checkin_reward', 'task_reward', 'vip_purchase_debit', 'daily_mining_reward'
    ]::TEXT[])
  ) AS allowed_types;

  EXECUTE 'ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_entry_type_check CHECK (entry_type IN (' || v_allowed_values || '))';
END;
$dma$;

-- Mining is paid only from this explicitly funded reserve; it starts at zero.
CREATE TABLE IF NOT EXISTS public.dma_mining_pool (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  available_balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);
INSERT INTO public.dma_mining_pool(id, available_balance)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dma_mining_pool_ledger (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('admin_funding', 'mining_payout')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount <> 0),
  balance_after NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_id TEXT,
  reference TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);
CREATE INDEX IF NOT EXISTS dma_mining_pool_ledger_created_idx
  ON public.dma_mining_pool_ledger(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS dma_mining_pool_funding_reference_unique_idx
  ON public.dma_mining_pool_ledger(pg_catalog.lower(pg_catalog.btrim(reference)))
  WHERE entry_type = 'admin_funding' AND reference IS NOT NULL;

ALTER TABLE public.dma_mining_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dma_mining_pool_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dma_mining_pool_admin_read ON public.dma_mining_pool;
CREATE POLICY dma_mining_pool_admin_read ON public.dma_mining_pool
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS dma_mining_pool_ledger_admin_read ON public.dma_mining_pool_ledger;
CREATE POLICY dma_mining_pool_ledger_admin_read ON public.dma_mining_pool_ledger
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.dma_mining_pool, public.dma_mining_pool_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dma_mining_pool, public.dma_mining_pool_ledger TO authenticated;

-- One-time VIP purchase: authoritative price is read from public.products, and both
-- balance debit + ownership row + wallet ledger entry commit or roll back together.
CREATE OR REPLACE FUNCTION public.dma_purchase_vip_product(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile_id UUID;
  v_profile_status TEXT;
  v_product public.products%ROWTYPE;
  v_wallet public.wallet_accounts%ROWTYPE;
  v_owned_id UUID;
  v_new_balance NUMERIC(15,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Active profile not found'; END IF;

  SELECT p.status::TEXT INTO v_profile_status
  FROM public.profiles AS p WHERE p.id = v_profile_id FOR UPDATE;
  IF NOT FOUND OR v_profile_status = 'suspended' THEN
    RAISE EXCEPTION 'This account is not allowed to purchase VIP products';
  END IF;

  SELECT * INTO v_product
  FROM public.products AS p
  WHERE p.id = p_product_id
  FOR UPDATE;
  IF NOT FOUND OR NOT v_product.is_available THEN RAISE EXCEPTION 'This VIP product is unavailable'; END IF;
  IF v_product.price IS NULL OR v_product.price <= 0 THEN RAISE EXCEPTION 'VIP product price is invalid'; END IF;

  INSERT INTO public.wallet_accounts(profile_id, available_balance)
  VALUES (v_profile_id, 0)
  ON CONFLICT (profile_id) DO NOTHING;
  SELECT * INTO v_wallet FROM public.wallet_accounts
  WHERE profile_id = v_profile_id FOR UPDATE;

  IF v_product.is_one_time AND EXISTS (
    SELECT 1 FROM public.user_owned_products AS uop
    WHERE uop.profile_id = v_profile_id
      AND uop.product_id = v_product.id
      AND uop.status = 'active'
  ) THEN
    RAISE EXCEPTION 'This VIP tier is already active on your account';
  END IF;

  IF v_wallet.available_balance < v_product.price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. VIP % costs % ETB and your available balance is % ETB',
      v_product.tier, v_product.price, v_wallet.available_balance;
  END IF;

  INSERT INTO public.user_owned_products(
    profile_id, product_id, tier, purchase_price, daily_return, period_days,
    total_claimed_days, last_claim_timestamp, status
  ) VALUES (
    v_profile_id, v_product.id, v_product.tier, v_product.price,
    v_product.daily_return, COALESCE(v_product.period_days, 365),
    0, NULL, 'active'
  ) RETURNING id INTO v_owned_id;

  UPDATE public.wallet_accounts
  SET available_balance = available_balance - v_product.price,
      updated_at = pg_catalog.now()
  WHERE profile_id = v_profile_id
  RETURNING available_balance INTO v_new_balance;

  INSERT INTO public.wallet_ledger(
    profile_id, entry_type, amount, balance_after, related_type, related_id, description
  ) VALUES (
    v_profile_id, 'vip_purchase_debit', -v_product.price, v_new_balance,
    'vip_purchase', v_owned_id::TEXT,
    'VIP ' || v_product.tier::TEXT || ' purchase: ' || v_product.name
  );

  UPDATE public.profiles
  SET account_badge = 'VIP ' || v_product.tier::TEXT || ' Miner', updated_at = pg_catalog.now()
  WHERE id = v_profile_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', TRUE,
    'purchase_id', v_owned_id,
    'product_id', v_product.id,
    'tier', v_product.tier,
    'price', v_product.price,
    'wallet_balance', v_new_balance,
    'message', 'VIP purchase saved and wallet debited successfully.'
  );
END;
$function$;

-- Mining claim: verify ownership, active status, 24-hour cooldown, remaining term,
-- and a funded pool before crediting the customer wallet. Never creates money from nothing.
CREATE OR REPLACE FUNCTION public.dma_claim_daily_mining_reward(p_user_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile_id UUID;
  v_owned public.user_owned_products%ROWTYPE;
  v_pool_balance NUMERIC(15,2);
  v_reward NUMERIC(15,2);
  v_wallet_balance NUMERIC(15,2);
  v_pool_balance_after NUMERIC(15,2);
  v_claim_id UUID;
  v_claimed_at TIMESTAMPTZ;
  v_days_remaining INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Active profile not found'; END IF;
  IF p_user_product_id IS NULL THEN RAISE EXCEPTION 'Select an active VIP product'; END IF;

  SELECT * INTO v_owned
  FROM public.user_owned_products AS uop
  WHERE uop.id = p_user_product_id AND uop.profile_id = v_profile_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This VIP product does not belong to your account'; END IF;
  IF v_owned.status <> 'active' THEN RAISE EXCEPTION 'This VIP mining period is not active'; END IF;
  IF COALESCE(v_owned.total_claimed_days, 0) >= COALESCE(v_owned.period_days, 365) THEN
    RAISE EXCEPTION 'This VIP mining period has ended';
  END IF;
  IF v_owned.last_claim_timestamp IS NOT NULL
    AND pg_catalog.now() < v_owned.last_claim_timestamp + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Daily mining can be claimed only once every 24 hours for each VIP tier';
  END IF;

  v_reward := round(COALESCE(v_owned.daily_return, 0), 2);
  IF v_reward <= 0 THEN RAISE EXCEPTION 'This VIP tier has no configured daily claim amount'; END IF;

  SELECT mp.available_balance INTO v_pool_balance
  FROM public.dma_mining_pool AS mp WHERE mp.id = 1 FOR UPDATE;
  IF NOT FOUND OR v_pool_balance < v_reward THEN
    RAISE EXCEPTION 'The mining reward reserve does not have enough verified funds. No wallet credit was made.';
  END IF;

  INSERT INTO public.wallet_accounts(profile_id, available_balance)
  VALUES (v_profile_id, 0)
  ON CONFLICT (profile_id) DO NOTHING;
  SELECT wa.available_balance INTO v_wallet_balance
  FROM public.wallet_accounts AS wa WHERE wa.profile_id = v_profile_id FOR UPDATE;

  INSERT INTO public.claim_history(profile_id, user_product_id, tier, amount)
  VALUES (v_profile_id, v_owned.id, v_owned.tier, v_reward)
  RETURNING id, claimed_at INTO v_claim_id, v_claimed_at;

  UPDATE public.dma_mining_pool
  SET available_balance = available_balance - v_reward,
      updated_at = pg_catalog.now()
  WHERE id = 1
  RETURNING available_balance INTO v_pool_balance_after;

  UPDATE public.wallet_accounts
  SET available_balance = available_balance + v_reward,
      updated_at = pg_catalog.now()
  WHERE profile_id = v_profile_id
  RETURNING available_balance INTO v_wallet_balance;

  INSERT INTO public.wallet_ledger(
    profile_id, entry_type, amount, balance_after, related_type, related_id, description
  ) VALUES (
    v_profile_id, 'daily_mining_reward', v_reward, v_wallet_balance,
    'daily_mining_claim', v_claim_id::TEXT,
    'Reserve-backed daily mining claim for VIP ' || v_owned.tier::TEXT
  );

  INSERT INTO public.dma_mining_pool_ledger(
    entry_type, amount, balance_after, profile_id, related_id, note, created_by
  ) VALUES (
    'mining_payout', -v_reward, v_pool_balance_after, v_profile_id, v_claim_id::TEXT,
    'Daily mining reward funded from the pre-funded reserve', auth.uid()
  );

  v_days_remaining := GREATEST(0, COALESCE(v_owned.period_days, 365) - COALESCE(v_owned.total_claimed_days, 0) - 1);
  UPDATE public.user_owned_products
  SET total_claimed_days = COALESCE(total_claimed_days, 0) + 1,
      last_claim_timestamp = v_claimed_at,
      status = CASE WHEN COALESCE(total_claimed_days, 0) + 1 >= COALESCE(period_days, 365) THEN 'expired' ELSE 'active' END
  WHERE id = v_owned.id;

  RETURN pg_catalog.jsonb_build_object(
    'success', TRUE,
    'claim_id', v_claim_id,
    'reward', v_reward,
    'wallet_balance', v_wallet_balance,
    'claimed_at', v_claimed_at,
    'days_remaining', v_days_remaining,
    'reserve_balance', v_pool_balance_after,
    'message', 'Daily mining claim credited from the funded reserve.'
  );
END;
$function$;

-- Admin-only reserve funding. The reference is an audit reference; the administrator
-- must independently verify it represents available operating revenue before funding.
CREATE OR REPLACE FUNCTION public.dma_admin_fund_mining_pool(
  p_amount NUMERIC,
  p_reference TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_balance NUMERIC(15,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Enter a positive reserve funding amount with up to two decimal places';
  END IF;
  IF length(pg_catalog.trim(COALESCE(p_reference, ''))) < 5 THEN
    RAISE EXCEPTION 'Enter a real accounting/bank reference of at least 5 characters';
  END IF;

  PERFORM 1 FROM public.dma_mining_pool WHERE id = 1 FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.dma_mining_pool_ledger
    WHERE entry_type = 'admin_funding'
      AND pg_catalog.lower(pg_catalog.btrim(reference)) = pg_catalog.lower(pg_catalog.btrim(p_reference))
  ) THEN RAISE EXCEPTION 'This funding reference has already been recorded'; END IF;

  UPDATE public.dma_mining_pool
  SET available_balance = available_balance + p_amount,
      updated_at = pg_catalog.now()
  WHERE id = 1
  RETURNING available_balance INTO v_balance;

  INSERT INTO public.dma_mining_pool_ledger(
    entry_type, amount, balance_after, reference, note, created_by
  ) VALUES (
    'admin_funding', p_amount, v_balance, pg_catalog.trim(p_reference),
    NULLIF(pg_catalog.trim(COALESCE(p_note, '')), ''), auth.uid()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', TRUE,
    'available_balance', v_balance,
    'funded_amount', p_amount,
    'reference', pg_catalog.trim(p_reference)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.dma_admin_mining_pool_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_balance NUMERIC(15,2);
  v_funded NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_updated TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  SELECT available_balance, updated_at INTO v_balance, v_updated
  FROM public.dma_mining_pool WHERE id = 1;
  SELECT COALESCE(SUM(amount) FILTER (WHERE entry_type = 'admin_funding'), 0),
         COALESCE(-SUM(amount) FILTER (WHERE entry_type = 'mining_payout'), 0)
    INTO v_funded, v_paid
  FROM public.dma_mining_pool_ledger;
  RETURN pg_catalog.jsonb_build_object(
    'available_balance', COALESCE(v_balance, 0),
    'total_funded', COALESCE(v_funded, 0),
    'total_paid', COALESCE(v_paid, 0),
    'updated_at', v_updated
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.dma_purchase_vip_product(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_claim_daily_mining_reward(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_fund_mining_pool(NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_mining_pool_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_purchase_vip_product(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_claim_daily_mining_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_fund_mining_pool(NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_mining_pool_status() TO authenticated;

COMMIT;
