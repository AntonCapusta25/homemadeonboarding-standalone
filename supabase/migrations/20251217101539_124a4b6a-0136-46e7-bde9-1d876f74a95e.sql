-- Add hyperzod_merchant_id column to chef_profiles
ALTER TABLE public.chef_profiles
ADD COLUMN hyperzod_merchant_id text DEFAULT NULL;

-- Add index for quick lookups
CREATE INDEX idx_chef_profiles_hyperzod_merchant_id ON public.chef_profiles(hyperzod_merchant_id) WHERE hyperzod_merchant_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.chef_profiles.hyperzod_merchant_id IS 'Hyperzod merchant ID for this chef, set when merchant is created in Hyperzod';