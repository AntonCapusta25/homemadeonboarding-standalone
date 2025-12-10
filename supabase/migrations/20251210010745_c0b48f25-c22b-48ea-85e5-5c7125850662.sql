-- Add unique constraint on session_token to ensure each token maps to exactly one record
ALTER TABLE public.pending_profiles 
ADD CONSTRAINT pending_profiles_session_token_unique UNIQUE (session_token);

-- Drop existing policies
DROP POLICY IF EXISTS "pending_profiles_select_own_or_admin" ON public.pending_profiles;
DROP POLICY IF EXISTS "pending_profiles_update_own_or_admin" ON public.pending_profiles;

-- Recreate SELECT policy: only the exact matching record OR admin
-- The unique constraint ensures one token = one record
CREATE POLICY "pending_profiles_select_own_or_admin" 
ON public.pending_profiles 
FOR SELECT 
USING (
  (session_token::text = (current_setting('request.headers'::text, true)::json ->> 'x-session-token'))
  OR is_admin(auth.uid())
);

-- Recreate UPDATE policy: same logic
CREATE POLICY "pending_profiles_update_own_or_admin" 
ON public.pending_profiles 
FOR UPDATE 
USING (
  (session_token::text = (current_setting('request.headers'::text, true)::json ->> 'x-session-token'))
  OR is_admin(auth.uid())
);