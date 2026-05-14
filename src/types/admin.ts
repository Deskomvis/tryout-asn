import { BarChart2, LineChart, PieChart, Sparkles, Table2 } from "lucide-react";

export type ChartType = "none" | "bar" | "line" | "pie" | "table";

export const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "none", label: "Teks Saja", icon: Sparkles, desc: "Soal pilihan ganda biasa" },
  { value: "bar", label: "Bar Chart", icon: BarChart2, desc: "Grafik batang — data perbandingan" },
  { value: "line", label: "Line Chart", icon: LineChart, desc: "Grafik garis — data tren/pertumbuhan" },
  { value: "pie", label: "Pie Chart", icon: PieChart, desc: "Grafik lingkaran — distribusi/proporsi" },
  { value: "table", label: "Tabel Data", icon: Table2, desc: "Tabel data numerik terstruktur" },
];

export const TOPIC_OPTIONS = {
  twk: [
    { value: "nasionalisme", label: "Nasionalisme" },
    { value: "bela_negara", label: "Bela Negara" },
    { value: "integritas", label: "Integritas" },
    { value: "pilar_negara", label: "Pilar Negara" },
    { value: "bahasa", label: "Bahasa Indonesia" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  tiu: [
    { value: "analogi", label: "Analogi" },
    { value: "silogisme", label: "Silogisme" },
    { value: "analitis", label: "Penalaran Analitis" },
    { value: "hitung", label: "Hitung Cepat" },
    { value: "deret", label: "Deret Angka" },
    { value: "kuantitatif", label: "Perbandingan Kuantitatif" },
    { value: "cerita", label: "Soal Cerita" },
    { value: "figural_analogi", label: "Analogi Gambar" },
    { value: "figural_ketidaksamaan", label: "Ketidaksamaan Gambar" },
    { value: "figural_serial", label: "Serial Gambar" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
  tkp: [
    { value: "pelayanan", label: "Pelayanan Publik" },
    { value: "profesionalisme", label: "Profesionalisme" },
    { value: "jejaring", label: "Jejaring Kerja" },
    { value: "sosial", label: "Sosial Budaya" },
    { value: "tik", label: "TIK" },
    { value: "antiradikalisme", label: "Anti Radikalisme" },
    { value: "custom", label: "Lainnya (Input Manual)..." },
  ],
} as const;

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

export const VALID_TABS = ["bank", "exams", "scores", "topups", "balances", "settings"] as const;
export const BANK_VIEWS = ["list", "materi", "exam"] as const;
