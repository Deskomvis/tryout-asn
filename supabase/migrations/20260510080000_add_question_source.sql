ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'ai'));

UPDATE public.questions SET source = 'manual' WHERE source IS NULL;
