-- Allow all visitors (anon + authenticated) to read community_links setting
-- so the sidebar can display WhatsApp and Telegram group links without admin authentication.
CREATE POLICY "Public can read community links"
  ON public.admin_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'community_links');
