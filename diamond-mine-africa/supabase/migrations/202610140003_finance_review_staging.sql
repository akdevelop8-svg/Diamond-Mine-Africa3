-- Diamond Mine Africa: staged financial workflow foundation.
-- IMPORTANT: Keep VITE_DEMO_MODE=true. This migration does not turn on live money operations.
-- Review/backup the existing Supabase project before executing.

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('recharge_credit','withdrawal_reserve','withdrawal_release','admin_adjustment')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount <> 0),
  balance_after NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
  related_type TEXT,
  related_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_ledger_profile_created_idx ON public.wallet_ledger(profile_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_one_related_entry_idx
  ON public.wallet_ledger(entry_type, related_type, related_id)
  WHERE related_id IS NOT NULL AND related_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.verified_payment_references (
  normalized_reference TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  recharge_request_id VARCHAR(50) NOT NULL UNIQUE REFERENCES public.recharge_requests(id) ON DELETE RESTRICT,
  confirmed_amount NUMERIC(15,2) NOT NULL CHECK (confirmed_amount > 0),
  verified_by UUID NOT NULL REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.withdrawal_destinations (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  method VARCHAR(100) NOT NULL CHECK (method IN ('CBE','Telebirr','Awash Bank','Bank of Abyssinia')),
  account_name VARCHAR(255) NOT NULL CHECK (length(trim(account_name)) >= 2),
  account_number VARCHAR(255) NOT NULL CHECK (length(trim(account_number)) >= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recharge_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS payout_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS dma_withdrawal_payout_reference_unique_idx
  ON public.withdrawal_requests (lower(trim(payout_reference)))
  WHERE payout_reference IS NOT NULL AND length(trim(payout_reference)) > 0;

-- Enforce the recharge amount, CBE provider, receipt ownership and fixed 15-minute expiry
-- on the database, not only in the browser (which can be bypassed by custom API calls).
CREATE OR REPLACE FUNCTION public.dma_guard_recharge_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_config_version INT;
BEGIN
  IF NEW.profile_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'A recharge request can only be created for the signed-in profile';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount < 300 OR NEW.amount > 200000 OR NEW.amount <> trunc(NEW.amount) THEN
    RAISE EXCEPTION 'Recharge amount must be a whole ETB amount between 300 and 200,000';
  END IF;
  IF length(trim(COALESCE(NEW.tx_reference,''))) < 3 THEN
    RAISE EXCEPTION 'Enter the CBE transaction reference';
  END IF;
  IF length(trim(COALESCE(NEW.evidence_url,''))) = 0
     OR split_part(NEW.evidence_url, '/', 1) <> NEW.profile_id::text
     OR split_part(NEW.evidence_url, '/', 2) = '' THEN
    RAISE EXCEPTION 'Upload a receipt into your own private receipt folder first';
  END IF;
  SELECT version INTO v_config_version
  FROM public.business_payment_config
  WHERE is_active = true AND provider ILIKE '%CBE%'
  ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An administrator must configure the active CBE recipient account before recharge requests can be submitted';
  END IF;
  NEW.provider := 'Commercial Bank of Ethiopia (CBE)';
  NEW.status := 'pending_verification';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.payment_config_version := v_config_version;
  NEW.expires_at := now() + interval '15 minutes';
  NEW.created_at := now();

  -- Notify each active admin that a new request arrived; they still need to inspect the bank statement.
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  SELECT 'SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20),
         p.id, 'New CBE recharge request',
         'A member submitted recharge request ' || NEW.id || ' for ' || NEW.amount::text || ' ETB. Verify the real CBE account and receipt before approving.',
         NEW.id
  FROM public.profiles p WHERE p.role = 'admin' AND p.status <> 'suspended';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS dma_guard_recharge_request_insert_trigger ON public.recharge_requests;
CREATE TRIGGER dma_guard_recharge_request_insert_trigger
BEFORE INSERT ON public.recharge_requests
FOR EACH ROW EXECUTE FUNCTION public.dma_guard_recharge_request_insert();

-- Existing accounts receive an empty wallet. No demo balances are copied into this table.
INSERT INTO public.wallet_accounts(profile_id, available_balance)
SELECT p.id, 0 FROM public.profiles p
ON CONFLICT (profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dma_create_wallet_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.wallet_accounts(profile_id, available_balance)
  VALUES (NEW.id, 0) ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS dma_create_wallet_after_profile ON public.profiles;
CREATE TRIGGER dma_create_wallet_after_profile
AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.dma_create_wallet_for_profile();

ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dma_wallet_owner_or_admin_read ON public.wallet_accounts;
CREATE POLICY dma_wallet_owner_or_admin_read ON public.wallet_accounts FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS dma_ledger_owner_or_admin_read ON public.wallet_ledger;
CREATE POLICY dma_ledger_owner_or_admin_read ON public.wallet_ledger FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS dma_destination_owner_or_admin_read ON public.withdrawal_destinations;
CREATE POLICY dma_destination_owner_or_admin_read ON public.withdrawal_destinations FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.is_admin());
-- No client write policy for ledger, verified references, wallet accounts, or saved destinations.
REVOKE INSERT, UPDATE, DELETE ON public.wallet_accounts, public.wallet_ledger, public.verified_payment_references, public.withdrawal_destinations FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.recharge_requests FROM anon, authenticated;
-- Withdrawal rows must only be inserted through dma_submit_withdrawal, which reserves the wallet atomically.
REVOKE INSERT, UPDATE, DELETE ON public.withdrawal_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.dma_wallet_balance()
RETURNS NUMERIC(15,2) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile_id UUID; v_balance NUMERIC(15,2);
BEGIN
  v_profile_id := public.current_profile_id();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  SELECT available_balance INTO v_balance FROM public.wallet_accounts WHERE profile_id = v_profile_id;
  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_save_withdrawal_destination(
  p_method TEXT, p_account_name TEXT, p_account_number TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile_id UUID;
BEGIN
  v_profile_id := public.current_profile_id();
  IF auth.uid() IS NULL OR v_profile_id IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_method NOT IN ('CBE','Telebirr','Awash Bank','Bank of Abyssinia') THEN RAISE EXCEPTION 'Unsupported withdrawal method'; END IF;
  IF length(trim(COALESCE(p_account_name,''))) < 2 OR length(trim(COALESCE(p_account_number,''))) < 4 THEN RAISE EXCEPTION 'Enter valid account details'; END IF;
  INSERT INTO public.withdrawal_destinations(profile_id, method, account_name, account_number)
  VALUES (v_profile_id, p_method, trim(p_account_name), trim(p_account_number));
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Withdrawal details are already saved and cannot be changed from this account. Contact support if a correction is necessary.';
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_submit_withdrawal(p_amount NUMERIC)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile_id UUID; v_destination public.withdrawal_destinations%ROWTYPE;
        v_wallet public.wallet_accounts%ROWTYPE; v_fee NUMERIC(15,2); v_net NUMERIC(15,2); v_id TEXT;
BEGIN
  v_profile_id := public.current_profile_id();
  IF auth.uid() IS NULL OR v_profile_id IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 150 OR p_amount <> trunc(p_amount) THEN RAISE EXCEPTION 'Withdrawal amount must be a whole ETB amount of at least 150'; END IF;
  SELECT * INTO v_destination FROM public.withdrawal_destinations WHERE profile_id = v_profile_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Save withdrawal details before submitting a request'; END IF;
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE profile_id = v_profile_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.available_balance < p_amount THEN RAISE EXCEPTION 'Insufficient available wallet balance'; END IF;
  v_fee := round(p_amount * 0.08, 2); v_net := p_amount - v_fee;
  v_id := 'WDR-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,18));
  UPDATE public.wallet_accounts SET available_balance = available_balance - p_amount, updated_at = now() WHERE profile_id = v_profile_id;
  INSERT INTO public.withdrawal_requests(id, profile_id, amount, fee, net_amount, method, account_name, account_number, status, reviewed_by, reviewed_at)
  VALUES (v_id, v_profile_id, p_amount, v_fee, v_net, v_destination.method, v_destination.account_name, v_destination.account_number, 'pending_verification', NULL, NULL);
  INSERT INTO public.wallet_ledger(profile_id, entry_type, amount, balance_after, related_type, related_id, description)
  VALUES (v_profile_id, 'withdrawal_reserve', -p_amount, v_wallet.available_balance - p_amount, 'withdrawal', v_id, 'Amount reserved for manual admin-reviewed withdrawal');
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  SELECT 'SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), p.id,
         'New withdrawal request', 'A member submitted withdrawal request ' || v_id || ' for ' || p_amount::text || ' ETB. Execute any payout manually only after review.', v_id
  FROM public.profiles p WHERE p.role='admin' AND p.status <> 'suspended';
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_admin_approve_recharge(
  p_request_id TEXT, p_confirmed_amount NUMERIC, p_verified_tx_reference TEXT, p_note TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.recharge_requests%ROWTYPE; v_wallet public.wallet_accounts%ROWTYPE;
        v_admin_profile UUID; v_admin_name TEXT; v_ref TEXT; v_new_balance NUMERIC(15,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  v_admin_profile := public.current_profile_id();
  SELECT name INTO v_admin_name FROM public.profiles WHERE id = v_admin_profile;
  SELECT * INTO v_request FROM public.recharge_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recharge request not found'; END IF;
  IF v_request.status NOT IN ('pending_verification','under_review','submitted') THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
  -- The 15-minute timer is informational for the member. A valid bank transfer
  -- must remain reviewable after that timer if the administrator independently
  -- confirms it in the real CBE account. Never reject solely based on UI time.
  IF COALESCE(trim(p_verified_tx_reference),'') = '' OR lower(trim(p_verified_tx_reference)) <> lower(trim(v_request.tx_reference)) THEN RAISE EXCEPTION 'Verified CBE transaction code must match the customer-submitted code'; END IF;
  IF p_confirmed_amount IS NULL OR round(p_confirmed_amount,2) <> round(v_request.amount,2) THEN RAISE EXCEPTION 'Confirmed bank amount does not match requested recharge amount'; END IF;
  IF COALESCE(trim(v_request.evidence_url),'') = '' OR NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'recharge-receipts' AND o.name = v_request.evidence_url
  ) THEN RAISE EXCEPTION 'Uploaded receipt is missing'; END IF;
  v_ref := lower(trim(v_request.tx_reference));
  INSERT INTO public.verified_payment_references(normalized_reference, provider, recharge_request_id, confirmed_amount, verified_by)
  VALUES (v_ref, v_request.provider, v_request.id, p_confirmed_amount, auth.uid());
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE profile_id = v_request.profile_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts(profile_id, available_balance) VALUES (v_request.profile_id, 0) ON CONFLICT (profile_id) DO NOTHING;
    SELECT * INTO v_wallet FROM public.wallet_accounts WHERE profile_id = v_request.profile_id FOR UPDATE;
  END IF;
  v_new_balance := v_wallet.available_balance + v_request.amount;
  UPDATE public.wallet_accounts SET available_balance = v_new_balance, updated_at = now() WHERE profile_id = v_request.profile_id;
  INSERT INTO public.wallet_ledger(profile_id, entry_type, amount, balance_after, related_type, related_id, description)
  VALUES (v_request.profile_id, 'recharge_credit', v_request.amount, v_new_balance, 'recharge', v_request.id, 'CBE recharge accepted after manual bank statement verification');
  UPDATE public.recharge_requests SET status = 'approved', reviewed_by = auth.uid()::text, reviewed_at = now(), rejection_reason = NULL WHERE id = v_request.id;
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  VALUES ('SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), v_request.profile_id, 'Recharge accepted', 'Your CBE recharge of ' || v_request.amount::text || ' ETB was verified and credited to your platform wallet.', v_request.id);
  INSERT INTO public.audit_logs(id, admin_id, admin_name, action_type, details, reason)
  VALUES ('ADM-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), auth.uid()::text, COALESCE(v_admin_name,'Admin'), 'RECHARGE_APPROVED_AND_CREDITED', 'Request ' || v_request.id || ', amount ' || v_request.amount::text || ' ETB, verified reference ' || v_ref, NULLIF(trim(COALESCE(p_note,'')),''));
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_admin_reject_recharge(p_request_id TEXT, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.recharge_requests%ROWTYPE; v_admin_profile UUID; v_admin_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  v_admin_profile := public.current_profile_id(); SELECT name INTO v_admin_name FROM public.profiles WHERE id = v_admin_profile;
  SELECT * INTO v_request FROM public.recharge_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status NOT IN ('pending_verification','under_review','submitted') THEN RAISE EXCEPTION 'Recharge request is not pending'; END IF;
  UPDATE public.recharge_requests SET status='rejected', rejection_reason=trim(p_reason), reviewed_by=auth.uid()::text, reviewed_at=now() WHERE id=v_request.id;
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  VALUES ('SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), v_request.profile_id, 'Recharge rejected', 'Your recharge request was rejected: ' || trim(p_reason), v_request.id);
  INSERT INTO public.audit_logs(id, admin_id, admin_name, action_type, details, reason)
  VALUES ('ADM-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), auth.uid()::text, COALESCE(v_admin_name,'Admin'), 'RECHARGE_REJECTED', 'Request ' || v_request.id || ' rejected.', trim(p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_admin_reject_withdrawal(p_request_id TEXT, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.withdrawal_requests%ROWTYPE; v_wallet public.wallet_accounts%ROWTYPE; v_admin_profile UUID; v_admin_name TEXT; v_new_balance NUMERIC(15,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  v_admin_profile := public.current_profile_id(); SELECT name INTO v_admin_name FROM public.profiles WHERE id=v_admin_profile;
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status NOT IN ('pending_verification','under_review','submitted') THEN RAISE EXCEPTION 'Withdrawal request is not pending'; END IF;
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE profile_id=v_request.profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet account not found'; END IF;
  v_new_balance := v_wallet.available_balance + v_request.amount;
  UPDATE public.wallet_accounts SET available_balance=v_new_balance, updated_at=now() WHERE profile_id=v_request.profile_id;
  INSERT INTO public.wallet_ledger(profile_id, entry_type, amount, balance_after, related_type, related_id, description)
  VALUES (v_request.profile_id, 'withdrawal_release', v_request.amount, v_new_balance, 'withdrawal', v_request.id, 'Withdrawal rejected; reserved amount returned');
  UPDATE public.withdrawal_requests SET status='rejected', rejection_reason=trim(p_reason), reviewed_by=auth.uid()::text, reviewed_at=now() WHERE id=v_request.id;
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  VALUES ('SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), v_request.profile_id, 'Withdrawal rejected', 'Your withdrawal request was rejected: ' || trim(p_reason) || '. The reserved amount has been returned to your wallet.', v_request.id);
  INSERT INTO public.audit_logs(id, admin_id, admin_name, action_type, details, reason)
  VALUES ('ADM-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), auth.uid()::text, COALESCE(v_admin_name,'Admin'), 'WITHDRAWAL_REJECTED_AND_RELEASED', 'Request ' || v_request.id || ', returned ' || v_request.amount::text || ' ETB to wallet.', trim(p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_admin_mark_withdrawal_paid(p_request_id TEXT, p_payout_reference TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.withdrawal_requests%ROWTYPE; v_admin_profile UUID; v_admin_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  IF length(trim(COALESCE(p_payout_reference,''))) < 3 THEN RAISE EXCEPTION 'Enter the real bank/mobile-wallet payout reference after sending the payment'; END IF;
  v_admin_profile := public.current_profile_id(); SELECT name INTO v_admin_name FROM public.profiles WHERE id=v_admin_profile;
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status NOT IN ('pending_verification','under_review','submitted') THEN RAISE EXCEPTION 'Withdrawal request is not pending'; END IF;
  UPDATE public.withdrawal_requests SET status='completed', payout_reference=trim(p_payout_reference), reviewed_by=auth.uid()::text, reviewed_at=now(), rejection_reason=NULL WHERE id=v_request.id;
  INSERT INTO public.notifications(id, profile_id, title, message, related_request_id)
  VALUES ('SYS-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), v_request.profile_id, 'Withdrawal marked paid', 'An administrator recorded a manual payout of ' || v_request.net_amount::text || ' ETB. Reference: ' || trim(p_payout_reference), v_request.id);
  INSERT INTO public.audit_logs(id, admin_id, admin_name, action_type, details, reason)
  VALUES ('ADM-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), auth.uid()::text, COALESCE(v_admin_name,'Admin'), 'WITHDRAWAL_MARKED_PAID', 'Request ' || v_request.id || ', net payout ' || v_request.net_amount::text || ' ETB, payout reference ' || trim(p_payout_reference), NULLIF(trim(COALESCE(p_note,'')),''));
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_admin_set_cbe_account(p_account_holder TEXT, p_account_number TEXT, p_instructions TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_admin_profile UUID; v_version INT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
  IF length(trim(COALESCE(p_account_holder,''))) < 2 OR length(trim(COALESCE(p_account_number,''))) < 6 THEN RAISE EXCEPTION 'Enter valid CBE account holder and account number'; END IF;
  v_admin_profile := public.current_profile_id();
  SELECT COALESCE(MAX(version),0)+1 INTO v_version FROM public.business_payment_config WHERE provider ILIKE '%CBE%';
  UPDATE public.business_payment_config SET is_active=false WHERE is_active=true AND provider ILIKE '%CBE%';
  INSERT INTO public.business_payment_config(provider, account_holder, account_number, instructions, version, is_active, updated_by)
  VALUES ('Commercial Bank of Ethiopia (CBE)', trim(p_account_holder), trim(p_account_number), COALESCE(NULLIF(trim(p_instructions),''),'Only send a transfer after independently confirming the recipient details.'), v_version, true, v_admin_profile::text);
  INSERT INTO public.audit_logs(id, admin_id, admin_name, action_type, details, reason)
  SELECT 'ADM-' || substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,20), auth.uid()::text, p.name, 'CBE_PAYMENT_ACCOUNT_CHANGED', 'Activated CBE payment account version ' || v_version::text || ' (account number masked in audit).', 'Admin changed collection account details'
  FROM public.profiles p WHERE p.id=v_admin_profile;
  RETURN v_version;
END;
$$;


CREATE OR REPLACE FUNCTION public.dma_mark_notification_read(p_notification_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile_id UUID;
BEGIN
  v_profile_id := public.current_profile_id();
  IF auth.uid() IS NULL OR v_profile_id IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  UPDATE public.notifications SET read=true
  WHERE id=p_notification_id AND profile_id=v_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dma_mark_all_notifications_read()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile_id UUID;
BEGIN
  v_profile_id := public.current_profile_id();
  IF auth.uid() IS NULL OR v_profile_id IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  UPDATE public.notifications SET read=true WHERE profile_id=v_profile_id AND read=false;
END;
$$;

-- Private receipt bucket. Objects are stored under <profiles.id>/<random-file-name>.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recharge-receipts','recharge-receipts',false,5242880,ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']::text[];
DROP POLICY IF EXISTS dma_receipt_insert_own ON storage.objects;
CREATE POLICY dma_receipt_insert_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='recharge-receipts' AND (storage.foldername(name))[1] = public.current_profile_id()::text);
DROP POLICY IF EXISTS dma_receipt_read_own_or_admin ON storage.objects;
CREATE POLICY dma_receipt_read_own_or_admin ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='recharge-receipts' AND ((storage.foldername(name))[1] = public.current_profile_id()::text OR public.is_admin()));

-- Explicit function grants; do not grant direct writes to the financial tables above.
REVOKE ALL ON FUNCTION public.dma_guard_recharge_request_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dma_wallet_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_save_withdrawal_destination(TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_submit_withdrawal(NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_approve_recharge(TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_reject_recharge(TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_reject_withdrawal(TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_mark_withdrawal_paid(TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_admin_set_cbe_account(TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_mark_notification_read(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dma_mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE ALL ON public.wallet_accounts, public.wallet_ledger, public.verified_payment_references, public.withdrawal_destinations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wallet_accounts, public.wallet_ledger, public.withdrawal_destinations TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_wallet_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_save_withdrawal_destination(TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_submit_withdrawal(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_approve_recharge(TEXT,NUMERIC,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_reject_recharge(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_reject_withdrawal(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_mark_withdrawal_paid(TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_admin_set_cbe_account(TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_mark_notification_read(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dma_mark_all_notifications_read() TO authenticated;
