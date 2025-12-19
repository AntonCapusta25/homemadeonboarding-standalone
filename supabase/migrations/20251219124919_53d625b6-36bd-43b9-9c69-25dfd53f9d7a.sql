-- Add kitchen verification columns to chef_verification table
ALTER TABLE public.chef_verification
ADD COLUMN IF NOT EXISTS kitchen_photo_1_url text,
ADD COLUMN IF NOT EXISTS kitchen_photo_2_url text,
ADD COLUMN IF NOT EXISTS fridge_photo_url text,
ADD COLUMN IF NOT EXISTS kitchen_score integer,
ADD COLUMN IF NOT EXISTS kitchen_status text CHECK (kitchen_status IN ('pass', 'conditional', 'fail')),
ADD COLUMN IF NOT EXISTS kitchen_analysis jsonb,
ADD COLUMN IF NOT EXISTS kitchen_verified_at timestamp with time zone;

-- Create index for kitchen verification status queries
CREATE INDEX IF NOT EXISTS idx_chef_verification_kitchen_status ON public.chef_verification(kitchen_status);