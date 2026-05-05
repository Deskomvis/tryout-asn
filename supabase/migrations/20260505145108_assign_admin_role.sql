-- Migration to assign admin role to specific user
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Cari ID user berdasarkan email di tabel profiles
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'roketamarket19@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Masukkan role admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
