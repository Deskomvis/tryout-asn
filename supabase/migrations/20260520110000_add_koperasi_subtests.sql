-- Extend exam_subtest enum untuk koperasi (harus di transaction terpisah sebelum dipakai)
ALTER TYPE public.exam_subtest ADD VALUE IF NOT EXISTS 'ekonomi';
ALTER TYPE public.exam_subtest ADD VALUE IF NOT EXISTS 'manajemen';
ALTER TYPE public.exam_subtest ADD VALUE IF NOT EXISTS 'hukum';
