## Goal

Selesaikan refactor visual: grid kategori 4×2 (sudah), palet putih–abu–biru WCAG AA, layout simetris responsif, dan animasi framer-motion yang halus di seluruh halaman.

## Sudah dikerjakan
- Install `framer-motion`.
- Naikkan kontras `--muted-foreground` & `--accent-foreground` agar lolos WCAG AA.
- `Categories.tsx`: grid 4 kolom × 2 baris, animasi stagger fade-up.
- `Hero.tsx`: import motion (animasi belum dipasang).

## Yang akan diselesaikan

### 1. Animasi & polish landing
- `Hero.tsx`: stagger fade-in pada badge, heading, paragraf, CTA, trust indicators; gambar slide-in dari kanan dengan `whileInView`.
- `Features.tsx`: ubah grid jadi `sm:grid-cols-2 lg:grid-cols-4` (sudah simetris), tambahkan motion stagger + hover lift.
- `AvailablePaket.tsx`, `Pricing.tsx`, `Testimonials.tsx`, `CtaBanner.tsx`: bungkus kartu dengan `motion.div` (`initial opacity 0 y 20` → `whileInView`), grid simetris (`md:grid-cols-2`/`lg:grid-cols-3`), pastikan padding container konsisten.
- `Navbar.tsx`: pastikan menu mobile rapi, tombol focus ring biru (a11y).

### 2. WCAG & palet
- Pastikan semua teks abu memakai `text-muted-foreground` baru (kontras ≥ 4.5:1 di atas putih/abu muda).
- Tambahkan `focus-visible:ring-2 ring-primary` pada link/tombol custom yang belum punya.
- Gunakan token `bg-background`, `bg-secondary/40`, `bg-card`, `text-foreground`, `text-primary` — tanpa warna hex langsung.
- Tambahkan `aria-hidden` pada ikon dekoratif, `aria-label` pada tombol ikon (WhatsApp button, dll).

### 3. Dashboard & app pages
- `Dashboard.tsx`:
  - Kartu statistik: animasi stagger fade-up, hover lift, gradient halus di ikon.
  - Grid tryout: `sm:grid-cols-2 lg:grid-cols-3`, kartu motion + `transition-shadow`.
  - Heading & subjudul kontras tinggi.
- `Admin.tsx`: rapikan tabs, tabel responsif (wrap di `overflow-x-auto`), tombol & input full width di mobile.
- `Exam.tsx` & `Leaderboard.tsx`: container `max-w-3xl mx-auto`, padding mobile, animasi fade-in pada perubahan soal.
- `AppHeader.tsx`: pastikan navigasi simetris & menu mobile (drawer/sheet sederhana bila perlu).

### 4. Responsif
- Semua section: `py-16 md:py-24`, `container` (sudah punya padding 2rem).
- Grid breakpoint konsisten: 1 kol mobile → 2 kol tablet → 3/4 kol desktop.
- Cek viewport 375px, 768px, 1280px setelah perubahan.

### 5. Helper kecil
- Tambahkan utility `motion-safe` agar animasi dimatikan untuk `prefers-reduced-motion` (gunakan opsi default framer-motion `useReducedMotion` di hero).

## Catatan teknis
- Tidak menambah dependency baru selain `framer-motion`.
- Tidak mengubah skema database / Supabase.
- Tidak mengubah `client.ts`, `types.ts`, `.env`.
- Pola animasi reusable: `initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.4, delay:i*0.07}}`.
