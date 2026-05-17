# AGENTS.md — Ruang CASN (tryout-asn)

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
    └── generate-questions/  # Edge function: generate soal SKD via Codex AI
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
Edge function `generate-questions` (Deno runtime) dipanggil dari `/admin`:
- **API:** KIE API dengan Codex Sonnet 4.6 (`https://api.kie.ai/Codex/v1/messages`)
- **Input:** `exam_id`, `subtest` (twk/tiu/tkp), `topic`, `count`
- **Output:** JSONL dengan soal berisi `question_text`, `options`, `correct_answer`, `explanation`
- **Tipe soal:**
  - TWK/TIU: MCQ dengan `correct_answer` (jawaban benar = 5 poin)
  - TKP: Situasional dengan `option_points` 1–5 (skala sikap ASN)
- **Pembahasan:** Setiap soal punya `explanation` singkat (2-3 kalimat)
- **Difficulty:** Disesuaikan standar CPNS dan PPPK Indonesia
- **Config:** Butuh secret `KIE_API_KEY` di Supabase Edge Function secrets
  - Generate di https://kie.ai/api-key (KIE AI provider)

## Database — Tabel Utama
| Tabel | Keterangan |
|---|---|
| `profiles` | id, email, username, phone, avatar_url |
| `user_roles` | user_id, role (app_role enum: user/admin) |
| `exams` | title, duration, total_questions, price, bundle_size, category, subcategory, exam_type |
| `questions` | exam_id, question_text, options (jsonb), correct_answer, subtest, option_points (jsonb, TKP), **explanation** |
| `exam_results` | user_id, exam_id, total_score, twk_score, tiu_score, tkp_score, time_spent, answered_count |
| `exam_purchases` | user_id, exam_id |
| `user_scores` | user_id, exam_id, score, time_spent, score_breakdown (jsonb) |
| `user_balances` | user_id, balance |
| `topup_requests` | user_id, amount, status (pending/approved/rejected) |

## RLS Penting
- `has_role()` → SECURITY DEFINER, harus di-GRANT ke `anon` dan `authenticated`
- Policy admin pada tabel harus `TO authenticated` (bukan FOR ALL tanpa role)
- `get_exam_questions(uuid)` → hanya `authenticated`

## Exam Flow & Results
1. **Exam Page** (`/exam/:examId`)
   - Timer countdown dengan absolute end time (tidak terpengaruh browser throttle)
   - Question navigator grid dengan status answered/unanswered
   - Subtest category label (TWK/TIU/TKP)
   - Report button untuk laporkan soal

2. **Results Page** (`/exam-results/:examId`)
   - Pass/fail alert banner dengan scoring
   - Score cards: Total, TWK, TIU, TKP
   - Data tryout: waktu pengerjaan, soal terjawab/tidak terjawab
   - **Pembahasan:** Expandable review setiap soal dengan:
     - Pertanyaan lengkap + pilihan jawaban
     - Visual feedback: jawaban user (biru), jawaban benar (hijau)
     - Penjelasan singkat mengapa jawaban benar
     - Status: benar/salah/tidak dijawab

3. **Answer Tracking**
   - Answers disimpan ke localStorage (`exam-answers-${examId}`)
   - Diakses di results page untuk menampilkan review
   - Clearing pada tab close atau logout

## Scripts
- `bun dev` — Vite dev server
- `bun run build` — production build
- `bun run test` — vitest one-shot

## Penting
- ⚠️ `BACKEND_PROMPT.md` berisi credentials — jangan expose ke publik
- Path alias: `@/` → `src/`
- Selalu commit + push ke `origin/main` setelah setiap task selesai
- KIE_API_KEY diperlukan di Supabase secrets untuk generate soal
