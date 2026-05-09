CREATE TABLE IF NOT EXISTS public.materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  file_name text,
  category text DEFAULT 'general',
  topic text,
  extracted_text text NOT NULL,
  char_count integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on materials"
  ON public.materials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
