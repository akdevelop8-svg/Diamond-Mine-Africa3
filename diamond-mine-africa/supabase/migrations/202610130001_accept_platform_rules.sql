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
