ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS bonus_title text,
ADD COLUMN IF NOT EXISTS bonus_description text,
ADD COLUMN IF NOT EXISTS bonus_link text;
