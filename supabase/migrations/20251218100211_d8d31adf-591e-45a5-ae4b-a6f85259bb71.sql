-- Add columns to track weekly onboarding reminder emails
ALTER TABLE public.chef_profiles
ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.pending_profiles
ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;