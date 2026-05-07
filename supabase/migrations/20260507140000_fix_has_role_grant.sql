-- has_role adalah SECURITY DEFINER, aman di-grant ke authenticated
-- karena fungsi hanya membaca user_roles milik _user_id yang dipass.
-- Tanpa grant ini, RLS policy yang memanggil has_role() gagal dengan
-- "permission denied for function has_role" meski sudah login.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
