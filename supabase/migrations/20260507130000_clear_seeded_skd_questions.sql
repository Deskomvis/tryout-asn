-- Hapus soal yang sebelumnya di-seed untuk paket SKD CPNS dan PPPK.
-- Soal akan diisi ulang oleh admin via dashboard (rencana: generate via AI).
-- Paket shell (exam rows), durasi, harga, dan logic bundling tetap dipertahankan.

DELETE FROM public.questions WHERE exam_id IN (
  'a1111111-0000-0000-0000-000000000001', -- SKD CPNS Mini
  'a1111111-0000-0000-0000-000000000002', -- SKD CPNS Premium
  'a1111111-0000-0000-0000-000000000003', -- Bundling SKD CPNS
  'b2222222-0000-0000-0000-000000000001', -- SKD PPPK Mini
  'b2222222-0000-0000-0000-000000000002', -- SKD PPPK Premium
  'b2222222-0000-0000-0000-000000000003'  -- Bundling SKD PPPK
);

UPDATE public.exams SET total_questions = 0
WHERE id IN (
  'a1111111-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000002',
  'a1111111-0000-0000-0000-000000000003',
  'b2222222-0000-0000-0000-000000000001',
  'b2222222-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000003'
);
