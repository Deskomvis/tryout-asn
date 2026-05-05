ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS original_price integer,
  ADD COLUMN IF NOT EXISTS bundle_size integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS image_url text;