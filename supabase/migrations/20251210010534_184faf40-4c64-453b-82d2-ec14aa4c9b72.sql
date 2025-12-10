-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "chef_profiles_select_own_or_admin" ON public.chef_profiles;

-- Create a stricter policy: only owner or admin can view
CREATE POLICY "chef_profiles_select_own_or_admin" 
ON public.chef_profiles 
FOR SELECT 
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));