ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_material_id ON public.questions(material_id);
