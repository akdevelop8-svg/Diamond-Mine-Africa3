-- Diamond Mine Africa: task reward ledger compatibility and qualifying referral checks.
-- Review the existing live schema/back up the project before applying.
-- This migration does not add VIP mining yield or automatic bank payouts.

BEGIN;

-- The task-reward RPC writes entry_type='task_reward'. Make sure the ledger CHECK
-- constraint from the daily-check-in migration permits this legitimate entry type.
DO $dma$
DECLARE
  v_constraint record;
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
END;
$dma$;

-- Preserve any entry types already present in this database, in addition to
-- the types required by this application. This avoids rejecting historical rows
-- if the live project has additional legitimate ledger categories.
DO $dma$
DECLARE
  v_allowed_values TEXT;
BEGIN
  SELECT pg_catalog.string_agg(pg_catalog.quote_literal(entry_type), ', ' ORDER BY entry_type)
    INTO v_allowed_values
  FROM (
    SELECT DISTINCT entry_type::TEXT AS entry_type FROM public.wallet_ledger
    UNION
    SELECT unnest(ARRAY[
      'recharge_credit',
      'withdrawal_reserve',
      'withdrawal_release',
      'admin_adjustment',
      'daily_checkin_reward',
      'task_reward'
    ]::TEXT[])
  ) AS allowed_types;

  EXECUTE 'ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_entry_type_check CHECK (entry_type IN (' || v_allowed_values || '))';
END;
$dma$;

-- Record an available task completion once per profile/task.
-- Task 3 (invite) counts only referred members with an approved recharge or an
-- active owned-product record, rather than counting every unpaying registration.
CREATE OR REPLACE FUNCTION public.dma_complete_platform_task(p_task_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile_id UUID;
  v_referral_code TEXT;
  v_reward NUMERIC(10,2);
  v_completed_at TIMESTAMPTZ;
  v_claimed_at TIMESTAMPTZ;
  v_referrals_count INTEGER;
  v_rows_inserted INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Active profile not found'; END IF;

  SELECT p.referral_code INTO v_referral_code
  FROM public.profiles AS p WHERE p.id = v_profile_id;

  v_reward := CASE p_task_id
    WHEN 'task-1' THEN 50.00
    WHEN 'task-2' THEN 30.00
    WHEN 'task-3' THEN 10.00
    ELSE NULL
  END;
  IF v_reward IS NULL THEN RAISE EXCEPTION 'This task is not available for claiming'; END IF;

  IF p_task_id = 'task-3' THEN
    SELECT count(DISTINCT referred.id)::INTEGER INTO v_referrals_count
    FROM public.profiles AS referred
    WHERE lower(trim(COALESCE(referred.referred_by, ''))) IN (
      lower(v_profile_id::TEXT), lower(COALESCE(v_referral_code, ''))
    )
      AND referred.id <> v_profile_id
      AND COALESCE(referred.status::TEXT, 'active') <> 'suspended'
      AND (
        EXISTS (
          SELECT 1 FROM public.recharge_requests AS rr
          WHERE rr.profile_id = referred.id
            AND rr.status::TEXT = 'approved'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_owned_products AS uop
          WHERE uop.profile_id = referred.id
            AND uop.status = 'active'
        )
      );

    IF COALESCE(v_referrals_count, 0) < 1 THEN
      RAISE EXCEPTION 'Invite one person who completes an approved recharge or has an active owned product before claiming this task';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_profile_id::TEXT || ':' || p_task_id, 0)
  );

  INSERT INTO public.dma_task_completions(profile_id, task_id, reward_amount)
  VALUES (v_profile_id, p_task_id, v_reward)
  ON CONFLICT (profile_id, task_id) DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  SELECT completed_at, claimed_at INTO v_completed_at, v_claimed_at
  FROM public.dma_task_completions
  WHERE profile_id = v_profile_id AND task_id = p_task_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'completed_at', v_completed_at,
    'claimed_at', v_claimed_at,
    'already_completed', v_rows_inserted = 0,
    'message', CASE
      WHEN v_claimed_at IS NOT NULL THEN 'This task reward was already claimed.'
      ELSE 'Task recorded. You may claim the reward once.'
    END
  );
END;
$function$;

-- Credit the platform wallet exactly once for a recorded completion.
CREATE OR REPLACE FUNCTION public.dma_claim_task_reward(p_task_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile_id UUID;
  v_completion public.dma_task_completions%ROWTYPE;
  v_balance NUMERIC(15,2);
  v_amount NUMERIC(10,2);
  v_related_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Active profile not found'; END IF;
  IF p_task_id IS NULL OR p_task_id NOT IN ('task-1', 'task-2', 'task-3') THEN
    RAISE EXCEPTION 'This task is not available for claiming';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_profile_id::TEXT || ':' || p_task_id, 0)
  );

  SELECT * INTO v_completion
  FROM public.dma_task_completions
  WHERE profile_id = v_profile_id AND task_id = p_task_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complete the task requirements before claiming its reward'; END IF;

  INSERT INTO public.wallet_accounts(profile_id, available_balance)
  VALUES (v_profile_id, 0)
  ON CONFLICT (profile_id) DO NOTHING;

  IF v_completion.claimed_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.wallet_ledger AS wl
    WHERE wl.entry_type = 'task_reward'
      AND wl.related_type = 'task_reward'
      AND wl.related_id = v_profile_id::TEXT || ':' || p_task_id
  ) THEN
    SELECT available_balance INTO v_balance
    FROM public.wallet_accounts WHERE profile_id = v_profile_id;
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'task_id', p_task_id,
      'reward', v_completion.reward_amount,
      'wallet_balance', COALESCE(v_balance, 0),
      'message', 'This reward has already been credited to your wallet.'
    );
  END IF;

  v_amount := v_completion.reward_amount;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Task reward amount is invalid'; END IF;
  v_related_id := v_profile_id::TEXT || ':' || p_task_id;

  UPDATE public.wallet_accounts
  SET available_balance = available_balance + v_amount,
      updated_at = pg_catalog.now()
  WHERE profile_id = v_profile_id
  RETURNING available_balance INTO v_balance;

  INSERT INTO public.wallet_ledger(
    profile_id, entry_type, amount, balance_after,
    related_type, related_id, description
  ) VALUES (
    v_profile_id, 'task_reward', v_amount, v_balance,
    'task_reward', v_related_id,
    'One-time Task Center reward for ' || p_task_id
  );

  UPDATE public.dma_task_completions
  SET claimed_at = pg_catalog.now()
  WHERE profile_id = v_profile_id AND task_id = p_task_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'task_id', p_task_id,
    'reward', v_amount,
    'wallet_balance', v_balance,
    'message', 'Reward credited to your wallet: +' || v_amount::TEXT || ' ETB.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.dma_complete_platform_task(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_complete_platform_task(text) TO authenticated;
REVOKE ALL ON FUNCTION public.dma_claim_task_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_claim_task_reward(text) TO authenticated;

COMMIT;
