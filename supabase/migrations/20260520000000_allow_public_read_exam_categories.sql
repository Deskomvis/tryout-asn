-- Allow all visitors (anon + authenticated) to read the exam categories setting
-- so the landing page and Beli Paket page can fetch dynamic categories from the database without requiring admin authentication.
CREATE POLICY "Public can read exam categories"
  ON public.admin_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'exam_categories');
