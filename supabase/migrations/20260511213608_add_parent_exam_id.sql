-- Sub-paket: setiap paket induk bisa punya anak (Paket A, B, C...)
-- dengan jumlah soal & durasi masing-masing yang berbeda
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS parent_exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exams_parent_exam_id ON public.exams(parent_exam_id);
