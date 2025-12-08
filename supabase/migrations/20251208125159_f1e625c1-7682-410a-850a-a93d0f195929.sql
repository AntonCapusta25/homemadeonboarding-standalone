-- Add unique constraint on user_id for chef_profiles to enable upsert
ALTER TABLE public.chef_profiles ADD CONSTRAINT chef_profiles_user_id_unique UNIQUE (user_id);