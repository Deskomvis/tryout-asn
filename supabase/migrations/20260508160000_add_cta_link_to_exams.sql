ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS cta_link text;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS passing_score integer DEFAULT 0;
