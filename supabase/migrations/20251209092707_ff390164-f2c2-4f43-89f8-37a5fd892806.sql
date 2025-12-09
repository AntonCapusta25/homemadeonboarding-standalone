-- Add current_step column to pending_profiles to track onboarding progress
ALTER TABLE public.pending_profiles
ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'contact';

-- Add created timestamp for sorting
CREATE INDEX IF NOT EXISTS idx_pending_profiles_created_at ON public.pending_profiles(created_at DESC);

-- Allow updates on pending_profiles (was missing)
CREATE POLICY "Anyone can update their pending profile" 
ON public.pending_profiles 
FOR UPDATE 
USING (true)
WITH CHECK (true);