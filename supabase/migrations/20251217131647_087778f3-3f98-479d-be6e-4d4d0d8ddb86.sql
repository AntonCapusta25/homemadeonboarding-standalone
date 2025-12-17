-- Create table to track merchant setup jobs
CREATE TABLE public.merchant_setup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id uuid NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_step text,
  merchant_id text,
  images_generated integer DEFAULT 0,
  dishes_imported integer DEFAULT 0,
  error_message text,
  ambience text,
  background_style text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.merchant_setup_jobs ENABLE ROW LEVEL SECURITY;

-- Only admins can access job data
CREATE POLICY "merchant_setup_jobs_admin_only"
ON public.merchant_setup_jobs
FOR ALL
USING (is_admin(auth.uid()));

-- Add index for quick lookups
CREATE INDEX idx_merchant_setup_jobs_chef ON public.merchant_setup_jobs(chef_profile_id);
CREATE INDEX idx_merchant_setup_jobs_status ON public.merchant_setup_jobs(status);

-- Add trigger for updated_at
CREATE TRIGGER update_merchant_setup_jobs_updated_at
BEFORE UPDATE ON public.merchant_setup_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();