-- Fix: policy "Admins manage exams/questions" FOR ALL tanpa TO role
-- menyebabkan anon juga mengevaluasi has_role dan gagal.
-- Solusi: batasi policy admin ke role authenticated saja,
-- dan grant has_role ke anon agar landing page bisa fetch data publik.

-- Grant has_role ke anon (aman: SECURITY DEFINER, hanya baca user_roles)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Perbaiki policy exams agar admin policy hanya berlaku untuk authenticated
DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams" ON public.exams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Perbaiki policy questions
DROP POLICY IF EXISTS "Admins manage questions" ON public.questions;
CREATE POLICY "Admins manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
