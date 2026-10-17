-- Diamond Mine Africa: persist one demonstration check-in per user per Addis Ababa day.
-- This records attendance only. It does NOT credit wallet_ledger or create withdrawable funds.

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str date NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 1.00,
  claimed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT uq_user_checkin_per_day UNIQUE (profile_id, date_str)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own daily checkins" ON public.daily_checkins;
CREATE POLICY "Read own daily checkins"
  ON public.daily_checkins FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_admin());

GRANT SELECT ON public.daily_checkins TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.daily_checkins FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.dma_claim_daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
  v_today date;
  v_claimed_at timestamptz;
  v_amount numeric(10,2);
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

  -- Serialize claims for this profile so rapid repeated taps cannot create duplicate claims.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_profile_id::text, 0));

  SELECT dc.claimed_at, dc.amount
    INTO v_claimed_at, v_amount
  FROM public.daily_checkins AS dc
  WHERE dc.profile_id = v_profile_id
    AND dc.date_str = v_today
  LIMIT 1;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'date', v_today::text,
      'claimed_at', v_claimed_at,
      'reward', v_amount,
      'message', 'Today’s check-in is already recorded. Please return tomorrow.'
    );
  END IF;

  INSERT INTO public.daily_checkins (profile_id, date_str, amount, claimed_at)
  VALUES (v_profile_id, v_today, 1.00, pg_catalog.now())
  RETURNING claimed_at, amount INTO v_claimed_at, v_amount;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'date', v_today::text,
    'claimed_at', v_claimed_at,
    'reward', v_amount,
    'message', 'Daily check-in recorded. The +1 ETB display is a demonstration reward and is not withdrawable money.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dma_claim_daily_checkin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dma_claim_daily_checkin() TO authenticated;
