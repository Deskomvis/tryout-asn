-- Admin settings table for storing API keys and configurations
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage settings"
  ON admin_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow edge function (service role) to read settings
CREATE POLICY "Service role read settings"
  ON admin_settings FOR SELECT
  USING (auth.role() = 'service_role');

-- Add image_url to questions (for image-based questions)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create Supabase storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Admin can upload question images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'question-images' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Anyone can view question images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'question-images');

CREATE POLICY "Admin can delete question images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'question-images' AND
    public.has_role(auth.uid(), 'admin')
  );
