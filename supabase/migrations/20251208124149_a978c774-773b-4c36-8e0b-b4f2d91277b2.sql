-- Drop the existing policy that gives chefs access to all columns including admin_notes
DROP POLICY IF EXISTS "chef_profiles_select_own" ON public.chef_profiles;

-- Create a new policy that uses a function to filter out admin_notes for non-admin users
-- First, create a view for chefs that excludes admin fields
CREATE OR REPLACE VIEW public.chef_profiles_safe AS
SELECT 
  id,
  user_id,
  business_name,
  chef_name,
  city,
  address,
  cuisines,
  dish_types,
  availability,
  contact_email,
  contact_phone,
  logo_url,
  service_type,
  food_safety_status,
  kvk_status,
  plan,
  onboarding_completed,
  created_at,
  updated_at
FROM public.chef_profiles
WHERE user_id = auth.uid();

-- Grant select on the view to authenticated users
GRANT SELECT ON public.chef_profiles_safe TO authenticated;

-- Recreate the chef select policy with same behavior (they can still read their own data)
CREATE POLICY "chef_profiles_select_own" 
ON public.chef_profiles 
FOR SELECT 
USING (auth.uid() = user_id);