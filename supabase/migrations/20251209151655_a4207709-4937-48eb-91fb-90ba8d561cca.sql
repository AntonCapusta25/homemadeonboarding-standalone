-- Drop the existing policies that have the vulnerability
DROP POLICY IF EXISTS "pending_profiles_select_own_or_admin" ON public.pending_profiles;
DROP POLICY IF EXISTS "pending_profiles_update_own_or_admin" ON public.pending_profiles;

-- New policy: SELECT only if the session_token header matches THIS ROW's session_token
-- This ensures a user can only read their own specific pending profile
CREATE POLICY "pending_profiles_select_own_or_admin"
ON public.pending_profiles
FOR SELECT
USING (
  -- The session token in the header must match THIS specific row's token
  session_token::text = current_setting('request.headers', true)::json->>'x-session-token'
  OR is_admin(auth.uid())
);

-- New policy: UPDATE only if the session_token header matches THIS ROW's session_token
CREATE POLICY "pending_profiles_update_own_or_admin"
ON public.pending_profiles
FOR UPDATE
USING (
  -- The session token in the header must match THIS specific row's token
  session_token::text = current_setting('request.headers', true)::json->>'x-session-token'
  OR is_admin(auth.uid())
);