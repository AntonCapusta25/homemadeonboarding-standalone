-- Add column to track when food safety was skipped for follow-up emails
ALTER TABLE public.chef_verification 
ADD COLUMN food_safety_skipped_at timestamp with time zone DEFAULT NULL;

-- Add column to track if 3-day follow-up was sent
ALTER TABLE public.chef_verification 
ADD COLUMN food_safety_followup_sent boolean DEFAULT false;