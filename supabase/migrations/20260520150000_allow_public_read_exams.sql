-- Izinkan semua pengunjung (anon + authenticated) membaca daftar paket tryout.
-- Aman: soal ujian tetap dilindungi oleh get_exam_questions (hanya authenticated).
DROP POLICY IF EXISTS "Everyone authenticated views exams" ON public.exams;
CREATE POLICY "Everyone views exams" ON public.exams
  FOR SELECT USING (true);
