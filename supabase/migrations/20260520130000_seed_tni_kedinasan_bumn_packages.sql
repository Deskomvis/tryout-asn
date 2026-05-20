-- ============================================================================
-- Paket Tryout: TNI/POLRI, KEDINASAN, BUMN (tanpa soal — soal ditambahkan via admin)
-- ============================================================================

-- ============================================================================
-- TNI / POLRI
-- ============================================================================
INSERT INTO public.exams (id, title, description, duration, total_questions, price, original_price, bundle_size, category, subcategory, exam_type)
VALUES
  ('d4444444-0000-0000-0000-000000000001',
   'Tryout Trial Seleksi TNI / POLRI (Gratis)',
   'Demo gratis untuk mengenal pola tes akademik seleksi Taruna, Bintara, dan Tamtama TNI/POLRI.',
   1800, 0, 0, NULL, 1, 'tni-polri', 'Seleksi Taruna / Bintara / Tamtama', 'tni-polri'),
  ('d4444444-0000-0000-0000-000000000002',
   'Tryout Premium Seleksi TNI / POLRI',
   'Tryout lengkap tes akademik TNI/POLRI: Pengetahuan Umum, Penalaran, dan Kepribadian.',
   3600, 0, 10000, 25000, 1, 'tni-polri', 'Seleksi Taruna / Bintara / Tamtama', 'tni-polri'),
  ('d4444444-0000-0000-0000-000000000003',
   'Bundling 10 Paket — Seleksi TNI / POLRI',
   'Akses 10 paket tryout TNI/POLRI dengan satu kali pembelian.',
   3600, 0, 49000, 99000, 10, 'tni-polri', 'Seleksi Taruna / Bintara / Tamtama', 'tni-polri')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- KEDINASAN
-- ============================================================================
INSERT INTO public.exams (id, title, description, duration, total_questions, price, original_price, bundle_size, category, subcategory, exam_type)
VALUES
  ('e5555555-0000-0000-0000-000000000001',
   'Tryout Trial Sekolah Kedinasan — PKN STAN / IPDN / STIS (Gratis)',
   'Demo gratis untuk mengenal pola tes masuk sekolah kedinasan favorit 2026.',
   1800, 0, 0, NULL, 1, 'kedinasan', 'PKN STAN / IPDN / STIS / POLTEKIP / STIN', 'kedinasan'),
  ('e5555555-0000-0000-0000-000000000002',
   'Tryout Premium Sekolah Kedinasan — PKN STAN / IPDN / STIS',
   'Tryout lengkap SKD + SKB kedinasan: TWK, TIU, TKP, dan tes khusus kedinasan.',
   3600, 0, 10000, 25000, 1, 'kedinasan', 'PKN STAN / IPDN / STIS / POLTEKIP / STIN', 'kedinasan'),
  ('e5555555-0000-0000-0000-000000000003',
   'Bundling 10 Paket — Sekolah Kedinasan',
   'Akses 10 paket tryout sekolah kedinasan dengan satu kali pembelian.',
   3600, 0, 49000, 99000, 10, 'kedinasan', 'PKN STAN / IPDN / STIS / POLTEKIP / STIN', 'kedinasan')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUMN
-- ============================================================================
INSERT INTO public.exams (id, title, description, duration, total_questions, price, original_price, bundle_size, category, subcategory, exam_type)
VALUES
  ('f6666666-0000-0000-0000-000000000001',
   'Tryout Trial Rekrutmen Bersama BUMN (Gratis)',
   'Demo gratis untuk mengenal pola tes rekrutmen BUMN: TKD, Tes Akhlak, dan Bahasa Inggris.',
   1800, 0, 0, NULL, 1, 'bumn', 'Rekrutmen Bersama BUMN', 'bumn'),
  ('f6666666-0000-0000-0000-000000000002',
   'Tryout Premium Rekrutmen Bersama BUMN',
   'Tryout lengkap rekrutmen BUMN: TKD, Tes Akhlak BUMN, dan Bahasa Inggris.',
   3600, 0, 10000, 25000, 1, 'bumn', 'Rekrutmen Bersama BUMN', 'bumn'),
  ('f6666666-0000-0000-0000-000000000003',
   'Bundling 10 Paket — Rekrutmen Bersama BUMN',
   'Akses 10 paket tryout rekrutmen BUMN dengan satu kali pembelian.',
   3600, 0, 49000, 99000, 10, 'bumn', 'Rekrutmen Bersama BUMN', 'bumn')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Tambah kategori TNI/POLRI, KEDINASAN, BUMN ke exam_categories
-- ============================================================================
UPDATE public.admin_settings
SET value = (
  SELECT jsonb_agg(elem ORDER BY (elem->>'id'))::text
  FROM (
    SELECT elem FROM jsonb_array_elements((value)::jsonb) AS elem
    UNION ALL
    SELECT '{"id":"tni-polri","name":"TNI / POLRI","description":"Seleksi Taruna, Bintara, Tamtama TNI dan POLRI","image_url":null}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements((value)::jsonb) AS e WHERE (e->>'id') = 'tni-polri'
    )
    UNION ALL
    SELECT '{"id":"kedinasan","name":"Sekolah Kedinasan","description":"PKN STAN, IPDN, STIS, POLTEKIP, STIN dan kedinasan lainnya","image_url":null}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements((value)::jsonb) AS e WHERE (e->>'id') = 'kedinasan'
    )
    UNION ALL
    SELECT '{"id":"bumn","name":"BUMN","description":"Rekrutmen Bersama BUMN (RBB) dan perusahaan BUMN lainnya","image_url":null}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements((value)::jsonb) AS e WHERE (e->>'id') = 'bumn'
    )
  ) AS combined(elem)
)
WHERE key = 'exam_categories';
