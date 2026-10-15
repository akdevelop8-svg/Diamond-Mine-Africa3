-- Prevent suspended profiles from using functions/policies based on current_profile_id().
-- This migration does not turn demo balances or payment operations into live money.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
      AND p.status <> 'suspended'::public.user_status_enum
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid()
    AND p.status <> 'suspended'::public.user_status_enum
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
