-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'chef');

-- Create user_roles table (separate from profiles as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'chef',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create index for efficient role lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()));

-- Add CRM fields to chef_profiles for admin management
ALTER TABLE public.chef_profiles
ADD COLUMN admin_status TEXT DEFAULT 'new',
ADD COLUMN admin_notes TEXT,
ADD COLUMN crm_last_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN crm_follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN call_attempts INTEGER DEFAULT 0,
ADD COLUMN assigned_admin_id UUID REFERENCES auth.users(id),
ADD COLUMN crm_updated_by UUID REFERENCES auth.users(id);

-- Create index for admin queries
CREATE INDEX idx_chef_profiles_admin_status ON public.chef_profiles(admin_status);
CREATE INDEX idx_chef_profiles_assigned_admin ON public.chef_profiles(assigned_admin_id);
CREATE INDEX idx_chef_profiles_follow_up ON public.chef_profiles(crm_follow_up_date);

-- Update chef_profiles RLS: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.chef_profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.chef_profiles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Update menus RLS: Admins can view all menus
CREATE POLICY "Admins can view all menus"
ON public.menus
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all menus"
ON public.menus
FOR ALL
USING (public.is_admin(auth.uid()));

-- Update dishes RLS: Admins can view all dishes
CREATE POLICY "Admins can view all dishes"
ON public.dishes
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all dishes"
ON public.dishes
FOR ALL
USING (public.is_admin(auth.uid()));

-- Create chef_activities table for admin CRM tracking
CREATE TABLE public.chef_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  admin_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chef_activities
ALTER TABLE public.chef_activities ENABLE ROW LEVEL SECURITY;

-- Index for efficient activity queries
CREATE INDEX idx_chef_activities_chef_id ON public.chef_activities(chef_id);
CREATE INDEX idx_chef_activities_type ON public.chef_activities(activity_type);
CREATE INDEX idx_chef_activities_created ON public.chef_activities(created_at DESC);

-- RLS for chef_activities
CREATE POLICY "Admins can view all activities"
ON public.chef_activities
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activities"
ON public.chef_activities
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to auto-assign chef role on profile creation
CREATE OR REPLACE FUNCTION public.assign_chef_role_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'chef')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chef_profile_created
  AFTER INSERT ON public.chef_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_chef_role_on_profile();