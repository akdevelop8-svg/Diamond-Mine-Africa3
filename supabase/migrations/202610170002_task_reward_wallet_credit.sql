-- Persist Task Center progress and credit eligible rewards to the authenticated member's wallet.
-- Review the current wallet/reward policy and keep sufficient funds reserved for all promised bonuses.
BEGIN;

CREATE TABLE IF NOT EXISTS public.dma_task_completions (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL CHECK (task_id IN ('task-1', 'task-2', 'task-3')),
  reward_amount NUMERIC(10,2) NOT NULL CHECK (reward_amount IN (50.00, 30.00, 10.00)),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (profile_id, task_id)
);

ALTER TABLE public.dma_task_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dma_task_completion_owner_read ON public.dma_task_completions;
CREATE POLICY dma_task_completion_owner_read ON public.dma_task_completions
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.dma_task_completions FROM PUBLIC, anon, authenticated;

ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_entry_type_check;
ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_entry_type_check
  CHECK (entry_type IN (
    'recharge_credit',
    'withdrawal_reserve',
    'withdrawal_release',
    'admin_adjustment',
    'daily_checkin_reward',
    'task_reward'
  ));

CREATE OR REPLACE FUNCTION public.dma_complete_platform_task(p_task_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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

  -- Verify invitation eligibility in the database, not from the browser profile cache.
  IF p_task_id = 'task-3' THEN
    SELECT count(*)::INTEGER INTO v_referrals_count
    FROM public.profiles AS referred
    WHERE lower(trim(COALESCE(referred.referred_by, ''))) IN (
      lower(v_profile_id::TEXT), lower(COALESCE(v_referral_code, ''))
    )
      AND referred.id <> v_profile_id
      AND COALESCE(referred.status::TEXT, 'active') <> 'suspended';
    IF COALESCE(v_referrals_count, 0) < 1 THEN
      RAISE EXCEPTION 'Invite one person using your referral code before claiming this task';
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
    'message', CASE WHEN v_claimed_at IS NOT NULL THEN 'This task reward was already claimed.' ELSE 'Task recorded. You may claim the reward once.' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_claim_task_reward(p_task_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
$$;

REVOKE ALL ON FUNCTION public.dma_complete_platform_task(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_claim_task_reward(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_complete_platform_task(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_claim_task_reward(TEXT) TO authenticated;

COMMIT;
