-- Add quiz-related columns to chef_verification table
ALTER TABLE public.chef_verification 
ADD COLUMN IF NOT EXISTS food_safety_quiz_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS food_safety_quiz_score numeric,
ADD COLUMN IF NOT EXISTS food_safety_quiz_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS food_safety_quiz_completed_at timestamp with time zone;