# CLAUDE.md — Ruang CASN (tryout-asn)

## Project
Platform tryout online untuk ujian ASN (CPNS & PPPK). User beli paket soal, kerjakan exam, lihat leaderboard. Ada panel admin dengan fitur generate soal via AI.

## Tech Stack
- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives) — `src/components/ui/`
- React Router v6, TanStack Query, react-hook-form + zod
- Supabase (auth + Postgres) — client di `src/integrations/supabase/`
- Vitest + Testing Library
- Deploy: Vercel

## Supabase
- **Project:** `equfmmkjtedbhyfypxwg` (supabase.co milik sendiri, bukan Lovable)
- **URL:** `https://equfmmkjtedbhyfypxwg.supabase.co`
- **Client:** `src/integrations/supabase/client.ts`
- **Admin email:** `deskomviscom@gmail.com`

## Routing
- Public: `/`, `/auth`
- Protected: `/dashboard`, `/beli-paket`, `/paket-saya`, `/try-out-akbar`, `/akun-saya`, `/topup`, `/exam/:examId`, `/leaderboard`
- Admin-only: `/admin`

## Auth Pattern
- `AuthProvider` di `src/hooks/useAuth`
- Route protection via `<ProtectedRoute adminOnly>`
- Login: username atau email + password
- Daftar: username, email, nomor HP, password (no nama lengkap)
- Admin role ditentukan via tabel `user_roles` (role = `'admin'`)

## Struktur
```
src/
├── App.tsx                  # Router + providers
├── pages/                   # 12 halaman
├── components/
│   ├── AppHeader/Layout/Sidebar.tsx
│   ├── ProtectedRoute.tsx
│   ├── landing/             # Sections landing page
│   └── ui/                  # shadcn primitives
├── hooks/                   # useAuth
├── integrations/supabase/   # Client + generated types
└── lib/
supabase/
├── migrations/              # 14 migrations (per 2026-05-07)
└── functions/
    └── generate-questions/  # Edge function: generate soal SKD via Claude AI
```

## Paket SKD
6 paket seeded dengan UUID fixed:
- `a1111111-...-0001` SKD CPNS Mini (gratis)
- `a1111111-...-0002` SKD CPNS Premium (Rp25k, 100 soal)
- `a1111111-...-0003` Bundling SKD CPNS 5x (Rp99k)
- `b2222222-...-0001` SKD PPPK Mini (gratis)
- `b2222222-...-0002` SKD PPPK Premium (Rp25k, 100 soal)
- `b2222222-...-0003` Bundling SKD PPPK 5x (Rp99k)

Bundling: `bundle_size` field pada `exams`, fungsi `purchase_exam` membuat N baris `exam_purchases`.

## Generate Soal via AI (Admin)
Edge function `generate-questions` dipanggil dari `/admin` tab Manajemen Soal:
- Input: `exam_id`, `subtest` (twk/tiu/tkp), `topic`, `count`
- Claude `claude-opus-4-7` generate JSONL → di-parse → insert ke `questions`
- TWK/TIU: MCQ dengan `correct_answer`; TKP: situasional dengan `option_points` 1–5
- Butuh secret `ANTHROPIC_API_KEY` di Supabase Edge Function secrets

## Database — Tabel Utama
| Tabel | Keterangan |
|---|---|
| `profiles` | id, full_name, email, username, phone, avatar_url |
| `user_roles` | user_id, role (app_role enum: user/admin) |
| `exams` | title, duration, total_questions, price, bundle_size, category, subcategory, exam_type |
| `questions` | exam_id, question_text, options (jsonb), correct_answer, subtest, option_points (jsonb, TKP) |
| `exam_purchases` | user_id, exam_id |
| `user_scores` | user_id, exam_id, score, completed_at |
| `user_balances` | user_id, balance |
| `topup_requests` | user_id, amount, status (pending/approved/rejected) |

## RLS Penting
- `has_role()` → SECURITY DEFINER, harus di-GRANT ke `anon` dan `authenticated`
- Policy admin pada tabel harus `TO authenticated` (bukan FOR ALL tanpa role)
- `get_exam_questions(uuid)` → hanya `authenticated`

## Scripts
- `bun dev` — Vite dev server
- `bun run build` — production build
- `bun run test` — vitest one-shot

## Penting
- ⚠️ `BACKEND_PROMPT.md` berisi credentials — jangan expose ke publik
- Path alias: `@/` → `src/`
- Selalu commit + push ke `origin/main` setelah setiap task selesai
