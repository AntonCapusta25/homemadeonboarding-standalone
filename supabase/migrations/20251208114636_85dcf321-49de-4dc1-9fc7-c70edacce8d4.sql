-- Drop existing policies to recreate with stricter rules
DROP POLICY IF EXISTS "Users can view their own profile" ON public.chef_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.chef_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.chef_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.chef_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.chef_profiles;

DROP POLICY IF EXISTS "Admins can view all activities" ON public.chef_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.chef_activities;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- =====================================================
-- CHEF_PROFILES: Chefs see own, Admins see all
-- =====================================================

-- Chefs can only view their own profile
CREATE POLICY "chef_profiles_select_own"
ON public.chef_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "chef_profiles_select_admin"
ON public.chef_profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Chefs can insert their own profile only
CREATE POLICY "chef_profiles_insert_own"
ON public.chef_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Chefs can update their own profile (non-admin fields only)
CREATE POLICY "chef_profiles_update_own"
ON public.chef_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any profile (for CRM fields)
CREATE POLICY "chef_profiles_update_admin"
ON public.chef_profiles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- =====================================================
-- CHEF_ACTIVITIES: Only admins can access
-- =====================================================

-- Only admins can view activities (no chef access to CRM data)
CREATE POLICY "chef_activities_select_admin_only"
ON public.chef_activities
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert activities
CREATE POLICY "chef_activities_insert_admin_only"
ON public.chef_activities
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update activities
CREATE POLICY "chef_activities_update_admin_only"
ON public.chef_activities
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can delete activities
CREATE POLICY "chef_activities_delete_admin_only"
ON public.chef_activities
FOR DELETE
USING (public.is_admin(auth.uid()));

-- =====================================================
-- USER_ROLES: Users see own role, Admins see all
-- =====================================================

-- Users can only view their own role
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert roles (prevents privilege escalation)
CREATE POLICY "user_roles_insert_admin_only"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update roles
CREATE POLICY "user_roles_update_admin_only"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can delete roles
CREATE POLICY "user_roles_delete_admin_only"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- =====================================================
-- MENUS: Chefs see own, Admins see all
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own menus" ON public.menus;
DROP POLICY IF EXISTS "Users can insert their own menus" ON public.menus;
DROP POLICY IF EXISTS "Users can update their own menus" ON public.menus;
DROP POLICY IF EXISTS "Users can delete their own menus" ON public.menus;
DROP POLICY IF EXISTS "Admins can view all menus" ON public.menus;
DROP POLICY IF EXISTS "Admins can manage all menus" ON public.menus;

-- Chefs can only view their own menus
CREATE POLICY "menus_select_own"
ON public.menus
FOR SELECT
USING (
  chef_profile_id IN (
    SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all menus
CREATE POLICY "menus_select_admin"
ON public.menus
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Chefs can insert their own menus
CREATE POLICY "menus_insert_own"
ON public.menus
FOR INSERT
WITH CHECK (
  chef_profile_id IN (
    SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
  )
);

-- Chefs can update their own menus
CREATE POLICY "menus_update_own"
ON public.menus
FOR UPDATE
USING (
  chef_profile_id IN (
    SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
  )
);

-- Chefs can delete their own menus
CREATE POLICY "menus_delete_own"
ON public.menus
FOR DELETE
USING (
  chef_profile_id IN (
    SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
  )
);

-- Admins can manage all menus
CREATE POLICY "menus_all_admin"
ON public.menus
FOR ALL
USING (public.is_admin(auth.uid()));

-- =====================================================
-- DISHES: Chefs see own, Admins see all
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own dishes" ON public.dishes;
DROP POLICY IF EXISTS "Users can insert their own dishes" ON public.dishes;
DROP POLICY IF EXISTS "Users can update their own dishes" ON public.dishes;
DROP POLICY IF EXISTS "Users can delete their own dishes" ON public.dishes;
DROP POLICY IF EXISTS "Admins can view all dishes" ON public.dishes;
DROP POLICY IF EXISTS "Admins can manage all dishes" ON public.dishes;

-- Chefs can only view their own dishes
CREATE POLICY "dishes_select_own"
ON public.dishes
FOR SELECT
USING (
  menu_id IN (
    SELECT m.id FROM public.menus m
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Admins can view all dishes
CREATE POLICY "dishes_select_admin"
ON public.dishes
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Chefs can insert their own dishes
CREATE POLICY "dishes_insert_own"
ON public.dishes
FOR INSERT
WITH CHECK (
  menu_id IN (
    SELECT m.id FROM public.menus m
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Chefs can update their own dishes
CREATE POLICY "dishes_update_own"
ON public.dishes
FOR UPDATE
USING (
  menu_id IN (
    SELECT m.id FROM public.menus m
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Chefs can delete their own dishes
CREATE POLICY "dishes_delete_own"
ON public.dishes
FOR DELETE
USING (
  menu_id IN (
    SELECT m.id FROM public.menus m
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Admins can manage all dishes
CREATE POLICY "dishes_all_admin"
ON public.dishes
FOR ALL
USING (public.is_admin(auth.uid()));