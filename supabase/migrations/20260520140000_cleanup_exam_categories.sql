-- Bersihkan duplikasi exam_categories di admin_settings.
-- Set ulang dengan 6 kategori kanonik; image_url diambil dari entri lama jika ada.
UPDATE public.admin_settings
SET value = (
  WITH existing AS (
    -- Ambil image_url dari entri lama, cocokkan dengan id atau name (case-insensitive)
    SELECT DISTINCT ON (norm_id)
      LOWER(COALESCE(elem->>'id', '')) AS norm_id,
      elem->>'image_url' AS image_url
    FROM jsonb_array_elements((value)::jsonb) AS elem
    WHERE elem->>'image_url' IS NOT NULL
      AND elem->>'image_url' != 'null'
    ORDER BY norm_id, (elem->>'image_url') DESC
  ),
  canonical(id, name, description, sort_order) AS (
    VALUES
      ('cpns',       'CPNS',                     'Simulasi CAT terupdate untuk seleksi Calon Pegawai Negeri Sipil', 1),
      ('pppk',       'PPPK',                     'Paket soal seleksi PPPK Guru, Tenaga Kesehatan, dan Tenaga Teknis', 2),
      ('tni-polri',  'TNI / POLRI',              'Latihan intensif seleksi Taruna AKMIL, AKPOL, Bintara, dan Tamtama', 3),
      ('kedinasan',  'Sekolah Kedinasan',         'Sukses seleksi masuk PKN STAN, IPDN, STIS, POLTEKIP, dan STIN', 4),
      ('bumn',       'BUMN',                     'Kuasai TKD, Tes Akhlak, dan Bahasa Inggris untuk Rekrutmen Bersama BUMN', 5),
      ('koperasi',   'Koperasi Desa Merah Putih', 'Persiapan seleksi Manajer Koperasi Desa Merah Putih 2025', 6)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          c.id,
      'name',        c.name,
      'description', c.description,
      'image_url',   e.image_url
    )
    ORDER BY c.sort_order
  )::text
  FROM canonical c
  LEFT JOIN existing e ON e.norm_id = c.id
)
WHERE key = 'exam_categories';
