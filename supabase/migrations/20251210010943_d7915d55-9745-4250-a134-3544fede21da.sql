-- Create admin-only table for internal chef data
CREATE TABLE public.chef_admin_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id uuid NOT NULL UNIQUE REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  admin_notes text,
  admin_status text DEFAULT 'new',
  crm_last_contact_date timestamptz,
  crm_follow_up_date timestamptz,
  call_attempts integer DEFAULT 0,
  assigned_admin_id uuid,
  crm_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chef_admin_data ENABLE ROW LEVEL SECURITY;

-- Only admins can access this table
CREATE POLICY "chef_admin_data_admin_only" 
ON public.chef_admin_data 
FOR ALL 
USING (is_admin(auth.uid()));

-- Migrate existing data from chef_profiles
INSERT INTO public.chef_admin_data (
  chef_profile_id, admin_notes, admin_status, crm_last_contact_date, 
  crm_follow_up_date, call_attempts, assigned_admin_id, crm_updated_by
)
SELECT 
  id, admin_notes, admin_status, crm_last_contact_date,
  crm_follow_up_date, call_attempts, assigned_admin_id, crm_updated_by
FROM public.chef_profiles
WHERE id IS NOT NULL;

-- Drop admin columns from chef_profiles (chefs shouldn't see these)
ALTER TABLE public.chef_profiles 
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS admin_status,
  DROP COLUMN IF EXISTS crm_last_contact_date,
  DROP COLUMN IF EXISTS crm_follow_up_date,
  DROP COLUMN IF EXISTS call_attempts,
  DROP COLUMN IF EXISTS assigned_admin_id,
  DROP COLUMN IF EXISTS crm_updated_by;

-- Add updated_at trigger
CREATE TRIGGER update_chef_admin_data_updated_at
  BEFORE UPDATE ON public.chef_admin_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();