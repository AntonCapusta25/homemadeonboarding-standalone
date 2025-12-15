-- Add TOS acceptance columns to chef_profiles table
ALTER TABLE public.chef_profiles
ADD COLUMN IF NOT EXISTS tos_signature text,
ADD COLUMN IF NOT EXISTS tos_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS tos_plan_accepted text;

-- Add comment for documentation
COMMENT ON COLUMN public.chef_profiles.tos_signature IS 'Digital signature (full name) for Terms of Service acceptance';
COMMENT ON COLUMN public.chef_profiles.tos_accepted_at IS 'Timestamp when Terms of Service was accepted';
COMMENT ON COLUMN public.chef_profiles.tos_plan_accepted IS 'Plan type (basic/pro/advanced) at time of TOS acceptance';