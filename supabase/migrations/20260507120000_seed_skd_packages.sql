-- Seed paket SKD untuk kategori CPNS dan PPPK
-- Setiap paket mencampur subtes TWK + TIU + TKP sesuai kisi-kisi BKN

-- ============================================================================
-- 1) Buat 6 paket exam (3 CPNS + 3 PPPK)
-- ============================================================================
INSERT INTO public.exams (id, title, description, duration, total_questions, price, original_price, bundle_size, category, subcategory, exam_type)
VALUES
  -- CPNS
  ('a1111111-0000-0000-0000-000000000001',
   'SKD CPNS — Mini Try Out (Gratis)',
   'Demo gratis 9 soal: TWK, TIU, dan TKP untuk mengenal pola SKD CPNS.',
   1800, 9, 0, NULL, 1, 'cpns', 'SKD CPNS', 'skd'),
  ('a1111111-0000-0000-0000-000000000002',
   'SKD CPNS — Paket Premium 1',
   'Try out SKD CPNS dengan 17 soal mencakup seluruh subtes TWK, TIU, dan TKP.',
   3600, 17, 25000, 35000, 1, 'cpns', 'SKD CPNS', 'skd'),
  ('a1111111-0000-0000-0000-000000000003',
   'Bundling SKD CPNS — 5 Paket',
   'Akses 5 paket SKD CPNS dengan satu kali pembelian. Soal akan ditambahkan oleh admin.',
   6000, 0, 99000, 175000, 5, 'cpns', 'SKD CPNS', 'skd'),
  -- PPPK
  ('b2222222-0000-0000-0000-000000000001',
   'SKD PPPK — Mini Try Out (Gratis)',
   'Demo gratis 9 soal: TWK, TIU, dan TKP untuk mengenal pola SKD PPPK.',
   1800, 9, 0, NULL, 1, 'pppk', 'SKD PPPK', 'skd'),
  ('b2222222-0000-0000-0000-000000000002',
   'SKD PPPK — Paket Premium 1',
   'Try out SKD PPPK dengan 17 soal mencakup seluruh subtes TWK, TIU, dan TKP.',
   3600, 17, 25000, 35000, 1, 'pppk', 'SKD PPPK', 'skd'),
  ('b2222222-0000-0000-0000-000000000003',
   'Bundling SKD PPPK — 5 Paket',
   'Akses 5 paket SKD PPPK dengan satu kali pembelian. Soal akan ditambahkan oleh admin.',
   6000, 0, 99000, 175000, 5, 'pppk', 'SKD PPPK', 'skd')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) Helper untuk seed soal SKD ke sebuah exam_id (TWK + TIU + TKP)
--    Mode 'mini' = 9 soal, mode 'full' = 17 soal mencakup semua topik.
-- ============================================================================
CREATE OR REPLACE FUNCTION public._seed_skd_questions(_exam_id uuid, _mode text)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM public.questions WHERE exam_id = _exam_id) THEN
    RETURN;
  END IF;

  -- TWK: Pancasila
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'Sila kelima Pancasila berbunyi...',
     '["Ketuhanan Yang Maha Esa","Kemanusiaan yang adil dan beradab","Persatuan Indonesia","Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan","Keadilan sosial bagi seluruh rakyat Indonesia"]'::jsonb,
     'Keadilan sosial bagi seluruh rakyat Indonesia', 'twk');

  -- TWK: UUD 1945
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'Pasal 1 ayat (2) UUD 1945 setelah amandemen menyatakan bahwa kedaulatan berada di tangan...',
     '["MPR","Presiden","Rakyat dan dilaksanakan menurut UUD","DPR","Lembaga Tinggi Negara"]'::jsonb,
     'Rakyat dan dilaksanakan menurut UUD', 'twk');

  -- TWK: NKRI
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'Bentuk negara Republik Indonesia menurut UUD 1945 adalah...',
     '["Federasi","Konfederasi","Kesatuan","Serikat","Persemakmuran"]'::jsonb,
     'Kesatuan', 'twk');

  IF _mode = 'full' THEN
    -- TWK: Bhinneka Tunggal Ika
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
      (_exam_id, 'Semboyan Bhinneka Tunggal Ika diambil dari kitab...',
       '["Sutasoma karya Mpu Tantular","Negarakertagama karya Mpu Prapanca","Arjunawiwaha karya Mpu Kanwa","Bharatayudha karya Mpu Sedah","Smaradahana karya Mpu Dharmaja"]'::jsonb,
       'Sutasoma karya Mpu Tantular', 'twk');

    -- TWK: Bahasa Indonesia
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
      (_exam_id, 'Penulisan kata baku yang benar adalah...',
       '["aktifitas","aktivitas","aktipitas","activitas","aktiviti"]'::jsonb,
       'aktivitas', 'twk');
  END IF;

  -- TIU: Verbal Analogi
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'DOKTER : RUMAH SAKIT = GURU : ...',
     '["Murid","Pelajaran","Sekolah","Buku","Pendidikan"]'::jsonb,
     'Sekolah', 'tiu');

  -- TIU: Numerik Hitung Cepat
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'Hasil dari 25% × 240 + 0,5 × 60 adalah...',
     '["60","70","80","90","100"]'::jsonb,
     '90', 'tiu');

  -- TIU: Numerik Deret
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    (_exam_id, 'Lanjutan deret: 2, 6, 12, 20, 30, ...',
     '["40","42","44","46","48"]'::jsonb,
     '42', 'tiu');

  IF _mode = 'full' THEN
    -- TIU: Verbal Silogisme
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
      (_exam_id, 'Semua mahasiswa rajin belajar. Andi adalah mahasiswa. Kesimpulan yang tepat...',
       '["Andi pasti pintar","Andi rajin belajar","Hanya Andi yang rajin","Mahasiswa selalu pintar","Tidak dapat disimpulkan"]'::jsonb,
       'Andi rajin belajar', 'tiu');

    -- TIU: Verbal Logika
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
      (_exam_id, 'Jika hari hujan maka jalan basah. Jalan tidak basah. Maka...',
       '["Hari hujan","Hari tidak hujan","Jalan kering","Tidak hujan","Tidak dapat disimpulkan"]'::jsonb,
       'Hari tidak hujan', 'tiu');

    -- TIU: Figural (penalaran spasial)
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
      (_exam_id, 'Sebuah kubus diberi nomor 1-6 pada tiap sisi. Jika sisi 1 berhadapan dengan sisi 6, dan sisi 2 berhadapan dengan sisi 5, maka sisi yang berhadapan dengan sisi 3 adalah...',
       '["1","2","4","5","6"]'::jsonb,
       '4', 'tiu');
  END IF;

  -- TKP: Pelayanan Publik
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Saat melayani warga yang marah karena antrean lama, sikap Anda...',
     '["Membentak balik agar tidak menyepelekan petugas","Mengabaikan dan terus melayani sesuai antrean","Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan","Memprioritaskan agar dia segera pergi","Menyuruh atasan menanganinya"]'::jsonb,
     'Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan', 'tkp',
     '{"Membentak balik agar tidak menyepelekan petugas":1,"Mengabaikan dan terus melayani sesuai antrean":2,"Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan":5,"Memprioritaskan agar dia segera pergi":3,"Menyuruh atasan menanganinya":4}'::jsonb);

  -- TKP: Profesionalisme
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Atasan memberi tugas penting dengan deadline ketat. Anda akan...',
     '["Menolak karena terlalu berat","Mengerjakan asal jadi yang penting selesai","Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu","Meminta rekan mengerjakan sebagian besar","Mengerjakan sambil menunda tugas lain tanpa konfirmasi"]'::jsonb,
     'Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu', 'tkp',
     '{"Menolak karena terlalu berat":1,"Mengerjakan asal jadi yang penting selesai":2,"Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu":5,"Meminta rekan mengerjakan sebagian besar":3,"Mengerjakan sambil menunda tugas lain tanpa konfirmasi":4}'::jsonb);

  -- TKP: Anti Radikalisme
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Anda menerima pesan ajakan mengikuti gerakan yang menentang Pancasila. Sikap Anda...',
     '["Mengikuti karena penasaran","Mendiamkan saja","Menolak tegas dan melaporkan ke pihak berwenang","Mem-forward ke teman","Membaca isinya dulu baru memutuskan"]'::jsonb,
     'Menolak tegas dan melaporkan ke pihak berwenang', 'tkp',
     '{"Mengikuti karena penasaran":1,"Mendiamkan saja":2,"Menolak tegas dan melaporkan ke pihak berwenang":5,"Mem-forward ke teman":3,"Membaca isinya dulu baru memutuskan":4}'::jsonb);

  IF _mode = 'full' THEN
    -- TKP: Jejaring Kerja
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
      (_exam_id, 'Anda mendapat tugas yang membutuhkan kolaborasi dengan tim lain yang belum dikenal. Anda akan...',
       '["Bekerja sendiri agar tidak repot","Menunggu tim lain menghubungi terlebih dahulu","Memperkenalkan diri dan membangun komunikasi proaktif","Hanya berkomunikasi via email seperlunya","Meminta atasan menjadi penghubung utama"]'::jsonb,
       'Memperkenalkan diri dan membangun komunikasi proaktif', 'tkp',
       '{"Bekerja sendiri agar tidak repot":1,"Menunggu tim lain menghubungi terlebih dahulu":2,"Memperkenalkan diri dan membangun komunikasi proaktif":5,"Hanya berkomunikasi via email seperlunya":3,"Meminta atasan menjadi penghubung utama":4}'::jsonb);

    -- TKP: Sosial Budaya
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
      (_exam_id, 'Ketika ditugaskan ke daerah dengan budaya yang berbeda dari Anda, sikap yang tepat...',
       '["Memaksakan kebiasaan asal saya","Menjaga jarak agar tidak salah","Mempelajari dan menghormati adat setempat","Hanya berinteraksi dengan rekan satu daerah","Mengikuti hanya yang menguntungkan saya"]'::jsonb,
       'Mempelajari dan menghormati adat setempat', 'tkp',
       '{"Memaksakan kebiasaan asal saya":1,"Menjaga jarak agar tidak salah":2,"Mempelajari dan menghormati adat setempat":5,"Hanya berinteraksi dengan rekan satu daerah":3,"Mengikuti hanya yang menguntungkan saya":4}'::jsonb);

    -- TKP: TIK
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
      (_exam_id, 'Saat aplikasi kerja eror dan memperlambat pekerjaan, Anda akan...',
       '["Membiarkan dan mengeluh ke rekan","Berhenti bekerja sampai diperbaiki","Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat","Mencari tutorial seadanya tanpa lapor","Mencoba instal aplikasi alternatif tanpa izin"]'::jsonb,
     'Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat', 'tkp',
     '{"Membiarkan dan mengeluh ke rekan":1,"Berhenti bekerja sampai diperbaiki":2,"Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat":5,"Mencari tutorial seadanya tanpa lapor":3,"Mencoba instal aplikasi alternatif tanpa izin":4}'::jsonb);
  END IF;
END;
$f$;

-- ============================================================================
-- 3) Seed soal ke setiap paket
-- ============================================================================
SELECT public._seed_skd_questions('a1111111-0000-0000-0000-000000000001', 'mini');
SELECT public._seed_skd_questions('a1111111-0000-0000-0000-000000000002', 'full');
SELECT public._seed_skd_questions('b2222222-0000-0000-0000-000000000001', 'mini');
SELECT public._seed_skd_questions('b2222222-0000-0000-0000-000000000002', 'full');

-- ============================================================================
-- 4) Sinkronkan total_questions agar match dengan soal sebenarnya
-- ============================================================================
UPDATE public.exams e
SET total_questions = (SELECT COUNT(*) FROM public.questions q WHERE q.exam_id = e.id)
WHERE e.id IN (
  'a1111111-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000001',
  'b2222222-0000-0000-0000-000000000002'
);

-- Hapus helper function setelah seed selesai
DROP FUNCTION public._seed_skd_questions(uuid, text);
