import { BarChart2, LineChart, PieChart, Sparkles, Table2 } from "lucide-react";

export type ChartType = "none" | "bar" | "line" | "pie" | "table";

export const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "none", label: "Teks Saja", icon: Sparkles, desc: "Soal pilihan ganda biasa" },
  { value: "bar", label: "Bar Chart", icon: BarChart2, desc: "Grafik batang — data perbandingan" },
  { value: "line", label: "Line Chart", icon: LineChart, desc: "Grafik garis — data tren/pertumbuhan" },
  { value: "pie", label: "Pie Chart", icon: PieChart, desc: "Grafik lingkaran — distribusi/proporsi" },
  { value: "table", label: "Tabel Data", icon: Table2, desc: "Tabel data numerik terstruktur" },
];

export const TOPIC_OPTIONS: Record<string, { value: string; label: string; count?: number }[]> = {
  twk: [
    { value: "nasionalisme", label: "Nasionalisme", count: 6 },
    { value: "bela_negara", label: "Bela Negara", count: 6 },
    { value: "integritas", label: "Integritas", count: 6 },
    { value: "pilar_negara", label: "Pilar Negara", count: 6 },
    { value: "bahasa", label: "Bahasa Indonesia", count: 6 },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  tiu: [
    { value: "analogi", label: "Analogi", count: 3 },
    { value: "silogisme", label: "Silogisme", count: 3 },
    { value: "analitis", label: "Penalaran Analitis", count: 4 },
    { value: "hitung", label: "Hitung Cepat", count: 4 },
    { value: "deret", label: "Deret Angka", count: 4 },
    { value: "kuantitatif", label: "Perbandingan Kuantitatif", count: 4 },
    { value: "cerita", label: "Soal Cerita", count: 3 },
    { value: "figural_analogi", label: "Analogi Gambar", count: 3 },
    { value: "figural_ketidaksamaan", label: "Ketidaksamaan Gambar", count: 3 },
    { value: "figural_serial", label: "Serial Gambar", count: 4 },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  tkp: [
    { value: "pelayanan", label: "Pelayanan Publik", count: 8 },
    { value: "profesionalisme", label: "Profesionalisme", count: 8 },
    { value: "jejaring", label: "Jejaring Kerja", count: 8 },
    { value: "sosial", label: "Sosial Budaya", count: 7 },
    { value: "tik", label: "TIK", count: 7 },
    { value: "antiradikalisme", label: "Anti Radikalisme", count: 7 },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  // Koperasi Desa Merah Putih
  ekonomi: [
    { value: "prinsip_koperasi", label: "Prinsip & Nilai Koperasi" },
    { value: "akuntansi_koperasi", label: "Akuntansi Koperasi" },
    { value: "keuangan_koperasi", label: "Keuangan & Permodalan Koperasi" },
    { value: "usaha_koperasi", label: "Pengembangan Usaha Koperasi" },
    { value: "ekonomi_mikro", label: "Ekonomi Mikro & Makro" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  manajemen: [
    { value: "organisasi_koperasi", label: "Struktur Organisasi Koperasi" },
    { value: "sdm_koperasi", label: "Manajemen SDM Koperasi" },
    { value: "kepemimpinan", label: "Kepemimpinan & Tata Kelola" },
    { value: "perencanaan", label: "Perencanaan Strategis" },
    { value: "operasional", label: "Manajemen Operasional" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  hukum: [
    { value: "uu_koperasi", label: "UU No. 25/1992 tentang Koperasi" },
    { value: "regulasi_kopdes", label: "Regulasi Kopdes Merah Putih 2025" },
    { value: "hukum_perdata", label: "Hukum Perdata & Kontrak" },
    { value: "hukum_administrasi", label: "Hukum Administrasi Negara" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  // Sekolah Kedinasan (SKB)
  skb: [
    { value: "keuangan_negara", label: "Keuangan Negara (STAN/PKN)" },
    { value: "pemerintahan_daerah", label: "Pemerintahan Daerah (IPDN)" },
    { value: "statistik", label: "Statistik & Metodologi (STIS)" },
    { value: "intelijen", label: "Intelijen Negara (STIN)" },
    { value: "pemasyarakatan", label: "Pemasyarakatan (POLTEKIP)" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
};

/** Subtest options per exam category */
export const SUBTEST_OPTIONS: Record<string, { value: string; label: string }[]> = {
  default: [
    { value: "twk", label: "TWK — Wawasan Kebangsaan" },
    { value: "tiu", label: "TIU — Intelegensia Umum" },
    { value: "tkp", label: "TKP — Karakteristik Pribadi" },
  ],
  koperasi: [
    { value: "ekonomi", label: "Ekonomi Koperasi" },
    { value: "manajemen", label: "Manajemen Koperasi" },
    { value: "hukum", label: "Hukum Koperasi" },
  ],
  kedinasan: [
    { value: "twk", label: "TWK — Wawasan Kebangsaan" },
    { value: "tiu", label: "TIU — Intelegensia Umum" },
    { value: "skb", label: "SKB — Seleksi Kompetensi Bidang" },
  ],
};

export type Exam = {
  id: string; title: string; total_questions: number;
  description?: string; duration: number; price: number; original_price?: number;
  bundle_size: number; category: string; subcategory: string; exam_type?: string;
  passing_score?: number; cta_link?: string | null; cover_image_url?: string | null;
  bonus_title?: string | null; bonus_description?: string | null; bonus_link?: string | null;
  parent_exam_id?: string | null;
};

export type Question = {
  id: string; exam_id: string | null; question_text: string; options: string[];
  correct_answer: string; subtest: string; option_points: Record<string, number> | null;
  explanation?: string; image_url?: string | null; svg_content?: string | null; topic?: string | null;
  source?: string | null;
};

export type BankQuestion = {
  id: string; exam_id: string | null; question_text: string; subtest: string; topic?: string | null;
};

export type Score = {
  id: string; score: number; completed_at: string;
  profiles: { username: string | null; email: string | null } | null;
  exams: { title: string } | null;
};

export type Topup = {
  id: string; user_id: string; amount: number; status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { username: string | null; email: string | null } | null;
};

export type UserBalance = {
  user_id: string; balance: number;
  profiles: { username: string | null; email: string | null } | null;
};

export type Purchase = {
  id: string; created_at: string; user_id: string; exam_id: string;
  profiles: { username: string | null; email: string | null } | null;
  exams: { title: string } | null;
};

export type Material = {
  id: string; title: string; description?: string | null; file_name?: string | null;
  category: string; topic?: string | null; extracted_text: string; char_count?: number | null;
  created_at: string;
};

export type MatQueueItem = {
  id: string;
  file: File;
  status: "extracting" | "ready" | "error";
  text: string;
  title: string;
  category: string;
  topic: string;
  errorMsg?: string;
};

export type ChunkStatus = {
  index: number;
  charCount: number;
  status: "idle" | "processing" | "done" | "error";
  count: number;
  svgCount?: number;
  errorMsg?: string;
};

export type LynkPackage = {
  id: string; lynk_uuid: string; exam_id: string | null; title: string;
  is_active: boolean; description?: string | null;
  notification_title?: string | null; notification_message?: string | null;
  exams?: { title: string } | null;
};

export type EditQ = {
  id: string; question_text: string; a: string; b: string; c: string; d: string; e: string;
  correct: string; subtest: string; pa: number; pb: number; pc: number; pd: number; pe: number;
  explanation: string; image_url: string; topic: string;
};

export type GlobalBankQ = {
  id: string; question_text: string; subtest: string; topic?: string | null;
  source?: string | null; exam_id: string | null; assign_count: number;
  options: string[];
  correct_answer: string;
  explanation?: string | null;
  image_url?: string | null;
  svg_content?: string | null;
  option_points?: Record<string, number> | null;
};

export const emptyNewQ = () => ({
  question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "", subtest: "tiu" as const,
  pa: 5, pb: 4, pc: 3, pd: 2, pe: 1, explanation: "", image_url: "", topic: "",
});

export const VALID_TABS = ["bank", "exams", "scores", "topups", "balances", "settings", "akbar"] as const;
export const BANK_VIEWS = ["list", "materi", "exam"] as const;
