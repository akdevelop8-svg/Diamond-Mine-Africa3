-- Diamond Mine Africa: credit one ETB for each successful daily check-in.
-- Run in Supabase SQL Editor after reviewing. This is an internal platform-wallet credit,
-- not a bank transfer. The platform must budget/fund these rewards.
BEGIN;

-- Allow the ledger to distinguish check-in rewards from recharge and withdrawal entries.
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

ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_entry_type_check
  CHECK (entry_type IN (
    'recharge_credit',
    'withdrawal_reserve',
    'withdrawal_release',
    'admin_adjustment',
    'daily_checkin_reward'
  ));

-- Replace the check-in RPC with a transactional, idempotent wallet credit.
CREATE OR REPLACE FUNCTION public.dma_claim_daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile_id uuid;
  v_today date;
  v_claimed_at timestamptz;
  v_amount numeric(10,2);
  v_balance numeric(15,2);
  v_related_id text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim a daily check-in.';
  END IF;

  SELECT p.id
    INTO v_profile_id
  FROM public.profiles AS p
  WHERE p.user_id = (SELECT auth.uid())
    AND COALESCE(p.status::text, 'active') <> 'suspended'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No active Diamond Mine Africa profile is linked to this login.';
  END IF;

  v_today := (pg_catalog.now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  v_related_id := v_profile_id::text || ':' || v_today::text;

  -- Serialize rapid/repeated calls for this profile.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_profile_id::text, 0));

  INSERT INTO public.wallet_accounts(profile_id, available_balance)
  VALUES (v_profile_id, 0)
  ON CONFLICT (profile_id) DO NOTHING;

  SELECT dc.claimed_at, dc.amount
    INTO v_claimed_at, v_amount
  FROM public.daily_checkins AS dc
  WHERE dc.profile_id = v_profile_id
    AND dc.date_str = v_today
  LIMIT 1;

  IF FOUND THEN
    -- Recover the current day's old check-in only if it has not already been credited.
    IF NOT EXISTS (
      SELECT 1
      FROM public.wallet_ledger AS wl
      WHERE wl.entry_type = 'daily_checkin_reward'
        AND wl.related_type = 'daily_checkin'
        AND wl.related_id = v_related_id
    ) THEN
      UPDATE public.wallet_accounts AS wa
      SET available_balance = wa.available_balance + 1.00,
          updated_at = pg_catalog.now()
      WHERE wa.profile_id = v_profile_id
      RETURNING wa.available_balance INTO v_balance;

      INSERT INTO public.wallet_ledger(
        profile_id, entry_type, amount, balance_after,
        related_type, related_id, description
      ) VALUES (
        v_profile_id, 'daily_checkin_reward', 1.00, v_balance,
        'daily_checkin', v_related_id,
        'Daily check-in reward credited to platform wallet'
      );

      RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'already_claimed', false,
        'date', v_today::text,
        'claimed_at', v_claimed_at,
        'reward', 1.00,
        'wallet_balance', v_balance,
        'message', 'Today’s recorded check-in reward has now been credited: +1 ETB to your platform wallet.'
      );
    END IF;

    SELECT wa.available_balance
      INTO v_balance
    FROM public.wallet_accounts AS wa
    WHERE wa.profile_id = v_profile_id;

    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'date', v_today::text,
      'claimed_at', v_claimed_at,
      'reward', 1.00,
      'wallet_balance', COALESCE(v_balance, 0),
      'message', 'Today’s check-in reward has already been credited. Please return tomorrow.'
    );
  END IF;

  INSERT INTO public.daily_checkins(profile_id, date_str, amount, claimed_at)
  VALUES (v_profile_id, v_today, 1.00, pg_catalog.now())
  RETURNING claimed_at, amount INTO v_claimed_at, v_amount;

  UPDATE public.wallet_accounts AS wa
  SET available_balance = wa.available_balance + 1.00,
      updated_at = pg_catalog.now()
  WHERE wa.profile_id = v_profile_id
  RETURNING wa.available_balance INTO v_balance;

  INSERT INTO public.wallet_ledger(
    profile_id, entry_type, amount, balance_after,
    related_type, related_id, description
  ) VALUES (
    v_profile_id, 'daily_checkin_reward', 1.00, v_balance,
    'daily_checkin', v_related_id,
    'Daily check-in reward credited to platform wallet'
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'date', v_today::text,
    'claimed_at', v_claimed_at,
    'reward', 1.00,
    'wallet_balance', v_balance,
    'message', 'Daily check-in completed. +1 ETB was added to your platform wallet.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.dma_claim_daily_checkin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_claim_daily_checkin() TO authenticated;

-- Recover today's claims that were recorded by the previous demonstration-only RPC.
-- Only today's uncredited check-ins are recovered; historical demo records are not paid retroactively.
DO $backfill$
DECLARE
  v_today date := (pg_catalog.now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  v_row record;
  v_related_id text;
  v_balance numeric(15,2);
BEGIN
  FOR v_row IN
    SELECT dc.profile_id, dc.date_str
    FROM public.daily_checkins AS dc
    WHERE dc.date_str = v_today
      AND NOT EXISTS (
        SELECT 1
        FROM public.wallet_ledger AS wl
        WHERE wl.entry_type = 'daily_checkin_reward'
          AND wl.related_type = 'daily_checkin'
          AND wl.related_id = dc.profile_id::text || ':' || dc.date_str::text
      )
    ORDER BY dc.profile_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_row.profile_id::text, 0));

    INSERT INTO public.wallet_accounts(profile_id, available_balance)
    VALUES (v_row.profile_id, 0)
    ON CONFLICT (profile_id) DO NOTHING;

    v_related_id := v_row.profile_id::text || ':' || v_row.date_str::text;

    UPDATE public.wallet_accounts AS wa
    SET available_balance = wa.available_balance + 1.00,
        updated_at = pg_catalog.now()
    WHERE wa.profile_id = v_row.profile_id
    RETURNING wa.available_balance INTO v_balance;

    INSERT INTO public.wallet_ledger(
      profile_id, entry_type, amount, balance_after,
      related_type, related_id, description
    ) VALUES (
      v_row.profile_id, 'daily_checkin_reward', 1.00, v_balance,
      'daily_checkin', v_related_id,
      'Recovered current-day check-in reward from the prior attendance-only version'
    );
  END LOOP;
END;
$backfill$;

COMMIT;
