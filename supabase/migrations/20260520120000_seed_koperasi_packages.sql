-- ============================================================================
-- Paket Tryout Manajer Koperasi Desa Merah Putih 2025
-- ============================================================================

-- 1) Insert exam packages
INSERT INTO public.exams (id, title, description, duration, total_questions, price, original_price, bundle_size, category, subcategory, exam_type)
VALUES
  ('c3333333-0000-0000-0000-000000000001',
   'Tryout Trial Manajer Koperasi Desa Merah Putih (Gratis)',
   'Demo gratis 9 soal untuk mengenal pola seleksi Manajer Koperasi Desa Merah Putih 2025.',
   1800, 9, 0, NULL, 1, 'koperasi', 'Manajer Koperasi Desa Merah Putih', 'koperasi'),
  ('c3333333-0000-0000-0000-000000000002',
   'Tryout Premium Manajer Koperasi Desa Merah Putih',
   'Tryout lengkap 30 soal mencakup Ekonomi Koperasi, Manajemen, dan Hukum Koperasi.',
   3600, 30, 10000, 25000, 1, 'koperasi', 'Manajer Koperasi Desa Merah Putih', 'koperasi'),
  ('c3333333-0000-0000-0000-000000000003',
   'Bundling 10 Paket — Manajer Koperasi Desa Merah Putih',
   'Akses 10 paket tryout Manajer Koperasi Desa Merah Putih dengan satu kali pembelian.',
   3600, 0, 49000, 99000, 10, 'koperasi', 'Manajer Koperasi Desa Merah Putih', 'koperasi')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) Seed soal ke paket trial dan premium
-- ============================================================================
CREATE OR REPLACE FUNCTION public._seed_koperasi_questions(_exam_id uuid, _mode text)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM public.questions WHERE exam_id = _exam_id) THEN
    RETURN;
  END IF;

  -- EKONOMI KOPERASI
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Koperasi Desa Merah Putih dibentuk sebagai program pemerintah yang bertujuan untuk...',
     '["Menggantikan BUMDES di seluruh Indonesia","Mewujudkan ketahanan pangan dan ekonomi desa yang mandiri","Meningkatkan pendapatan negara melalui pajak desa","Mengurangi jumlah koperasi yang tidak produktif","Menarik investasi asing ke pedesaan"]'::jsonb,
     'Mewujudkan ketahanan pangan dan ekonomi desa yang mandiri', 'ekonomi',
     'Koperasi Desa Merah Putih merupakan program pemerintah untuk memperkuat ekonomi desa melalui koperasi yang fokus pada ketahanan pangan dan kemandirian ekonomi masyarakat desa.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Modal koperasi berdasarkan UU No. 25 Tahun 1992 bersumber dari...',
     '["Hanya simpanan pokok anggota","Pinjaman pemerintah semata","Simpanan pokok, simpanan wajib, hibah, dan modal penyertaan","Dana APBN langsung","Utang luar negeri"]'::jsonb,
     'Simpanan pokok, simpanan wajib, hibah, dan modal penyertaan', 'ekonomi',
     'UU No. 25/1992 Pasal 41 menyebutkan modal koperasi terdiri dari modal sendiri (simpanan pokok, simpanan wajib, dana cadangan, hibah) dan modal pinjaman serta modal penyertaan.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Prinsip koperasi yang menyatakan setiap anggota memiliki hak suara yang sama dalam pengambilan keputusan disebut...',
     '["Prinsip otonomi koperasi","Prinsip kerjasama antar koperasi","Prinsip pengelolaan demokratis","Prinsip partisipasi ekonomi anggota","Prinsip pendidikan koperasi"]'::jsonb,
     'Prinsip pengelolaan demokratis', 'ekonomi',
     'Prinsip pengelolaan demokratis berarti setiap anggota koperasi memiliki hak suara yang sama (one man one vote) dalam Rapat Anggota tanpa memandang besar kecilnya simpanan.');

  -- MANAJEMEN KOPERASI
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Tugas utama manajer koperasi dalam struktur organisasi adalah...',
     '["Menetapkan Anggaran Dasar koperasi","Memimpin Rapat Anggota Tahunan","Mengelola usaha koperasi sesuai wewenang yang diberikan pengurus","Mengangkat dan memberhentikan pengurus","Melakukan audit keuangan tahunan"]'::jsonb,
     'Mengelola usaha koperasi sesuai wewenang yang diberikan pengurus', 'manajemen',
     'Manajer koperasi adalah pelaksana operasional harian yang bertanggung jawab kepada pengurus. Manajer mengelola usaha koperasi berdasarkan wewenang dan kebijakan yang ditetapkan oleh pengurus.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Sisa Hasil Usaha (SHU) koperasi dibagikan kepada anggota berdasarkan...',
     '["Keputusan sepihak pengurus","Jumlah modal yang disetor saja","Jasa modal dan jasa anggota sesuai Anggaran Dasar","Lamanya menjadi anggota koperasi","Jabatan yang dipegang dalam koperasi"]'::jsonb,
     'Jasa modal dan jasa anggota sesuai Anggaran Dasar', 'manajemen',
     'UU No. 25/1992 Pasal 45 mengatur SHU dibagikan berdasarkan jasa modal (simpanan anggota) dan jasa anggota (transaksi/partisipasi usaha), sesuai ketentuan AD/ART koperasi.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Laporan pertanggungjawaban pengurus koperasi wajib disampaikan pada...',
     '["Rapat pengurus bulanan","Rapat Anggota Tahunan","Rapat pleno pengawas","Rapat koordinasi dengan dinas koperasi","Rapat dewan koperasi nasional"]'::jsonb,
     'Rapat Anggota Tahunan', 'manajemen',
     'Sesuai UU No. 25/1992 Pasal 26, pengurus wajib menyampaikan laporan pertanggungjawaban pada Rapat Anggota Tahunan yang merupakan kekuasaan tertinggi koperasi.');

  -- HUKUM KOPERASI
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Undang-Undang yang berlaku mengatur tentang perkoperasian di Indonesia saat ini adalah...',
     '["UU No. 17 Tahun 2012","UU No. 25 Tahun 1992","UU No. 11 Tahun 2020","UU No. 5 Tahun 1999","UU No. 40 Tahun 2007"]'::jsonb,
     'UU No. 25 Tahun 1992', 'hukum',
     'UU No. 25 Tahun 1992 tentang Perkoperasian masih berlaku sebagai landasan hukum utama. UU No. 17 Tahun 2012 telah dibatalkan oleh Mahkamah Konstitusi melalui Putusan MK No. 28/PUU-XI/2013.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Berdasarkan UU No. 25 Tahun 1992, koperasi primer dapat didirikan oleh paling sedikit...',
     '["5 orang warga negara Indonesia","10 orang warga negara Indonesia","20 orang warga negara Indonesia","25 orang warga negara Indonesia","50 orang warga negara Indonesia"]'::jsonb,
     '20 orang warga negara Indonesia', 'hukum',
     'UU No. 25/1992 Pasal 6 ayat (1) menyatakan Koperasi Primer dibentuk oleh sekurang-kurangnya 20 (dua puluh) orang yang memenuhi persyaratan keanggotaan.');

  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
    (_exam_id,
     'Kewenangan tertinggi dalam struktur organisasi koperasi menurut UU No. 25 Tahun 1992 berada pada...',
     '["Pengurus koperasi","Pengawas koperasi","Manajer koperasi","Rapat Anggota","Pemerintah daerah setempat"]'::jsonb,
     'Rapat Anggota', 'hukum',
     'Pasal 22 UU No. 25/1992 menyatakan Rapat Anggota merupakan kekuasaan tertinggi dalam koperasi. Rapat Anggota menetapkan kebijakan umum, AD/ART, dan pertanggungjawaban pengurus.');

  IF _mode = 'full' THEN
    -- EKONOMI LANJUTAN
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Koperasi Desa Merah Putih bergerak dalam bidang usaha yang mencakup...',
       '["Hanya simpan pinjam anggota","Perdagangan, simpan pinjam, dan produksi sesuai kebutuhan desa","Ekspor komoditas pertanian saja","Investasi saham di pasar modal","Pengelolaan APBD desa"]'::jsonb,
       'Perdagangan, simpan pinjam, dan produksi sesuai kebutuhan desa', 'ekonomi',
       'Koperasi Desa Merah Putih dirancang sebagai koperasi multi-usaha yang mencakup berbagai bidang usaha sesuai kebutuhan dan potensi desa, antara lain perdagangan, simpan pinjam, dan produksi.');

    -- MANAJEMEN LANJUTAN
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Dalam menjalankan tugasnya, manajer koperasi bertanggung jawab kepada...',
       '["Rapat Anggota secara langsung","Pengawas koperasi","Pengurus koperasi","Dinas Koperasi setempat","Kementerian Koperasi dan UKM"]'::jsonb,
       'Pengurus koperasi', 'manajemen',
       'Manajer adalah tenaga profesional yang diangkat oleh pengurus untuk mengelola operasional koperasi. Manajer bertanggung jawab langsung kepada pengurus koperasi, bukan kepada Rapat Anggota atau instansi pemerintah.');

    -- HUKUM LANJUTAN
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Pengawas koperasi memiliki kewenangan untuk...',
       '["Mengangkat dan memberhentikan manajer","Menetapkan kebijakan usaha koperasi","Memeriksa dan menilai pelaksanaan kebijakan serta laporan keuangan koperasi","Menentukan besaran SHU tiap anggota","Mewakili koperasi dalam perjanjian dengan pihak luar"]'::jsonb,
       'Memeriksa dan menilai pelaksanaan kebijakan serta laporan keuangan koperasi', 'hukum',
       'UU No. 25/1992 Pasal 38-39 mengatur bahwa pengawas bertugas melakukan pengawasan terhadap pelaksanaan kebijakan dan pengelolaan koperasi, serta membuat laporan tertulis tentang hasil pengawasan.');

    -- MANAJEMEN LANJUTAN 2
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Salah satu fungsi strategis manajer Koperasi Desa Merah Putih dalam pengembangan usaha adalah...',
       '["Mengubah AD/ART koperasi secara mandiri","Memutus keanggotaan yang tidak aktif tanpa persetujuan","Menyusun rencana kerja dan anggaran untuk disetujui pengurus","Menetapkan besaran simpanan pokok anggota baru","Menentukan pembagian SHU tanpa RAT"]'::jsonb,
       'Menyusun rencana kerja dan anggaran untuk disetujui pengurus', 'manajemen',
       'Salah satu fungsi penting manajer adalah menyusun rencana kerja dan anggaran (RKAT) koperasi yang kemudian diajukan kepada pengurus untuk ditetapkan dan disahkan dalam Rapat Anggota.');

    -- EKONOMI LANJUTAN 2
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Konsep "dari anggota, oleh anggota, dan untuk anggota" dalam koperasi mencerminkan prinsip...',
       '["Otonomi dan kemandirian","Kerjasama antar koperasi","Keanggotaan yang sukarela dan terbuka","Pengelolaan demokratis dan partisipasi ekonomi anggota","Pendidikan, pelatihan, dan informasi"]'::jsonb,
       'Pengelolaan demokratis dan partisipasi ekonomi anggota', 'ekonomi',
       'Konsep tersebut mencerminkan dua prinsip utama: pengelolaan demokratis (anggota menentukan kebijakan) dan partisipasi ekonomi anggota (anggota berkontribusi modal dan menikmati manfaat). Ini menjadi ciri khas yang membedakan koperasi dari badan usaha lain.');

    -- HUKUM LANJUTAN 2
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Pengesahan badan hukum koperasi diterbitkan oleh...',
       '["Notaris yang ditunjuk anggota","Pemerintah melalui Kementerian yang membidangi koperasi","Badan Pertanahan Nasional","Dinas Koperasi kabupaten/kota saja","Bank Indonesia"]'::jsonb,
       'Pemerintah melalui Kementerian yang membidangi koperasi', 'hukum',
       'Berdasarkan UU No. 25/1992, pengesahan badan hukum koperasi diberikan oleh pemerintah melalui kementerian yang membidangi urusan koperasi, setelah akta pendirian koperasi disahkan dan memenuhi persyaratan.');

    -- MANAJEMEN LANJUTAN 3
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Agar Koperasi Desa Merah Putih dapat berjalan efektif, manajer harus memastikan penerapan prinsip tata kelola yang baik (good governance), yang meliputi...',
       '["Transparansi, akuntabilitas, responsibilitas, dan kemandirian","Profit maksimal, efisiensi biaya, dan ekspansi agresif","Kepatuhan pada instruksi pemerintah tanpa evaluasi","Sentralisasi pengambilan keputusan pada manajer","Pembatasan akses informasi kepada anggota"]'::jsonb,
       'Transparansi, akuntabilitas, responsibilitas, dan kemandirian', 'manajemen',
       'Prinsip good governance koperasi mencakup transparansi (keterbukaan informasi), akuntabilitas (pertanggungjawaban yang jelas), responsibilitas (kepatuhan pada aturan), dan kemandirian (pengelolaan bebas dari tekanan pihak luar).');

    -- EKONOMI LANJUTAN 3
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Simpanan wajib pada koperasi berbeda dengan simpanan pokok karena...',
       '["Simpanan wajib dibayar hanya sekali saat masuk","Simpanan wajib jumlahnya tidak harus sama dan dapat dibayar berkala sesuai kesepakatan","Simpanan wajib tidak dapat ditarik selama menjadi anggota","Simpanan wajib hanya berlaku untuk koperasi simpan pinjam","Simpanan wajib tidak menentukan hak suara anggota"]'::jsonb,
       'Simpanan wajib jumlahnya tidak harus sama dan dapat dibayar berkala sesuai kesepakatan', 'ekonomi',
       'Simpanan pokok dibayar sekali saat masuk dengan jumlah sama untuk semua anggota, sedangkan simpanan wajib dibayar secara berkala (misalnya bulanan) dengan jumlah yang ditentukan dalam AD/ART koperasi.');

    -- HUKUM LANJUTAN 3
    INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, explanation) VALUES
      (_exam_id,
       'Pembubaran koperasi dapat dilakukan melalui...',
       '["Keputusan manajer koperasi","Instruksi pemerintah daerah saja","Keputusan Rapat Anggota atau penetapan pemerintah","Putusan pengurus secara sepihak","Persetujuan pengawas koperasi saja"]'::jsonb,
       'Keputusan Rapat Anggota atau penetapan pemerintah', 'hukum',
       'UU No. 25/1992 Pasal 46 mengatur bahwa koperasi dapat dibubarkan berdasarkan keputusan Rapat Anggota atau berdasarkan keputusan pemerintah apabila terdapat alasan yang cukup seperti tidak memenuhi ketentuan undang-undang.');
  END IF;
END;
$f$;

-- ============================================================================
-- 3) Seed soal
-- ============================================================================
SELECT public._seed_koperasi_questions('c3333333-0000-0000-0000-000000000001', 'mini');
SELECT public._seed_koperasi_questions('c3333333-0000-0000-0000-000000000002', 'full');

-- Update total_questions
UPDATE public.exams e
SET total_questions = (SELECT COUNT(*) FROM public.questions q WHERE q.exam_id = e.id)
WHERE e.id IN (
  'c3333333-0000-0000-0000-000000000001',
  'c3333333-0000-0000-0000-000000000002'
);

DROP FUNCTION public._seed_koperasi_questions(uuid, text);

-- ============================================================================
-- 4) Tambahkan kategori KOPERASI ke admin_settings exam_categories
-- ============================================================================
INSERT INTO public.admin_settings (key, value)
VALUES (
  'exam_categories',
  '[{"id":"cpns","name":"CPNS","image_url":"/CPNS.png","description":"Calon Pegawai Negeri Sipil"},{"id":"tni-polri","name":"TNI/POLRI","image_url":"/TNI_POLRI.png","description":"Taruna, Bintara & Tamtama"},{"id":"pppk","name":"PPPK","image_url":"/PPPK.png","description":"Pegawai Pemerintah dengan Perjanjian Kerja"},{"id":"kedinasan","name":"KEDINASAN","image_url":"/KEDINASAN.png","description":"Sekolah Kedinasan (STAN, IPDN, STIS, dll)"},{"id":"bumn","name":"BUMN","image_url":"/BUMN.png","description":"Rekrutmen Bersama BUMN"},{"id":"koperasi","name":"KOPERASI","image_url":"/KOPERASI.png","description":"Koperasi Desa Merah Putih 2025"}]'
)
ON CONFLICT (key) DO UPDATE SET
  value = CASE
    WHEN (admin_settings.value)::jsonb @> '[{"id":"koperasi"}]'::jsonb
    THEN admin_settings.value
    ELSE ((admin_settings.value)::jsonb || '[{"id":"koperasi","name":"KOPERASI","image_url":"/KOPERASI.png","description":"Koperasi Desa Merah Putih 2025"}]'::jsonb)::text
  END;
