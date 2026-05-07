-- 1) purchase_exam menghormati bundle_size: bundling membuat N baris exam_purchases (= N akses tryout)
CREATE OR REPLACE FUNCTION public.purchase_exam(_exam_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_price INTEGER;
  v_bundle INTEGER;
  v_balance INTEGER;
  v_purchase_id UUID;
  v_per_row INTEGER;
  i INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT price, COALESCE(bundle_size, 1) INTO v_price, v_bundle
    FROM public.exams WHERE id = _exam_id;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Paket tidak ditemukan'; END IF;
  IF v_bundle IS NULL OR v_bundle < 1 THEN v_bundle := 1; END IF;

  SELECT balance INTO v_balance FROM public.user_balances WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN
    INSERT INTO public.user_balances(user_id, balance) VALUES (v_user, 0);
    v_balance := 0;
  END IF;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo tidak cukup. Saldo: %, harga: %', v_balance, v_price;
  END IF;

  UPDATE public.user_balances
    SET balance = balance - v_price, updated_at = now()
    WHERE user_id = v_user;

  v_per_row := CASE WHEN v_bundle > 0 THEN v_price / v_bundle ELSE v_price END;

  FOR i IN 1..v_bundle LOOP
    INSERT INTO public.exam_purchases (user_id, exam_id, price_paid)
    VALUES (v_user, _exam_id, v_per_row)
    RETURNING id INTO v_purchase_id;
  END LOOP;

  RETURN v_purchase_id;
END; $$;

-- 2) Bersihkan seed soal lama untuk Paket Premium dan Bundling (Mini gratis tetap)
DELETE FROM public.questions WHERE exam_id IN (
  'a1111111-0000-0000-0000-000000000002',
  'a1111111-0000-0000-0000-000000000003',
  'b2222222-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000003'
);

-- 3) Naikkan durasi paket Premium & Bundle ke 100 menit (mengikuti spec SKD 100 soal)
UPDATE public.exams SET duration = 6000
 WHERE id IN (
  'a1111111-0000-0000-0000-000000000002',
  'a1111111-0000-0000-0000-000000000003',
  'b2222222-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000003'
);

-- 4) Helper: seed 100 soal SKD (30 TWK + 30 TIU + 40 TKP) ke sebuah exam
CREATE OR REPLACE FUNCTION public._seed_skd_full(_exam_id uuid)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM public.questions WHERE exam_id = _exam_id) THEN
    RETURN;
  END IF;

  -- =====================================================================
  -- TWK (30): Pancasila, UUD 1945, Bhinneka Tunggal Ika, NKRI, Bahasa Indonesia
  -- =====================================================================
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    -- Pancasila (6)
    (_exam_id, 'Sila kelima Pancasila berbunyi...',
     '["Ketuhanan Yang Maha Esa","Kemanusiaan yang adil dan beradab","Persatuan Indonesia","Kerakyatan yang dipimpin oleh hikmat kebijaksanaan","Keadilan sosial bagi seluruh rakyat Indonesia"]'::jsonb,
     'Keadilan sosial bagi seluruh rakyat Indonesia', 'twk'),
    (_exam_id, 'Tokoh yang pertama kali mengusulkan istilah "Pancasila" adalah...',
     '["Mohammad Yamin","Soepomo","Soekarno","Mohammad Hatta","Ki Hajar Dewantara"]'::jsonb,
     'Soekarno', 'twk'),
    (_exam_id, 'Lambang sila keempat Pancasila adalah...',
     '["Bintang","Rantai","Pohon Beringin","Kepala Banteng","Padi dan Kapas"]'::jsonb,
     'Kepala Banteng', 'twk'),
    (_exam_id, 'Pancasila disahkan sebagai dasar negara pada tanggal...',
     '["1 Juni 1945","17 Agustus 1945","18 Agustus 1945","22 Juni 1945","29 Mei 1945"]'::jsonb,
     '18 Agustus 1945', 'twk'),
    (_exam_id, 'Sila yang berbunyi "Persatuan Indonesia" adalah sila ke-...',
     '["Pertama","Kedua","Ketiga","Keempat","Kelima"]'::jsonb,
     'Ketiga', 'twk'),
    (_exam_id, 'Hari Lahir Pancasila ditetapkan pada tanggal...',
     '["18 Agustus","17 Agustus","1 Juni","1 Oktober","22 Juni"]'::jsonb,
     '1 Juni', 'twk'),

    -- UUD 1945 (6)
    (_exam_id, 'Pasal 1 ayat (2) UUD 1945 menyatakan bahwa kedaulatan berada di tangan...',
     '["MPR","Presiden","Rakyat dan dilaksanakan menurut UUD","DPR","Lembaga Tinggi Negara"]'::jsonb,
     'Rakyat dan dilaksanakan menurut UUD', 'twk'),
    (_exam_id, 'UUD 1945 disahkan oleh...',
     '["BPUPKI","PPKI","KNIP","Presiden","Sidang Umum MPR"]'::jsonb,
     'PPKI', 'twk'),
    (_exam_id, 'UUD 1945 telah diamandemen sebanyak...',
     '["1 kali","2 kali","3 kali","4 kali","5 kali"]'::jsonb,
     '4 kali', 'twk'),
    (_exam_id, 'Lembaga negara yang berwenang menguji UU terhadap UUD adalah...',
     '["Mahkamah Agung","Mahkamah Konstitusi","Komisi Yudisial","DPR","Presiden"]'::jsonb,
     'Mahkamah Konstitusi', 'twk'),
    (_exam_id, 'Pasal 33 UUD 1945 mengatur tentang...',
     '["Hak Asasi Manusia","Pertahanan Negara","Perekonomian dan kesejahteraan sosial","Kekuasaan Kehakiman","Pendidikan"]'::jsonb,
     'Perekonomian dan kesejahteraan sosial', 'twk'),
    (_exam_id, 'Masa jabatan Presiden dan Wakil Presiden RI menurut UUD 1945 amandemen adalah...',
     '["4 tahun, dapat dipilih kembali sekali","5 tahun, dapat dipilih kembali sekali","5 tahun, tanpa batas","6 tahun, sekali","7 tahun, sekali"]'::jsonb,
     '5 tahun, dapat dipilih kembali sekali', 'twk'),

    -- Bhinneka Tunggal Ika (6)
    (_exam_id, 'Semboyan Bhinneka Tunggal Ika diambil dari kitab...',
     '["Sutasoma karya Mpu Tantular","Negarakertagama karya Mpu Prapanca","Arjunawiwaha karya Mpu Kanwa","Bharatayudha karya Mpu Sedah","Smaradahana karya Mpu Dharmaja"]'::jsonb,
     'Sutasoma karya Mpu Tantular', 'twk'),
    (_exam_id, 'Arti harfiah Bhinneka Tunggal Ika adalah...',
     '["Berbeda-beda tetapi tetap satu","Bersatu dalam perbedaan","Bersama untuk Indonesia","Bersatu kita teguh","Satu nusa satu bangsa"]'::jsonb,
     'Berbeda-beda tetapi tetap satu', 'twk'),
    (_exam_id, 'Bhinneka Tunggal Ika tertulis dalam lambang negara, yaitu...',
     '["Bendera Merah Putih","Garuda Pancasila","Burung Cendrawasih","Komodo","Gunungan Wayang"]'::jsonb,
     'Garuda Pancasila', 'twk'),
    (_exam_id, 'Pengarang kitab Sutasoma adalah...',
     '["Mpu Tantular","Mpu Prapanca","Mpu Kanwa","Mpu Sedah","Mpu Dharmaja"]'::jsonb,
     'Mpu Tantular', 'twk'),
    (_exam_id, 'Penetapan Bhinneka Tunggal Ika sebagai semboyan negara diatur dalam...',
     '["UU No. 24 Tahun 2009","PP No. 66 Tahun 1951","UU Dasar 1945 Pasal 36A","Keppres No. 1 Tahun 1965","TAP MPR No. III/2000"]'::jsonb,
     'PP No. 66 Tahun 1951', 'twk'),
    (_exam_id, 'Makna paling tepat Bhinneka Tunggal Ika dalam kehidupan berbangsa adalah...',
     '["Menghapus perbedaan demi persatuan","Persatuan dalam keberagaman","Mengutamakan kepentingan mayoritas","Menyamakan budaya","Menolak pengaruh luar"]'::jsonb,
     'Persatuan dalam keberagaman', 'twk'),

    -- NKRI (6)
    (_exam_id, 'Bentuk negara Republik Indonesia menurut UUD 1945 adalah...',
     '["Federasi","Konfederasi","Kesatuan","Serikat","Persemakmuran"]'::jsonb,
     'Kesatuan', 'twk'),
    (_exam_id, 'Sistem pemerintahan Indonesia adalah...',
     '["Parlementer","Presidensial","Semi-presidensial","Komunis","Monarki konstitusional"]'::jsonb,
     'Presidensial', 'twk'),
    (_exam_id, 'Wilayah NKRI adalah negara kepulauan yang berdasarkan prinsip...',
     '["Nusantara","Bhinneka","Wawasan Nusantara","Pancasila","Kesatuan Wilayah"]'::jsonb,
     'Wawasan Nusantara', 'twk'),
    (_exam_id, 'Ibu kota negara Indonesia berdasarkan UU IKN adalah...',
     '["Jakarta","Bandung","Nusantara","Surabaya","Yogyakarta"]'::jsonb,
     'Nusantara', 'twk'),
    (_exam_id, 'Dasar hukum tertinggi NKRI adalah...',
     '["TAP MPR","UU","UUD 1945","Pancasila","Perpres"]'::jsonb,
     'UUD 1945', 'twk'),
    (_exam_id, 'Lagu kebangsaan Indonesia diciptakan oleh...',
     '["W.R. Supratman","Ismail Marzuki","Kusbini","C. Simanjuntak","Ibu Sud"]'::jsonb,
     'W.R. Supratman', 'twk'),

    -- Bahasa Indonesia (6)
    (_exam_id, 'Penulisan kata baku yang benar adalah...',
     '["aktifitas","aktivitas","aktipitas","activitas","aktiviti"]'::jsonb,
     'aktivitas', 'twk'),
    (_exam_id, 'Sinonim kata "transparan" adalah...',
     '["Tertutup","Tersembunyi","Jelas","Rumit","Samar"]'::jsonb,
     'Jelas', 'twk'),
    (_exam_id, 'Kalimat efektif yang benar adalah...',
     '["Para ibu-ibu sedang berbelanja di pasar","Ibu-ibu sedang berbelanja di pasar","Para ibu sedang berbelanja-belanja di pasar","Para ibu-ibu sedang berbelanja-belanja","Banyak ibu-ibu yang berbelanja"]'::jsonb,
     'Ibu-ibu sedang berbelanja di pasar', 'twk'),
    (_exam_id, 'Penulisan huruf kapital yang tepat...',
     '["bahasa indonesia","Bahasa indonesia","bahasa Indonesia","Bahasa Indonesia","BAHASA Indonesia"]'::jsonb,
     'Bahasa Indonesia', 'twk'),
    (_exam_id, 'Antonim kata "ekspor" adalah...',
     '["Impor","Distribusi","Produksi","Konsumsi","Niaga"]'::jsonb,
     'Impor', 'twk'),
    (_exam_id, 'Penulisan tanggal yang baku adalah...',
     '["7 Mei 2026","7-5-2026","07/05/2026","7 mei 2026","7-Mei-2026"]'::jsonb,
     '7 Mei 2026', 'twk');

  -- =====================================================================
  -- TIU (30): Verbal Analogi/Silogisme/Logika, Numerik Hitung Cepat/Deret, Figural
  -- =====================================================================
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest) VALUES
    -- Verbal Analogi (5)
    (_exam_id, 'DOKTER : RUMAH SAKIT = GURU : ...',
     '["Murid","Pelajaran","Sekolah","Buku","Pendidikan"]'::jsonb,
     'Sekolah', 'tiu'),
    (_exam_id, 'PILOT : PESAWAT = MASINIS : ...',
     '["Stasiun","Lokomotif","Rel","Penumpang","Tiket"]'::jsonb,
     'Lokomotif', 'tiu'),
    (_exam_id, 'AIR : MENGUAP = BESI : ...',
     '["Berkarat","Meleleh","Bengkok","Patah","Memuai"]'::jsonb,
     'Meleleh', 'tiu'),
    (_exam_id, 'KAMERA : LENSA = MOBIL : ...',
     '["Kemudi","Mesin","Roda","Bensin","Lampu"]'::jsonb,
     'Mesin', 'tiu'),
    (_exam_id, 'PENA : TINTA = LILIN : ...',
     '["Sumbu","Api","Cahaya","Lelehan","Tabung"]'::jsonb,
     'Sumbu', 'tiu'),

    -- Verbal Silogisme (5)
    (_exam_id, 'Semua mahasiswa rajin belajar. Andi adalah mahasiswa. Maka...',
     '["Andi pasti pintar","Andi rajin belajar","Hanya Andi yang rajin","Mahasiswa selalu pintar","Tidak dapat disimpulkan"]'::jsonb,
     'Andi rajin belajar', 'tiu'),
    (_exam_id, 'Tidak ada burung yang bisa berenang. Itik adalah burung. Maka...',
     '["Itik bisa berenang","Itik tidak bisa berenang","Itik bukan burung","Tidak dapat disimpulkan","Itik kadang berenang"]'::jsonb,
     'Itik tidak bisa berenang', 'tiu'),
    (_exam_id, 'Semua A adalah B. Sebagian B adalah C. Maka...',
     '["Semua A adalah C","Sebagian A adalah C","Sebagian B mungkin A dan mungkin C","Semua C adalah A","Tidak dapat disimpulkan"]'::jsonb,
     'Tidak dapat disimpulkan', 'tiu'),
    (_exam_id, 'Hanya pelajar yang membawa tas merah. Andi membawa tas merah. Maka...',
     '["Andi adalah pelajar","Andi bukan pelajar","Andi pelajar atau bukan","Tas Andi pinjaman","Tidak dapat disimpulkan"]'::jsonb,
     'Andi adalah pelajar', 'tiu'),
    (_exam_id, 'Semua kucing adalah mamalia. Beberapa mamalia menyusui. Maka...',
     '["Semua kucing menyusui","Beberapa kucing mungkin menyusui","Tidak ada kucing yang menyusui","Hanya mamalia yang menyusui","Tidak dapat disimpulkan"]'::jsonb,
     'Beberapa kucing mungkin menyusui', 'tiu'),

    -- Verbal Logika (5)
    (_exam_id, 'Jika hari hujan maka jalan basah. Jalan tidak basah. Maka...',
     '["Hari hujan","Hari tidak hujan","Jalan kering","Tidak hujan","Tidak dapat disimpulkan"]'::jsonb,
     'Hari tidak hujan', 'tiu'),
    (_exam_id, 'Jika P maka Q. P benar. Maka...',
     '["Q benar","Q salah","Q mungkin benar","P salah","Tidak dapat disimpulkan"]'::jsonb,
     'Q benar', 'tiu'),
    (_exam_id, 'Jika A maka B. Jika B maka C. A terjadi. Maka...',
     '["B saja","C saja","B dan C","Tidak ada","Tidak dapat disimpulkan"]'::jsonb,
     'B dan C', 'tiu'),
    (_exam_id, 'Jika tidak P maka Q. P tidak terjadi. Maka...',
     '["Q terjadi","Q tidak terjadi","P terjadi","Tidak ada simpulan","P dan Q terjadi"]'::jsonb,
     'Q terjadi', 'tiu'),
    (_exam_id, 'Pernyataan "Jika hujan, jalan basah" setara dengan...',
     '["Jika jalan basah maka hujan","Jika tidak basah maka tidak hujan","Jika tidak hujan maka tidak basah","Hujan menyebabkan kering","Tidak ada yang setara"]'::jsonb,
     'Jika tidak basah maka tidak hujan', 'tiu'),

    -- Numerik Hitung Cepat (5)
    (_exam_id, 'Hasil dari 25% × 240 + 0,5 × 60 adalah...',
     '["60","70","80","90","100"]'::jsonb,
     '90', 'tiu'),
    (_exam_id, '15% dari 80 + 1/4 dari 40 = ?',
     '["18","20","22","24","26"]'::jsonb,
     '22', 'tiu'),
    (_exam_id, '(12 + 8) × 5 - 25 = ?',
     '["50","65","75","85","100"]'::jsonb,
     '75', 'tiu'),
    (_exam_id, '0,2 × 150 + 0,4 × 50 = ?',
     '["40","45","50","55","60"]'::jsonb,
     '50', 'tiu'),
    (_exam_id, '(3/4) × 200 - 50 = ?',
     '["50","75","100","125","150"]'::jsonb,
     '100', 'tiu'),

    -- Numerik Deret (5)
    (_exam_id, 'Lanjutan deret: 2, 6, 12, 20, 30, ...',
     '["40","42","44","46","48"]'::jsonb,
     '42', 'tiu'),
    (_exam_id, 'Lanjutan deret: 3, 6, 12, 24, ...',
     '["36","40","48","52","60"]'::jsonb,
     '48', 'tiu'),
    (_exam_id, 'Lanjutan deret: 1, 4, 9, 16, 25, ...',
     '["30","32","34","36","40"]'::jsonb,
     '36', 'tiu'),
    (_exam_id, 'Lanjutan deret: 100, 95, 85, 70, ...',
     '["55","50","45","40","35"]'::jsonb,
     '50', 'tiu'),
    (_exam_id, 'Lanjutan deret Fibonacci: 2, 3, 5, 8, 13, ...',
     '["18","19","20","21","22"]'::jsonb,
     '21', 'tiu'),

    -- Figural / Penalaran Spasial (5)
    (_exam_id, 'Sebuah kubus diberi nomor 1-6. Sisi 1 berhadapan sisi 6, sisi 2 berhadapan sisi 5. Sisi 3 berhadapan dengan sisi...',
     '["1","2","4","5","6"]'::jsonb,
     '4', 'tiu'),
    (_exam_id, 'Sebuah persegi dilipat menjadi dua, kemudian dilipat lagi tegak lurus. Berapa lapis kertas terbentuk?',
     '["2","3","4","6","8"]'::jsonb,
     '4', 'tiu'),
    (_exam_id, 'Jam menunjukkan pukul 3. Sudut yang dibentuk jarum jam dan menit adalah...',
     '["30°","45°","60°","90°","120°"]'::jsonb,
     '90°', 'tiu'),
    (_exam_id, 'Sebuah segitiga sama sisi dipotong menjadi dua oleh garis tinggi. Setiap potongan berbentuk...',
     '["Segitiga sama sisi","Segitiga siku-siku","Segitiga lancip","Trapesium","Persegi"]'::jsonb,
     'Segitiga siku-siku', 'tiu'),
    (_exam_id, 'Bayangan cermin huruf "b" akan terlihat seperti huruf...',
     '["b","p","q","d","g"]'::jsonb,
     'd', 'tiu');

  -- =====================================================================
  -- TKP (40): Pelayanan Publik, Jejaring Kerja, Sosial Budaya, Profesionalisme,
  -- Anti Radikalisme, TIK — option_points (1-5), tidak ada jawaban "salah".
  -- =====================================================================

  -- Pelayanan Publik (7)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Saat melayani warga yang marah karena antrean lama, sikap Anda...',
     '["Membentak balik agar tidak menyepelekan petugas","Mengabaikan dan terus melayani sesuai antrean","Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan","Memprioritaskan agar dia segera pergi","Menyuruh atasan menanganinya"]'::jsonb,
     'Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan', 'tkp',
     '{"Membentak balik agar tidak menyepelekan petugas":1,"Mengabaikan dan terus melayani sesuai antrean":2,"Menjelaskan prosedur sambil meminta maaf atas ketidaknyamanan":5,"Memprioritaskan agar dia segera pergi":3,"Menyuruh atasan menanganinya":4}'::jsonb),
    (_exam_id, 'Antrean panjang menumpuk dan loket bertambah lama. Anda akan...',
     '["Menutup loket sementara","Melayani sambil mengeluh ke rekan","Mengoordinasikan tambahan loket atau bantuan rekan","Menyuruh warga datang besok","Menyalahkan sistem"]'::jsonb,
     'Mengoordinasikan tambahan loket atau bantuan rekan', 'tkp',
     '{"Menutup loket sementara":1,"Melayani sambil mengeluh ke rekan":2,"Mengoordinasikan tambahan loket atau bantuan rekan":5,"Menyuruh warga datang besok":3,"Menyalahkan sistem":4}'::jsonb),
    (_exam_id, 'Warga bingung dengan prosedur dan dokumennya tidak lengkap. Anda...',
     '["Menyuruhnya pulang dan baca aturan","Menolak dengan tegas","Menjelaskan kekurangan dan langkah berikutnya secara jelas","Membantu mengisi sebagian saja","Mengarahkan ke loket lain"]'::jsonb,
     'Menjelaskan kekurangan dan langkah berikutnya secara jelas', 'tkp',
     '{"Menyuruhnya pulang dan baca aturan":1,"Menolak dengan tegas":2,"Menjelaskan kekurangan dan langkah berikutnya secara jelas":5,"Membantu mengisi sebagian saja":3,"Mengarahkan ke loket lain":4}'::jsonb),
    (_exam_id, 'Anda menerima keluhan via media sosial tentang layanan. Sikap terbaik...',
     '["Mengabaikan agar tidak ramai","Menghapus komentar","Menjawab profesional dan menindaklanjuti","Membalas dengan candaan","Menyerahkan sepenuhnya ke admin"]'::jsonb,
     'Menjawab profesional dan menindaklanjuti', 'tkp',
     '{"Mengabaikan agar tidak ramai":1,"Menghapus komentar":2,"Menjawab profesional dan menindaklanjuti":5,"Membalas dengan candaan":3,"Menyerahkan sepenuhnya ke admin":4}'::jsonb),
    (_exam_id, 'Warga lansia kesulitan mengisi formulir digital. Anda...',
     '["Memintanya mencari bantuan keluarga","Menyuruh kembali besok","Membantu mengisi sambil menjelaskan langkahnya","Mengisi semua tanpa konfirmasi","Memintanya menunggu giliran ulang"]'::jsonb,
     'Membantu mengisi sambil menjelaskan langkahnya', 'tkp',
     '{"Memintanya mencari bantuan keluarga":1,"Menyuruh kembali besok":2,"Membantu mengisi sambil menjelaskan langkahnya":5,"Mengisi semua tanpa konfirmasi":3,"Memintanya menunggu giliran ulang":4}'::jsonb),
    (_exam_id, 'Pelayanan yang Anda berikan dikritik kurang ramah. Anda...',
     '["Membantah karena merasa benar","Diam saja","Mengevaluasi diri dan memperbaiki cara berkomunikasi","Menyalahkan situasi","Menjauhi pekerjaan front-office"]'::jsonb,
     'Mengevaluasi diri dan memperbaiki cara berkomunikasi', 'tkp',
     '{"Membantah karena merasa benar":1,"Diam saja":2,"Mengevaluasi diri dan memperbaiki cara berkomunikasi":5,"Menyalahkan situasi":3,"Menjauhi pekerjaan front-office":4}'::jsonb),
    (_exam_id, 'Saat layanan offline ramai dan tamu penting datang, Anda...',
     '["Memprioritaskan tamu penting tanpa pemberitahuan","Mengabaikan tamu penting","Tetap mengikuti antrean dan memberikan informasi proses","Menutup layanan publik","Memindahkan layanan ke jam lain"]'::jsonb,
     'Tetap mengikuti antrean dan memberikan informasi proses', 'tkp',
     '{"Memprioritaskan tamu penting tanpa pemberitahuan":1,"Mengabaikan tamu penting":2,"Tetap mengikuti antrean dan memberikan informasi proses":5,"Menutup layanan publik":3,"Memindahkan layanan ke jam lain":4}'::jsonb);

  -- Jejaring Kerja (7)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Anda mendapat tugas yang membutuhkan kolaborasi dengan tim lain yang belum dikenal. Anda akan...',
     '["Bekerja sendiri agar tidak repot","Menunggu tim lain menghubungi terlebih dahulu","Memperkenalkan diri dan membangun komunikasi proaktif","Hanya berkomunikasi via email seperlunya","Meminta atasan menjadi penghubung utama"]'::jsonb,
     'Memperkenalkan diri dan membangun komunikasi proaktif', 'tkp',
     '{"Bekerja sendiri agar tidak repot":1,"Menunggu tim lain menghubungi terlebih dahulu":2,"Memperkenalkan diri dan membangun komunikasi proaktif":5,"Hanya berkomunikasi via email seperlunya":3,"Meminta atasan menjadi penghubung utama":4}'::jsonb),
    (_exam_id, 'Konflik kecil terjadi dengan rekan satu unit karena beda pendapat. Anda...',
     '["Menghindar agar tidak ribut","Menyalahkan rekan terbuka di depan tim","Mengajak diskusi terbuka mencari solusi","Mengabaikan dan tetap kerja sendiri","Mengeluh ke atasan tanpa membicarakan langsung"]'::jsonb,
     'Mengajak diskusi terbuka mencari solusi', 'tkp',
     '{"Menghindar agar tidak ribut":1,"Menyalahkan rekan terbuka di depan tim":2,"Mengajak diskusi terbuka mencari solusi":5,"Mengabaikan dan tetap kerja sendiri":3,"Mengeluh ke atasan tanpa membicarakan langsung":4}'::jsonb),
    (_exam_id, 'Tim lintas instansi belum responsif terhadap permintaan Anda. Sikap Anda...',
     '["Menyalahkan tim tersebut","Membatalkan kerjasama","Menelepon untuk klarifikasi dan menawarkan bantuan","Mengirim pesan keras","Mengganti tim partner sepihak"]'::jsonb,
     'Menelepon untuk klarifikasi dan menawarkan bantuan', 'tkp',
     '{"Menyalahkan tim tersebut":1,"Membatalkan kerjasama":2,"Menelepon untuk klarifikasi dan menawarkan bantuan":5,"Mengirim pesan keras":3,"Mengganti tim partner sepihak":4}'::jsonb),
    (_exam_id, 'Rekan baru bingung dengan alur kerja kantor. Anda...',
     '["Menyuruh tanya orang lain","Membiarkan dia belajar sendiri","Menjelaskan dan menemani sampai paham","Memberikan dokumen tanpa penjelasan","Menyalahkan HRD"]'::jsonb,
     'Menjelaskan dan menemani sampai paham', 'tkp',
     '{"Menyuruh tanya orang lain":1,"Membiarkan dia belajar sendiri":2,"Menjelaskan dan menemani sampai paham":5,"Memberikan dokumen tanpa penjelasan":3,"Menyalahkan HRD":4}'::jsonb),
    (_exam_id, 'Ide Anda di rapat berbeda dengan mayoritas. Anda...',
     '["Memaksakan ide Anda","Diam dan menyerah","Menyampaikan dengan argumen logis dan terbuka pada keputusan tim","Menulis sindiran di grup","Walkout dari rapat"]'::jsonb,
     'Menyampaikan dengan argumen logis dan terbuka pada keputusan tim', 'tkp',
     '{"Memaksakan ide Anda":1,"Diam dan menyerah":2,"Menyampaikan dengan argumen logis dan terbuka pada keputusan tim":5,"Menulis sindiran di grup":3,"Walkout dari rapat":4}'::jsonb),
    (_exam_id, 'Komunikasi grup kerja sering miskomunikasi. Anda...',
     '["Membiarkan saja","Keluar dari grup","Mengusulkan ringkasan harian dan aturan komunikasi","Mengeluh ke teman dekat","Menyalahkan ketua tim"]'::jsonb,
     'Mengusulkan ringkasan harian dan aturan komunikasi', 'tkp',
     '{"Membiarkan saja":1,"Keluar dari grup":2,"Mengusulkan ringkasan harian dan aturan komunikasi":5,"Mengeluh ke teman dekat":3,"Menyalahkan ketua tim":4}'::jsonb),
    (_exam_id, 'Mitra eksternal menunda kontribusinya. Anda...',
     '["Memutus komunikasi","Mengulang perintah dengan nada keras","Mengirim follow-up sopan dan klarifikasi kendala","Menggantikan pekerjaan mereka diam-diam","Mengeluh ke pimpinan"]'::jsonb,
     'Mengirim follow-up sopan dan klarifikasi kendala', 'tkp',
     '{"Memutus komunikasi":1,"Mengulang perintah dengan nada keras":2,"Mengirim follow-up sopan dan klarifikasi kendala":5,"Menggantikan pekerjaan mereka diam-diam":3,"Mengeluh ke pimpinan":4}'::jsonb);

  -- Sosial Budaya (6)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Ditugaskan ke daerah dengan budaya yang berbeda. Sikap Anda...',
     '["Memaksakan kebiasaan asal saya","Menjaga jarak agar tidak salah","Mempelajari dan menghormati adat setempat","Hanya berinteraksi dengan rekan satu daerah","Mengikuti hanya yang menguntungkan saya"]'::jsonb,
     'Mempelajari dan menghormati adat setempat', 'tkp',
     '{"Memaksakan kebiasaan asal saya":1,"Menjaga jarak agar tidak salah":2,"Mempelajari dan menghormati adat setempat":5,"Hanya berinteraksi dengan rekan satu daerah":3,"Mengikuti hanya yang menguntungkan saya":4}'::jsonb),
    (_exam_id, 'Rekan baru beragama berbeda mengundang Anda ke perayaan. Anda...',
     '["Menolak tegas","Datang sebentar lalu pergi","Datang dengan sikap menghormati","Hanya hadir jika diizinkan keluarga","Memberi alasan agar tidak datang"]'::jsonb,
     'Datang dengan sikap menghormati', 'tkp',
     '{"Menolak tegas":1,"Datang sebentar lalu pergi":2,"Datang dengan sikap menghormati":5,"Hanya hadir jika diizinkan keluarga":3,"Memberi alasan agar tidak datang":4}'::jsonb),
    (_exam_id, 'Anda harus presentasi ke audiens dengan bahasa daerah berbeda. Anda...',
     '["Memaksakan bahasa daerah Anda","Menggunakan istilah teknis tanpa terjemahan","Menggunakan Bahasa Indonesia jelas dan sederhana","Membaca slide cepat agar selesai","Menyuruh peserta membaca sendiri"]'::jsonb,
     'Menggunakan Bahasa Indonesia jelas dan sederhana', 'tkp',
     '{"Memaksakan bahasa daerah Anda":1,"Menggunakan istilah teknis tanpa terjemahan":2,"Menggunakan Bahasa Indonesia jelas dan sederhana":5,"Membaca slide cepat agar selesai":3,"Menyuruh peserta membaca sendiri":4}'::jsonb),
    (_exam_id, 'Tradisi lokal mengharuskan Anda menggunakan pakaian khusus saat acara. Anda...',
     '["Menolak karena bukan adat saya","Menggunakan asal jadi","Menggunakan pakaian yang sesuai sebagai bentuk hormat","Datang dengan pakaian biasa","Tidak datang ke acara"]'::jsonb,
     'Menggunakan pakaian yang sesuai sebagai bentuk hormat', 'tkp',
     '{"Menolak karena bukan adat saya":1,"Menggunakan asal jadi":2,"Menggunakan pakaian yang sesuai sebagai bentuk hormat":5,"Datang dengan pakaian biasa":3,"Tidak datang ke acara":4}'::jsonb),
    (_exam_id, 'Rekan kerja merayakan hari raya yang berbeda dengan Anda. Anda...',
     '["Mengabaikan saja","Memberi komentar negatif","Mengucapkan selamat dengan tulus","Menanyakan apakah ia perlu izin","Menjauh dari rekan tersebut"]'::jsonb,
     'Mengucapkan selamat dengan tulus', 'tkp',
     '{"Mengabaikan saja":1,"Memberi komentar negatif":2,"Mengucapkan selamat dengan tulus":5,"Menanyakan apakah ia perlu izin":3,"Menjauh dari rekan tersebut":4}'::jsonb),
    (_exam_id, 'Anda menemukan kebiasaan setempat yang menurut Anda kurang efisien. Anda...',
     '["Mengkritik di depan umum","Mengabaikan","Mempelajari konteks dan menyesuaikan diri","Memaksakan cara baru","Mengubah sepihak"]'::jsonb,
     'Mempelajari konteks dan menyesuaikan diri', 'tkp',
     '{"Mengkritik di depan umum":1,"Mengabaikan":2,"Mempelajari konteks dan menyesuaikan diri":5,"Memaksakan cara baru":3,"Mengubah sepihak":4}'::jsonb);

  -- Profesionalisme (7)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Atasan memberi tugas penting dengan deadline ketat. Anda akan...',
     '["Menolak karena terlalu berat","Mengerjakan asal jadi yang penting selesai","Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu","Meminta rekan mengerjakan sebagian besar","Mengerjakan sambil menunda tugas lain tanpa konfirmasi"]'::jsonb,
     'Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu', 'tkp',
     '{"Menolak karena terlalu berat":1,"Mengerjakan asal jadi yang penting selesai":2,"Membuat rencana kerja terstruktur dan menyelesaikan tepat waktu":5,"Meminta rekan mengerjakan sebagian besar":3,"Mengerjakan sambil menunda tugas lain tanpa konfirmasi":4}'::jsonb),
    (_exam_id, 'Anda menemukan kesalahan pada laporan yang sudah dikirim. Anda...',
     '["Mendiamkan agar tidak terlihat salah","Menunggu sampai ditegur","Segera mengoreksi dan memberi tahu pihak terkait","Menghapus arsipnya","Menyalahkan rekan"]'::jsonb,
     'Segera mengoreksi dan memberi tahu pihak terkait', 'tkp',
     '{"Mendiamkan agar tidak terlihat salah":1,"Menunggu sampai ditegur":2,"Segera mengoreksi dan memberi tahu pihak terkait":5,"Menghapus arsipnya":3,"Menyalahkan rekan":4}'::jsonb),
    (_exam_id, 'Ada potensi konflik kepentingan dengan keluarga di proyek kantor. Anda...',
     '["Tetap kerjakan agar tidak ribet","Mengambil keuntungan kecil","Melaporkan dan minta dikecualikan dari pengambilan keputusan","Meminta rekan menutupinya","Menyembunyikan informasi"]'::jsonb,
     'Melaporkan dan minta dikecualikan dari pengambilan keputusan', 'tkp',
     '{"Tetap kerjakan agar tidak ribet":1,"Mengambil keuntungan kecil":2,"Melaporkan dan minta dikecualikan dari pengambilan keputusan":5,"Meminta rekan menutupinya":3,"Menyembunyikan informasi":4}'::jsonb),
    (_exam_id, 'Vendor menawarkan hadiah pribadi setelah project. Anda...',
     '["Menerima karena sopan","Menerima diam-diam","Menolak halus sesuai kode etik","Meminta dalam bentuk lain","Menyimpannya tanpa lapor"]'::jsonb,
     'Menolak halus sesuai kode etik', 'tkp',
     '{"Menerima karena sopan":1,"Menerima diam-diam":2,"Menolak halus sesuai kode etik":5,"Meminta dalam bentuk lain":3,"Menyimpannya tanpa lapor":4}'::jsonb),
    (_exam_id, 'Atasan menyalahkan Anda untuk kesalahan rekan. Anda...',
     '["Membantah keras","Diam meski dirugikan","Menjelaskan duduk persoalan dengan data","Membalas menyalahkan rekan","Mengundurkan diri dari proyek"]'::jsonb,
     'Menjelaskan duduk persoalan dengan data', 'tkp',
     '{"Membantah keras":1,"Diam meski dirugikan":2,"Menjelaskan duduk persoalan dengan data":5,"Membalas menyalahkan rekan":3,"Mengundurkan diri dari proyek":4}'::jsonb),
    (_exam_id, 'Tugas mendesak datang di luar jam kerja. Anda...',
     '["Menolak total","Mengerjakan tanpa komunikasi","Menilai urgensi, mengkomunikasikan dampak, lalu menyepakati skema kerja","Menyerahkan ke orang lain diam-diam","Mengerjakan asal cepat"]'::jsonb,
     'Menilai urgensi, mengkomunikasikan dampak, lalu menyepakati skema kerja', 'tkp',
     '{"Menolak total":1,"Mengerjakan tanpa komunikasi":2,"Menilai urgensi, mengkomunikasikan dampak, lalu menyepakati skema kerja":5,"Menyerahkan ke orang lain diam-diam":3,"Mengerjakan asal cepat":4}'::jsonb),
    (_exam_id, 'Ketika hasil kerja Anda diapresiasi tim. Anda...',
     '["Klaim semua sebagai prestasi pribadi","Diam saja","Mengakui kontribusi tim dan mendiskusikan langkah lanjut","Mengubah laporan agar terlihat lebih besar","Pamer di media sosial"]'::jsonb,
     'Mengakui kontribusi tim dan mendiskusikan langkah lanjut', 'tkp',
     '{"Klaim semua sebagai prestasi pribadi":1,"Diam saja":2,"Mengakui kontribusi tim dan mendiskusikan langkah lanjut":5,"Mengubah laporan agar terlihat lebih besar":3,"Pamer di media sosial":4}'::jsonb);

  -- Anti Radikalisme (6)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Anda menerima pesan ajakan mengikuti gerakan yang menentang Pancasila. Sikap Anda...',
     '["Mengikuti karena penasaran","Mendiamkan saja","Menolak tegas dan melaporkan ke pihak berwenang","Mem-forward ke teman","Membaca isinya dulu baru memutuskan"]'::jsonb,
     'Menolak tegas dan melaporkan ke pihak berwenang', 'tkp',
     '{"Mengikuti karena penasaran":1,"Mendiamkan saja":2,"Menolak tegas dan melaporkan ke pihak berwenang":5,"Mem-forward ke teman":3,"Membaca isinya dulu baru memutuskan":4}'::jsonb),
    (_exam_id, 'Rekan menyebarkan informasi hoaks bermuatan kebencian. Anda...',
     '["Ikut menyebar","Mendiamkan","Mengingatkan dengan baik dan melapor jika berlanjut","Menertawakan","Menjauhinya tanpa komunikasi"]'::jsonb,
     'Mengingatkan dengan baik dan melapor jika berlanjut', 'tkp',
     '{"Ikut menyebar":1,"Mendiamkan":2,"Mengingatkan dengan baik dan melapor jika berlanjut":5,"Menertawakan":3,"Menjauhinya tanpa komunikasi":4}'::jsonb),
    (_exam_id, 'Anda menemukan konten radikal di komunitas online. Anda...',
     '["Bergabung diam-diam untuk tahu","Mengabaikan","Melaporkan ke platform dan otoritas terkait","Menjawab dengan emosi","Membaca tapi tidak peduli"]'::jsonb,
     'Melaporkan ke platform dan otoritas terkait', 'tkp',
     '{"Bergabung diam-diam untuk tahu":1,"Mengabaikan":2,"Melaporkan ke platform dan otoritas terkait":5,"Menjawab dengan emosi":3,"Membaca tapi tidak peduli":4}'::jsonb),
    (_exam_id, 'Diundang ke pertemuan terselubung yang menjelek-jelekkan negara. Anda...',
     '["Datang karena penasaran","Datang sebentar lalu pulang","Tidak datang dan melapor jika ada indikasi pidana","Datang lalu meneruskan ke teman","Menyetujui dalam diam"]'::jsonb,
     'Tidak datang dan melapor jika ada indikasi pidana', 'tkp',
     '{"Datang karena penasaran":1,"Datang sebentar lalu pulang":2,"Tidak datang dan melapor jika ada indikasi pidana":5,"Datang lalu meneruskan ke teman":3,"Menyetujui dalam diam":4}'::jsonb),
    (_exam_id, 'Kerabat dekat mulai terpapar paham radikal. Anda...',
     '["Memutus hubungan","Membiarkan saja","Mendekati dengan dialog dan melibatkan ahli/keluarga","Memarahi habis-habisan","Mendiamkan agar tidak konflik"]'::jsonb,
     'Mendekati dengan dialog dan melibatkan ahli/keluarga', 'tkp',
     '{"Memutus hubungan":1,"Membiarkan saja":2,"Mendekati dengan dialog dan melibatkan ahli/keluarga":5,"Memarahi habis-habisan":3,"Mendiamkan agar tidak konflik":4}'::jsonb),
    (_exam_id, 'Saat melihat unjuk rasa anarkis di lingkungan kerja, Anda...',
     '["Bergabung agar tidak mencolok","Merekam tanpa konteks dan menyebarkan","Menjaga keselamatan diri/rekan dan melapor ke aparat","Memprovokasi balik","Pulang lebih awal tanpa lapor"]'::jsonb,
     'Menjaga keselamatan diri/rekan dan melapor ke aparat', 'tkp',
     '{"Bergabung agar tidak mencolok":1,"Merekam tanpa konteks dan menyebarkan":2,"Menjaga keselamatan diri/rekan dan melapor ke aparat":5,"Memprovokasi balik":3,"Pulang lebih awal tanpa lapor":4}'::jsonb);

  -- TIK (7)
  INSERT INTO public.questions (exam_id, question_text, options, correct_answer, subtest, option_points) VALUES
    (_exam_id, 'Aplikasi kerja eror dan memperlambat pekerjaan. Anda akan...',
     '["Membiarkan dan mengeluh ke rekan","Berhenti bekerja sampai diperbaiki","Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat","Mencari tutorial seadanya tanpa lapor","Mencoba instal aplikasi alternatif tanpa izin"]'::jsonb,
     'Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat', 'tkp',
     '{"Membiarkan dan mengeluh ke rekan":1,"Berhenti bekerja sampai diperbaiki":2,"Mendokumentasikan masalah dan melapor ke tim IT untuk solusi cepat":5,"Mencari tutorial seadanya tanpa lapor":3,"Mencoba instal aplikasi alternatif tanpa izin":4}'::jsonb),
    (_exam_id, 'Email mencurigakan meminta password Anda. Anda...',
     '["Membalas dengan password","Mengabaikan","Tidak mengeklik tautan dan melapor ke tim IT/keamanan","Membuka tautan untuk memeriksa","Meneruskan ke rekan agar diperiksa"]'::jsonb,
     'Tidak mengeklik tautan dan melapor ke tim IT/keamanan', 'tkp',
     '{"Membalas dengan password":1,"Mengabaikan":2,"Tidak mengeklik tautan dan melapor ke tim IT/keamanan":5,"Membuka tautan untuk memeriksa":3,"Meneruskan ke rekan agar diperiksa":4}'::jsonb),
    (_exam_id, 'Data penting belum dibackup dan jaringan tidak stabil. Anda...',
     '["Lanjut bekerja seperti biasa","Tunggu sampai jaringan stabil tanpa rencana","Backup ke media lokal dan cloud sesuai SOP","Backup sebagian saja","Menyalahkan tim infrastruktur"]'::jsonb,
     'Backup ke media lokal dan cloud sesuai SOP', 'tkp',
     '{"Lanjut bekerja seperti biasa":1,"Tunggu sampai jaringan stabil tanpa rencana":2,"Backup ke media lokal dan cloud sesuai SOP":5,"Backup sebagian saja":3,"Menyalahkan tim infrastruktur":4}'::jsonb),
    (_exam_id, 'Anda diminta menggunakan aplikasi baru yang belum dikuasai. Anda...',
     '["Menolak menggunakan","Memakai dengan asumsi sendiri","Mengikuti pelatihan/tutorial dan praktik bertahap","Menyuruh rekan mengerjakan","Menunggu instruksi tanpa belajar"]'::jsonb,
     'Mengikuti pelatihan/tutorial dan praktik bertahap', 'tkp',
     '{"Menolak menggunakan":1,"Memakai dengan asumsi sendiri":2,"Mengikuti pelatihan/tutorial dan praktik bertahap":5,"Menyuruh rekan mengerjakan":3,"Menunggu instruksi tanpa belajar":4}'::jsonb),
    (_exam_id, 'Update sistem mengganggu workflow harian Anda. Anda...',
     '["Membatalkan update","Marah ke tim IT","Mempelajari catatan rilis dan menyesuaikan workflow","Mengabaikan update","Menggunakan akun pribadi untuk bypass"]'::jsonb,
     'Mempelajari catatan rilis dan menyesuaikan workflow', 'tkp',
     '{"Membatalkan update":1,"Marah ke tim IT":2,"Mempelajari catatan rilis dan menyesuaikan workflow":5,"Mengabaikan update":3,"Menggunakan akun pribadi untuk bypass":4}'::jsonb),
    (_exam_id, 'Rekan meminta password sistem demi efisiensi sementara. Anda...',
     '["Memberikan agar tidak repot","Memberikan dengan janji rahasia","Menolak dan mengarahkan permintaan via SOP/admin","Memberikan sebagian saja","Mengirim via grup chat"]'::jsonb,
     'Menolak dan mengarahkan permintaan via SOP/admin', 'tkp',
     '{"Memberikan agar tidak repot":1,"Memberikan dengan janji rahasia":2,"Menolak dan mengarahkan permintaan via SOP/admin":5,"Memberikan sebagian saja":3,"Mengirim via grup chat":4}'::jsonb),
    (_exam_id, 'Anda menemukan kebocoran data internal di forum publik. Anda...',
     '["Mengabaikan","Menyebar lagi agar viral","Melaporkan ke tim keamanan dan menjaga rahasia","Membahas di grup teman","Menghapus jejak diam-diam"]'::jsonb,
     'Melaporkan ke tim keamanan dan menjaga rahasia', 'tkp',
     '{"Mengabaikan":1,"Menyebar lagi agar viral":2,"Melaporkan ke tim keamanan dan menjaga rahasia":5,"Membahas di grup teman":3,"Menghapus jejak diam-diam":4}'::jsonb);
END;
$f$;

-- 5) Apply seed ke 4 paket non-mini (Premium dan Bundling, untuk CPNS dan PPPK)
SELECT public._seed_skd_full('a1111111-0000-0000-0000-000000000002');
SELECT public._seed_skd_full('a1111111-0000-0000-0000-000000000003');
SELECT public._seed_skd_full('b2222222-0000-0000-0000-000000000002');
SELECT public._seed_skd_full('b2222222-0000-0000-0000-000000000003');

-- 6) Sinkronkan total_questions agar match jumlah soal sebenarnya
UPDATE public.exams e
SET total_questions = (SELECT COUNT(*) FROM public.questions q WHERE q.exam_id = e.id)
WHERE e.id IN (
  'a1111111-0000-0000-0000-000000000002',
  'a1111111-0000-0000-0000-000000000003',
  'b2222222-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000003'
);

-- 7) Update deskripsi paket Bundling supaya konsisten dengan model 5x akses tryout
UPDATE public.exams SET description =
  'Bundling 5x akses tryout: 100 soal SKD per akses (TWK + TIU + TKP). Sekali bayar, lima kali kerjakan.'
WHERE id IN (
  'a1111111-0000-0000-0000-000000000003',
  'b2222222-0000-0000-0000-000000000003'
);

UPDATE public.exams SET description =
  'Try out SKD 100 soal mencakup seluruh subtes TWK, TIU, dan TKP sesuai kisi-kisi BKN.'
WHERE id IN (
  'a1111111-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000002'
);

DROP FUNCTION public._seed_skd_full(uuid);
