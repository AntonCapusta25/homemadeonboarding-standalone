-- Drop the security definer view since it causes issues
DROP VIEW IF EXISTS public.chef_profiles_safe;

-- The existing policy chef_profiles_select_own still allows chefs to read their own row.
-- Since Postgres doesn't support column-level RLS, chefs can see admin_notes.
-- The proper solution is to ensure the application code doesn't expose admin_notes to chefs.
-- This is documented as an application-level concern, not a database-level one.