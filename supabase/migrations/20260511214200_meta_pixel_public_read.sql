-- Allow all visitors (anon + authenticated) to read the Meta Pixel ID
-- so the pixel can fire on public pages without requiring login.
-- The CAPI token stays admin-only via the existing policy.
CREATE POLICY "Public can read meta pixel id"
  ON public.admin_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'meta_pixel_id');
