-- Create a pending_profiles table to store onboarding data before account creation
CREATE TABLE public.pending_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  chef_name TEXT,
  business_name TEXT,
  city TEXT,
  address TEXT,
  cuisines TEXT[] DEFAULT '{}',
  dish_types TEXT[] DEFAULT '{}',
  availability TEXT[] DEFAULT '{}',
  service_type service_type DEFAULT 'unsure',
  food_safety_status food_safety_status,
  kvk_status kvk_status,
  plan plan_type DEFAULT 'starter',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Allow public insert (no auth required) for pending profiles
ALTER TABLE public.pending_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pending profiles"
ON public.pending_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can select their pending profile by email"
ON public.pending_profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete their pending profile"
ON public.pending_profiles
FOR DELETE
TO anon, authenticated
USING (true);

-- Add index on email for quick lookups
CREATE INDEX idx_pending_profiles_email ON public.pending_profiles(email);

-- Add index on expires_at for cleanup
CREATE INDEX idx_pending_profiles_expires ON public.pending_profiles(expires_at);