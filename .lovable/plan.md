## Update Pricing, Testimonials & Categories

### 1. Pricing (`src/components/landing/Pricing.tsx`)
Replace the 3-tier package with 2 packages matching the reference:
- **Tryout CAT** — Mulai Rp99.000 (popular): Latihan Soal CAT, Hasil & Pembahasan, Berlatih Manajemen Waktu, Akses Belajar Fleksibel, Tampilan Simpel, Akses Smartphone/Laptop/Komputer, Full Akses 6 Bulan.
- **Ebook Soal PDF** — Mulai Rp129.000: Latihan Soal CAT, Hasil & Pembahasan, Akses multi-device, Full Akses 6 Bulan, PDF Bisa di Print, Soal UPDATE & HOTS, Bisa di Download.
- Layout: 2-column grid, badge-style title, "Pesan Layanan" button → WhatsApp.
- Heading copy: "Pilih Paket Terbaik Untuk Anda".

### 2. Testimonials (`src/components/landing/Testimonials.tsx`)
Re-target audience from siswa → orang dewasa / pelamar kerja. Heading: **"Dipercaya Ribuan Orang"**. Replace 3 dummies with alumni-lulus stories:
- **Rina Marlina** — Lulus CPNS Kemenkeu 2025: "Soal-soalnya 80% mirip ujian asli. Saya passing grade di percobaan pertama!"
- **Ahmad Fauzi** — Lulus PPPK Guru 2025: "Latihan CAT-nya bikin saya nggak grogi pas ujian beneran. Worth every rupiah."
- **Siti Nurhaliza** — Lulus BUMN Pertamina 2025: "Pembahasannya detail. Dari yang awalnya pesimis, sekarang sudah jadi pegawai BUMN."
- Optional 4th: **Dedi Kurniawan** — Lulus Sekolah Kedinasan STAN 2024.

### 3. Categories (`src/components/landing/Categories.tsx`)
Remove the **Telegram** category card from the grid.

### 4. Hero copy (`src/components/landing/Hero.tsx`)
Adjust trust indicator to "10.000+ Alumni Lulus" (from "Peserta Lulus") to reinforce adult/professional audience.

### Technical Notes
- All edits use existing semantic tokens (no new colors).
- WhatsApp link template updated to: `Halo Admin, saya ingin memesan layanan {paket}.`
- No new dependencies.
