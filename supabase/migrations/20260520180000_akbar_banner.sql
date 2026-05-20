-- Add banner_url to tryout_akbar_events
ALTER TABLE tryout_akbar_events ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Storage bucket for akbar banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'akbar-banners',
  'akbar-banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin can upload akbar banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'akbar-banners' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Anyone can view akbar banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'akbar-banners');

CREATE POLICY "Admin can delete akbar banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'akbar-banners' AND
    public.has_role(auth.uid(), 'admin')
  );
