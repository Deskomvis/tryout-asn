
-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (LOWER(username));

-- Allow signup handler to capture username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NULLIF(LOWER(NEW.raw_user_meta_data->>'username'), '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_balances (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END; $function$;

-- Lookup function: resolves a username to its email so the client can sign in.
-- SECURITY DEFINER + restricted args; returns email or null.
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT email FROM public.profiles WHERE LOWER(username) = LOWER(_username) LIMIT 1;
$function$;

-- Username availability check (does not leak emails)
CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(_username));
$function$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
