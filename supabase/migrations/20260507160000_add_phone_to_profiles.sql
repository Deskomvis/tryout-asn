ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update trigger handle_new_user agar juga menyimpan phone dari metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, username, phone)
  VALUES (
    NEW.id,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NEW.email,
    NULLIF(LOWER(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email,
    username  = COALESCE(public.profiles.username, EXCLUDED.username),
    phone     = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$;
