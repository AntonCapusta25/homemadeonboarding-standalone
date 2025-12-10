-- Add email column to user_roles for easier admin management
ALTER TABLE public.user_roles 
ADD COLUMN email text;

-- Create an index for faster lookups by email
CREATE INDEX idx_user_roles_email ON public.user_roles(email);

-- Create a function to automatically populate email from auth.users
CREATE OR REPLACE FUNCTION public.populate_user_role_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  RETURN NEW;
END;
$$;

-- Trigger to auto-populate email on insert
CREATE TRIGGER set_user_role_email
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_user_role_email();

-- Backfill existing records with emails
UPDATE public.user_roles ur
SET email = (SELECT email FROM auth.users WHERE id = ur.user_id)
WHERE email IS NULL;