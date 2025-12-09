-- Drop existing SELECT policies to recreate with explicit auth check
DROP POLICY IF EXISTS "chef_profiles_select_admin" ON public.chef_profiles;
DROP POLICY IF EXISTS "chef_profiles_select_own" ON public.chef_profiles;

-- Create new SELECT policy that explicitly requires authentication
-- Users can only see their own profile, admins can see all
CREATE POLICY "chef_profiles_select_own_or_admin"
ON public.chef_profiles
FOR SELECT
USING (
  -- Must be authenticated (explicitly deny anonymous)
  auth.uid() IS NOT NULL
  AND (
    -- User can see their own profile
    auth.uid() = user_id
    -- OR admin can see all profiles
    OR is_admin(auth.uid())
  )
);