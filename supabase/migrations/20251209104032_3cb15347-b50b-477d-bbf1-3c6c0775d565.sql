-- Create a table to store fast verification progress
CREATE TABLE public.chef_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chef_profile_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  menu_reviewed BOOLEAN DEFAULT false,
  documents_uploaded BOOLEAN DEFAULT false,
  food_safety_viewed BOOLEAN DEFAULT false,
  kvk_document_url TEXT,
  haccp_document_url TEXT,
  nvwa_document_url TEXT,
  verification_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chef_profile_id)
);

-- Enable RLS
ALTER TABLE public.chef_verification ENABLE ROW LEVEL SECURITY;

-- RLS policies - chefs can manage their own verification
CREATE POLICY "chef_verification_select_own" ON public.chef_verification
  FOR SELECT USING (
    chef_profile_id IN (
      SELECT id FROM chef_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chef_verification_insert_own" ON public.chef_verification
  FOR INSERT WITH CHECK (
    chef_profile_id IN (
      SELECT id FROM chef_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chef_verification_update_own" ON public.chef_verification
  FOR UPDATE USING (
    chef_profile_id IN (
      SELECT id FROM chef_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view all
CREATE POLICY "chef_verification_select_admin" ON public.chef_verification
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "chef_verification_all_admin" ON public.chef_verification
  FOR ALL USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_chef_verification_updated_at
  BEFORE UPDATE ON public.chef_verification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();