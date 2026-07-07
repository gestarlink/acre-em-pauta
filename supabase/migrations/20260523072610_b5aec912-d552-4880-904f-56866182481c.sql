
-- Update handle_new_user to promote first user to admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_admin;

  IF has_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'viewer');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'editor');
  END IF;

  RETURN new;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
