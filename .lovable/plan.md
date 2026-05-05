## Landing Page — Tryout Online Platform

A clean, professional blue-themed landing page built with Shadcn/UI components, based on the PRD.

### Sections

1. **Navbar (sticky)**
   - Logo "TryoutPro" (left)
   - Nav links: Beranda, Paket, Testimoni, Kontak
   - CTA buttons: "Masuk" (ghost) + "Daftar Gratis" (primary blue)
   - Mobile: hamburger menu (Sheet)

2. **Hero Section**
   - Headline: "Persiapan Ujian Lebih Mudah dengan Tryout Online"
   - Subheadline explaining the platform value (latihan soal, simulasi ujian real-time, ranking nasional)
   - Primary CTA: "Mulai Tryout" → scrolls to pricing
   - Secondary CTA: "Lihat Paket"
   - Trust indicators row (e.g., 10,000+ siswa, 500+ soal, 50+ paket)
   - Hero illustration/mockup placeholder on the right

3. **Features Section** (3–4 cards)
   - Timer Otomatis (countdown sync)
   - Bank Soal Lengkap
   - Leaderboard Real-time
   - Statistik Skor Pribadi

4. **Pricing Table — Tryout Packages** (3 tiers)
   - **Paket Basic** — Rp 49.000: 5 tryout, durasi 90 menit, pembahasan
   - **Paket Premium** (highlighted/popular) — Rp 99.000: 15 tryout, leaderboard, video pembahasan
   - **Paket Ultimate** — Rp 199.000: tryout unlimited, mentoring, garansi
   - Each card: title, price, feature list with check icons, "Beli Paket" button → WhatsApp redirect with pre-filled message per PRD

5. **Testimonials Section**
   - 3 testimonial cards with avatar, name, role, quote, star rating

6. **CTA Banner**
   - "Siap memulai persiapan ujianmu?" with "Daftar Sekarang" button

7. **Footer**
   - Logo + tagline, link columns (Produk, Perusahaan, Bantuan), social icons, copyright

8. **Floating WhatsApp Button** (bottom-right, persistent)
   - Per PRD widget chat requirement

### Design System

- Blue primary theme. Update `src/index.css` HSL tokens:
  - `--primary`: deep blue (e.g., 217 91% 50%)
  - `--accent`: light blue tint
  - Clean white background, slate foreground
- Subtle gradient on hero (blue-50 → white)
- Generous spacing, rounded-xl cards, soft shadows
- Inter-style typography, semibold headings

### Technical Notes

- Single-page route updates `src/pages/Index.tsx`
- New components in `src/components/landing/`: `Navbar`, `Hero`, `Features`, `Pricing`, `Testimonials`, `CtaBanner`, `Footer`, `WhatsAppButton`
- Pricing "Beli" button opens `https://wa.me/<ADMIN_NUMBER>?text=...` with the PRD's exact message template (admin number set as a constant placeholder)
- Use existing Shadcn `Button`, `Card`, `Badge`, `Sheet`, `Avatar` components
- Smooth scroll for in-page anchor nav
- Fully responsive (mobile-first)
- Auth, dashboard, exam logic, and Supabase integration are out of scope for this task (landing page only)
