CREATE TABLE IF NOT EXISTS public.lynk_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lynk_uuid text NOT NULL,
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  title text NOT NULL,
  is_active boolean DEFAULT true,
  description text,
  notification_title text,
  notification_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lynk_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on lynk_packages"
  ON public.lynk_packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS lynk_packages_uuid_idx ON public.lynk_packages(lynk_uuid);
