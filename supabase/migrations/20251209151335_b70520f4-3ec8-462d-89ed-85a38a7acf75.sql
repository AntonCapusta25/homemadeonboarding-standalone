-- Add a session token column for anonymous user identification
ALTER TABLE public.pending_profiles 
ADD COLUMN session_token UUID DEFAULT gen_random_uuid();

-- Create an index for faster lookups
CREATE INDEX idx_pending_profiles_session_token ON public.pending_profiles(session_token);

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert pending profiles" ON public.pending_profiles;
DROP POLICY IF EXISTS "Anyone can select their pending profile by email" ON public.pending_profiles;
DROP POLICY IF EXISTS "Anyone can delete their pending profile" ON public.pending_profiles;
DROP POLICY IF EXISTS "Anyone can update their pending profile" ON public.pending_profiles;

-- New policy: Anyone can INSERT (needed to start onboarding)
-- The session_token is auto-generated, returned to the client, and stored in localStorage
CREATE POLICY "pending_profiles_insert_anon"
ON public.pending_profiles
FOR INSERT
WITH CHECK (true);

-- New policy: SELECT only with matching session_token passed via request header
-- Or if you're an admin
CREATE POLICY "pending_profiles_select_own_or_admin"
ON public.pending_profiles
FOR SELECT
USING (
  session_token::text = current_setting('request.headers', true)::json->>'x-session-token'
  OR is_admin(auth.uid())
);

-- New policy: UPDATE only with matching session_token
-- Or if you're an admin  
CREATE POLICY "pending_profiles_update_own_or_admin"
ON public.pending_profiles
FOR UPDATE
USING (
  session_token::text = current_setting('request.headers', true)::json->>'x-session-token'
  OR is_admin(auth.uid())
);

-- New policy: DELETE only by admins or via edge functions (service role)
-- Regular users shouldn't delete pending profiles
CREATE POLICY "pending_profiles_delete_admin_only"
ON public.pending_profiles
FOR DELETE
USING (is_admin(auth.uid()));