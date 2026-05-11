import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2, Wallet, Check, X, Plus, Sparkles, Loader2,
  Pencil, Image, Upload, Key, Eye, EyeOff, ChevronDown, ChevronUp,
  BarChart2, LineChart, PieChart, Table2, RotateCcw, Copy,
  BookOpen, FileText, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { extractTextFromFile } from "@/lib/extractPdfText";

type ChartType = "none" | "bar" | "line" | "pie" | "table";

const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "none", label: "Teks Saja", icon: Sparkles, desc: "Soal pilihan ganda biasa" },
  { value: "bar", label: "Bar Chart", icon: BarChart2, desc: "Grafik batang — data perbandingan" },
  { value: "line", label: "Line Chart", icon: LineChart, desc: "Grafik garis — data tren/pertumbuhan" },
  { value: "pie", label: "Pie Chart", icon: PieChart, desc: "Grafik lingkaran — distribusi/proporsi" },
  { value: "table", label: "Tabel Data", icon: Table2, desc: "Tabel data numerik terstruktur" },
];

const TOPIC_OPTIONS = {
  twk: [
    { value: "pancasila", label: "Pancasila" },
    { value: "uud1945", label: "UUD 1945" },
    { value: "bhineka", label: "Bhinneka Tunggal Ika" },
    { value: "nkri", label: "NKRI" },
    { value: "bahasa", label: "Bahasa Indonesia" },
  ],
  tiu: [
    { value: "analogi", label: "Analogi Verbal" },
    { value: "silogisme", label: "Silogisme" },
    { value: "logika", label: "Logika Formal" },
    { value: "hitung", label: "Hitung Cepat" },
    { value: "deret", label: "Deret Angka & Huruf" },
    { value: "figural", label: "Figural / Spasial" },
  ],
  tkp: [
    { value: "pelayanan", label: "Pelayanan Publik" },
    { value: "jejaring", label: "Jejaring Kerja" },
    { value: "sosial", label: "Sosial Budaya" },
    { value: "profesionalisme", label: "Profesionalisme" },
    { value: "antiradikalisme", label: "Anti Radikalisme" },
    { value: "tik", label: "Teknologi Informasi & Komunikasi" },
  ],
} as const;

type Exam = {
  id: string; title: string; total_questions: number;
  description?: string; duration: number; price: number; original_price?: number;
  bundle_size: number; category: string; subcategory: string; exam_type?: string;
  passing_score?: number; cta_link?: string | null; cover_image_url?: string | null;
};
type Question = {
  id: string; exam_id: string | null; question_text: string; options: string[];
  correct_answer: string; subtest: string; option_points: Record<string, number> | null;
  explanation?: string; image_url?: string | null; svg_content?: string | null; topic?: string | null;
  source?: string | null;
};

type BankQuestion = {
  id: string; exam_id: string | null; question_text: string; subtest: string; topic?: string | null;
};
type Score = { id: string; score: number; completed_at: string; profiles: { username: string | null; email: string | null } | null; exams: { title: string } | null };
type Topup = { id: string; user_id: string; amount: number; status: "pending" | "approved" | "rejected"; created_at: string; profiles: { username: string | null; email: string | null } | null };
type UserBalance = { user_id: string; balance: number; profiles: { username: string | null; email: string | null } | null };
type Purchase = { id: string; created_at: string; user_id: string; exam_id: string; profiles: { username: string | null; email: string | null } | null; exams: { title: string } | null };
type Material = {
  id: string; title: string; description?: string | null; file_name?: string | null;
  category: string; topic?: string | null; extracted_text: string; char_count?: number | null;
  created_at: string;
};

type MatQueueItem = {
  id: string;
  file: File;
  status: "extracting" | "ready" | "error";
  text: string;
  title: string;
  category: string;
  topic: string;
  errorMsg?: string;
};

type ChunkStatus = {
  index: number;
  charCount: number;
  status: "idle" | "processing" | "done" | "error";
  count: number;
  errorMsg?: string;
};

type LynkPackage = {
  id: string; lynk_uuid: string; exam_id: string | null; title: string;
  is_active: boolean; description?: string | null;
  notification_title?: string | null; notification_message?: string | null;
  exams?: { title: string } | null;
};

type EditQ = {
  id: string; question_text: string; a: string; b: string; c: string; d: string; e: string;
  correct: string; subtest: string; pa: number; pb: number; pc: number; pd: number; pe: number;
  explanation: string; image_url: string; topic: string;
};

const emptyNewQ = () => ({
  question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "", subtest: "tiu" as const,
  pa: 5, pb: 4, pc: 3, pd: 2, pe: 1, explanation: "", image_url: "", topic: "",
});

const VALID_TABS = ["bank", "exams", "scores", "topups", "balances", "settings"] as const;
const BANK_VIEWS = ["list", "materi", "exam"] as const;

type GlobalBankQ = {
  id: string; question_text: string; subtest: string; topic?: string | null;
  source?: string | null; exam_id: string | null; assign_count: number;
};

const Admin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (VALID_TABS as readonly string[]).includes(searchParams.get("tab") ?? "")
    ? searchParams.get("tab")!
    : "bank";
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const bankView = (BANK_VIEWS as readonly string[]).includes(searchParams.get("view") ?? "")
    ? searchParams.get("view")!
    : "list";
  const setBankView = (view: string) => setSearchParams({ tab: "bank", view }, { replace: true });

  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [adjustAmount, setAdjustAmount] = useState<Record<string, number>>({});
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [showNewExamForm, setShowNewExamForm] = useState(false);

  // New question form
  const [newQ, setNewQ] = useState(emptyNewQ());
  const [newQImageFile, setNewQImageFile] = useState<File | null>(null);
  const [newQUploadingImg, setNewQUploadingImg] = useState(false);
  const newQImgRef = useRef<HTMLInputElement>(null);

  // Edit question modal
  const [editQ, setEditQ] = useState<EditQ | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editUploadingImg, setEditUploadingImg] = useState(false);
  const editImgRef = useRef<HTMLInputElement>(null);
  const [expandedQ, setExpandedQ] = useState<Set<string>>(new Set());
  const [filterSubtest, setFilterSubtest] = useState<"all" | "twk" | "tiu" | "tkp">("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [addQuestionMode, setAddQuestionMode] = useState<null | "picker" | "manual" | "ai" | "bank">(null);
  const [bankListMode, setBankListMode] = useState<null | "manual" | "ai">(null);

  // Bank soal picker
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankFilter, setBankFilter] = useState({ subtest: "all", search: "" });
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [bankRandomSubtest, setBankRandomSubtest] = useState("all");
  const [bankRandomCount, setBankRandomCount] = useState(10);

  // Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matUploading, setMatUploading] = useState(false);
  const [matQueue, setMatQueue] = useState<MatQueueItem[]>([]);
  const [matExpanded, setMatExpanded] = useState<Set<string>>(new Set());
  const matFileRef = useRef<HTMLInputElement>(null);

  // Ekstrak soal dari materi
  const [extractPanelId, setExtractPanelId] = useState<string | null>(null);
  const [extractExamId, setExtractExamId] = useState("");
  const [extractChunks, setExtractChunks] = useState<Record<string, ChunkStatus[]>>({});
  const [extractRunning, setExtractRunning] = useState(false);

  // Global bank list (Daftar Soal view)
  const [globalBank, setGlobalBank] = useState<GlobalBankQ[]>([]);
  const [globalBankLoading, setGlobalBankLoading] = useState(false);
  const [globalBankFilter, setGlobalBankFilter] = useState({ subtest: "all", source: "all", assigned: "all", search: "" });
  const [globalBankSelectedIds, setGlobalBankSelectedIds] = useState<Set<string>>(new Set());
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeTargetIds, setDistributeTargetIds] = useState<Set<string>>(new Set());
  const [distributing, setDistributing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lynk packages
  const [lynkPackages, setLynkPackages] = useState<LynkPackage[]>([]);
  const emptyLynkPkg = () => ({ lynk_uuid: "", exam_id: "", title: "", is_active: true, description: "", notification_title: "", notification_message: "" });
  const [newLynkPkg, setNewLynkPkg] = useState(emptyLynkPkg());
  const [editLynkPkg, setEditLynkPkg] = useState<LynkPackage | null>(null);
  const [showNewLynkForm, setShowNewLynkForm] = useState(false);

  // New exam form
  const [newExam, setNewExam] = useState({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "", passing_score: 0, cta_link: "" });
  // Edit exam modal
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [editExamCoverFile, setEditExamCoverFile] = useState<File | null>(null);
  const [editExamCoverUploading, setEditExamCoverUploading] = useState(false);
  const editExamCoverRef = useRef<HTMLInputElement>(null);

  // AI Generate
  const [aiGen, setAiGen] = useState({
    subtest: "twk" as "twk" | "tiu" | "tkp", topic: "pancasila", count: 10,
    chartType: "none" as ChartType,
    imageFile: null as File | null, imageUrl: "",
    customInstruction: "",
    materialId: "",
  });
  const [aiImageUploading, setAiImageUploading] = useState(false);
  const aiImgRef = useRef<HTMLInputElement>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiResult, setAiResult] = useState<{ count: number; requested: number } | null>(null);
  const [aiError, setAiError] = useState("");

  // Settings
  const [kieApiKey, setKieApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [keyMessage, setKeyMessage] = useState("");

  const [lynkMerchantKey, setLynkMerchantKey] = useState("");
  const [showLynkKey, setShowLynkKey] = useState(false);
  const [savingLynkKey, setSavingLynkKey] = useState(false);

  const refresh = async () => {
    const { data: e } = await supabase.from("exams")
      .select("id,title,total_questions,description,duration,price,original_price,bundle_size,category,subcategory,exam_type,passing_score,cta_link,cover_image_url")
      .order("created_at");
    setExams((e as Exam[]) ?? []);

    const { data: lp } = await supabase.from("lynk_packages")
      .select("*, exams(title)").order("created_at");
    setLynkPackages((lp as LynkPackage[]) ?? []);

    const { data: mat } = await supabase.from("materials")
      .select("id,title,description,file_name,category,topic,char_count,created_at,extracted_text")
      .order("created_at", { ascending: false });
    setMaterials((mat as Material[]) ?? []);

    if (selectedExam) {
      // Auto-migrate: if no assignments yet, create them from exam_id
      const { count: aCount } = await (supabase as any)
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", selectedExam);
      if ((aCount ?? 0) === 0) {
        const { data: oldQs } = await supabase.from("questions").select("id").eq("exam_id", selectedExam).order("created_at");
        if (oldQs && oldQs.length > 0) {
          await (supabase as any).from("exam_question_assignments").insert(
            oldQs.map((q: any, i: number) => ({ exam_id: selectedExam, question_id: q.id, position: i + 1 }))
          );
        }
      }
      // Load questions via junction table
      const { data: asgn } = await (supabase as any)
        .from("exam_question_assignments")
        .select("position, questions(id, exam_id, question_text, options, correct_answer, subtest, option_points, explanation, image_url, svg_content, topic, source)")
        .eq("exam_id", selectedExam)
        .order("position");
      setQuestions(((asgn ?? []).map((d: any) => d.questions).filter(Boolean)) as Question[]);
    }

    const { data: s } = await supabase.from("user_scores")
      .select("id,score,completed_at,profiles(username,email),exams(title)")
      .order("completed_at", { ascending: false }).limit(500);
    setScores((s as Score[]) ?? []);

    const { data: t } = await supabase.from("topup_requests")
      .select("id,user_id,amount,status,created_at")
      .order("created_at", { ascending: false }).limit(200);

    const { data: purch } = await supabase.from("exam_purchases")
      .select("id,created_at,user_id,exam_id,profiles(username,email),exams(title)")
      .order("created_at", { ascending: false }).limit(500);
    setPurchases((purch as Purchase[]) ?? []);

    // Fetch ALL profiles for Saldo User (not just those with balances)
    const { data: allProfiles } = await supabase.from("profiles").select("id,username,email").order("created_at");
    const { data: balanceRows } = await supabase.from("user_balances").select("user_id,balance");

    const balanceMap: Record<string, number> = Object.fromEntries((balanceRows ?? []).map((b: any) => [b.user_id, b.balance]));
    const profileMap: Record<string, { username: string | null; email: string | null }> = Object.fromEntries(
      (allProfiles ?? []).map((p: any) => [p.id, { username: p.username, email: p.email }])
    );

    setTopups(((t ?? []) as any[]).map((x) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
    // Show all users with balance (default 0)
    const allBalances = (allProfiles ?? []).map((p: any) => ({
      user_id: p.id,
      balance: balanceMap[p.id] ?? 0,
      profiles: { username: p.username, email: p.email },
    }));
    allBalances.sort((a, b) => b.balance - a.balance);
    setBalances(allBalances);
  };

  const loadGlobalBank = async () => {
    setGlobalBankLoading(true);
    // Fetch all questions
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question_text, subtest, topic, source, exam_id")
      .order("created_at", { ascending: false });

    // Fetch assignment counts per question
    const { data: asgns } = await (supabase as any)
      .from("exam_question_assignments")
      .select("question_id");

    const countMap: Record<string, number> = {};
    (asgns ?? []).forEach((a: any) => {
      countMap[a.question_id] = (countMap[a.question_id] ?? 0) + 1;
    });

    const result: GlobalBankQ[] = (qs ?? []).map((q: any) => ({
      ...q,
      assign_count: countMap[q.id] ?? 0,
    }));
    setGlobalBank(result);
    setGlobalBankLoading(false);
  };

  useEffect(() => { refresh(); }, [selectedExam]);

  useEffect(() => {
    if (activeTab === "bank" && bankView === "list") {
      loadGlobalBank();
    }
  }, [activeTab, bankView]);

  // Auto-refresh bank list every 30s when on the list view
  useEffect(() => {
    if (activeTab !== "bank" || bankView !== "list") return;
    const id = setInterval(() => { loadGlobalBank(); }, 30000);
    return () => clearInterval(id);
  }, [activeTab, bankView]);

  // Load saved keys on mount
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("admin_settings").select("key,value").in("key", ["kie_api_key", "lynk_merchant_key"]);
      (rows ?? []).forEach((r: any) => {
        if (r.key === "kie_api_key") setKieApiKey(r.value);
        if (r.key === "lynk_merchant_key") setLynkMerchantKey(r.value);
      });
    })();
  }, []);

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `questions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast.error("Gagal upload gambar: " + error.message); return null; }
    const { data } = supabase.storage.from("question-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveApiKey = async () => {
    const trimmed = kieApiKey.trim();
    if (!trimmed) return toast.error("Masukkan API key terlebih dahulu");

    // 1. Test connection first
    setKeyStatus("testing");
    setKeyMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setKeyStatus("error"); setKeyMessage("Sesi tidak ditemukan, login ulang"); return; }

      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { action: "test_connection", api_key: trimmed },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data?.success) {
        const msg = data?.message ?? error?.message ?? "Koneksi gagal";
        setKeyStatus("error");
        setKeyMessage(msg);
        return toast.error(`Gagal: ${msg}`);
      }

      // 2. Save only if test passes
      setSavingKey(true);
      const { error: saveErr } = await supabase.from("admin_settings").upsert(
        { key: "kie_api_key", value: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      setSavingKey(false);
      if (saveErr) { setKeyStatus("error"); setKeyMessage(saveErr.message); return toast.error("Gagal menyimpan: " + saveErr.message); }

      setKeyStatus("ok");
      setKeyMessage(data.message ?? "API key valid dan tersimpan");
      toast.success("API key valid dan berhasil disimpan");
    } catch (e: any) {
      setKeyStatus("error");
      setKeyMessage(e?.message ?? "Terjadi kesalahan");
      toast.error("Gagal test koneksi");
    }
  };

  const saveLynkKey = async () => {
    const trimmed = lynkMerchantKey.trim();
    if (!trimmed) return toast.error("Masukkan Merchant Key terlebih dahulu");
    setSavingLynkKey(true);
    const { error } = await supabase.from("admin_settings").upsert(
      { key: "lynk_merchant_key", value: trimmed, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSavingLynkKey(false);
    if (error) return toast.error("Gagal menyimpan: " + error.message);
    toast.success("Lynk Merchant Key berhasil disimpan");
  };

  const approveTopup = async (t: Topup) => {
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: t.user_id, _amount: t.amount, _topup_id: t.id, _approve: true });
    if (error) return toast.error(error.message);
    toast.success(`Topup Rp ${t.amount.toLocaleString("id-ID")} disetujui`); refresh();
  };

  const rejectTopup = async (t: Topup) => {
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: t.user_id, _amount: 0, _topup_id: t.id, _approve: false });
    if (error) return toast.error(error.message);
    toast.success("Topup ditolak"); refresh();
  };

  const adjustBalance = async (userId: string) => {
    const amt = adjustAmount[userId];
    if (!amt || isNaN(amt)) return toast.error("Masukkan nominal");
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: userId, _amount: amt, _topup_id: null, _approve: true });
    if (error) return toast.error(error.message);
    toast.success(`Saldo diperbarui`);
    setAdjustAmount({ ...adjustAmount, [userId]: 0 }); refresh();
  };

  const addExam = async () => {
    if (!newExam.title.trim()) return toast.error("Judul wajib");
    if (!newExam.category) return toast.error("Kategori utama wajib");
    if (!newExam.subcategory.trim()) return toast.error("Subkategori wajib");
    const { error } = await supabase.from("exams").insert({ ...newExam, title: newExam.title.trim(), total_questions: 0 });
    if (error) return toast.error(error.message);
    toast.success("Tryout dibuat");
    setNewExam({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "", passing_score: 0, cta_link: "" });
    refresh();
  };

  const saveExam = async () => {
    if (!editExam) return;
    let coverUrl = editExam.cover_image_url ?? null;
    if (editExamCoverFile) {
      setEditExamCoverUploading(true);
      const ext = editExamCoverFile.name.split(".").pop() ?? "jpg";
      const path = `exam-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("question-images").upload(path, editExamCoverFile);
      setEditExamCoverUploading(false);
      if (upErr) { toast.error("Gagal upload gambar: " + upErr.message); return; }
      const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(path);
      coverUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from("exams").update({
      title: editExam.title.trim(),
      description: editExam.description ?? "",
      duration: editExam.duration,
      price: editExam.price,
      original_price: editExam.original_price ?? 0,
      bundle_size: editExam.bundle_size,
      category: editExam.category,
      subcategory: editExam.subcategory,
      passing_score: editExam.passing_score ?? 0,
      cta_link: editExam.cta_link?.trim() || null,
      cover_image_url: coverUrl,
    }).eq("id", editExam.id);
    if (error) return toast.error(error.message);
    toast.success("Paket tryout diperbarui");
    setEditExam(null);
    setEditExamCoverFile(null);
    refresh();
  };

  const duplicateExam = async (ex: Exam) => {
    const { data, error } = await supabase.from("exams").insert({
      title: `${ex.title} (Salinan)`,
      description: ex.description ?? "",
      duration: ex.duration,
      price: ex.price,
      original_price: ex.original_price ?? 0,
      bundle_size: ex.bundle_size,
      category: ex.category,
      subcategory: ex.subcategory,
      exam_type: ex.exam_type ?? null,
      passing_score: ex.passing_score ?? 0,
      cta_link: ex.cta_link ?? null,
      cover_image_url: ex.cover_image_url ?? null,
      total_questions: 0,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Tryout berhasil diduplikasi");
    refresh();
  };

  const deleteExam = async (id: string) => {
    if (!confirm("Hapus tryout ini beserta semua soalnya? Tindakan ini tidak bisa dibatalkan.")) return;
    await supabase.from("questions").delete().eq("exam_id", id);
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tryout dihapus");
    if (selectedExam === id) { setSelectedExam(""); setFilterSubtest("all"); setFilterTopic("all"); setFilterSource("all"); }
    refresh();
  };

  const addQuestion = async () => {
    if (!selectedExam) return toast.error("Pilih tryout dulu");
    if (!newQ.question_text.trim()) return toast.error("Pertanyaan wajib diisi");
    const optsRaw = [
      { v: newQ.a, p: newQ.pa }, { v: newQ.b, p: newQ.pb }, { v: newQ.c, p: newQ.pc },
      { v: newQ.d, p: newQ.pd }, { v: newQ.e, p: newQ.pe },
    ].filter((o) => o.v.trim());
    if (optsRaw.length < 2) return toast.error("Minimal 2 opsi");

    let imageUrl = newQ.image_url;
    if (newQImageFile) {
      setNewQUploadingImg(true);
      const url = await uploadImage(newQImageFile);
      setNewQUploadingImg(false);
      if (!url) return;
      imageUrl = url;
    }

    const options = optsRaw.map((o) => o.v);
    const payload: any = {
      exam_id: selectedExam, question_text: newQ.question_text.trim(),
      options, subtest: newQ.subtest, explanation: newQ.explanation.trim(), image_url: imageUrl || null,
      topic: newQ.topic.trim() || null, source: "manual",
    };
    if (newQ.subtest === "tkp") {
      payload.option_points = Object.fromEntries(optsRaw.map((o) => [o.v, o.p]));
      payload.correct_answer = optsRaw.reduce((m, o) => (o.p > m.p ? o : m), optsRaw[0]).v;
    } else {
      if (!newQ.correct || !options.includes(newQ.correct)) return toast.error("Jawaban benar harus sama persis dengan salah satu opsi");
      payload.correct_answer = newQ.correct;
    }
    const { data: newQData, error } = await supabase.from("questions").insert(payload).select("id").single();
    if (error) return toast.error(error.message);
    // Also assign to this exam via junction table
    await (supabase as any).from("exam_question_assignments").insert({
      exam_id: selectedExam, question_id: (newQData as any).id, position: questions.length + 1,
    });
    await supabase.from("exams").update({ total_questions: questions.length + 1 }).eq("id", selectedExam);
    toast.success("Soal ditambahkan");
    setNewQ(emptyNewQ()); setNewQImageFile(null); setAddQuestionMode(null); refresh();
  };

  const addQuestionToBank = async () => {
    if (!newQ.question_text.trim()) return toast.error("Pertanyaan wajib diisi");
    const optsRaw = [
      { v: newQ.a, p: newQ.pa }, { v: newQ.b, p: newQ.pb }, { v: newQ.c, p: newQ.pc },
      { v: newQ.d, p: newQ.pd }, { v: newQ.e, p: newQ.pe },
    ].filter((o) => o.v.trim());
    if (optsRaw.length < 2) return toast.error("Minimal 2 opsi");

    let imageUrl = newQ.image_url;
    if (newQImageFile) {
      setNewQUploadingImg(true);
      const url = await uploadImage(newQImageFile);
      setNewQUploadingImg(false);
      if (!url) return;
      imageUrl = url;
    }

    const options = optsRaw.map((o) => o.v);
    const payload: any = {
      exam_id: null, question_text: newQ.question_text.trim(),
      options, subtest: newQ.subtest, explanation: newQ.explanation.trim(),
      image_url: imageUrl || null, topic: newQ.topic.trim() || null, source: "manual",
    };
    if (newQ.subtest === "tkp") {
      payload.option_points = Object.fromEntries(optsRaw.map((o) => [o.v, o.p]));
      payload.correct_answer = optsRaw.reduce((m, o) => (o.p > m.p ? o : m), optsRaw[0]).v;
    } else {
      if (!newQ.correct || !options.includes(newQ.correct)) return toast.error("Jawaban benar harus sama persis dengan salah satu opsi");
      payload.correct_answer = newQ.correct;
    }
    const { error } = await supabase.from("questions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Soal ditambahkan ke bank");
    setNewQ(emptyNewQ()); setNewQImageFile(null); setBankListMode(null);
    loadGlobalBank();
  };

  const openEdit = (q: Question) => {
    const opts = q.options ?? [];
    setEditQ({
      id: q.id, question_text: q.question_text, subtest: q.subtest ?? "tiu",
      a: opts[0] ?? "", b: opts[1] ?? "", c: opts[2] ?? "", d: opts[3] ?? "", e: opts[4] ?? "",
      pa: q.option_points?.[opts[0]] ?? 5, pb: q.option_points?.[opts[1]] ?? 4,
      pc: q.option_points?.[opts[2]] ?? 3, pd: q.option_points?.[opts[3]] ?? 2, pe: q.option_points?.[opts[4]] ?? 1,
      correct: q.correct_answer ?? "", explanation: q.explanation ?? "", image_url: q.image_url ?? "",
      topic: q.topic ?? "",
    });
    setEditImageFile(null);
  };

  const saveEdit = async () => {
    if (!editQ) return;
    const optsRaw = [
      { v: editQ.a, p: editQ.pa }, { v: editQ.b, p: editQ.pb }, { v: editQ.c, p: editQ.pc },
      { v: editQ.d, p: editQ.pd }, { v: editQ.e, p: editQ.pe },
    ].filter((o) => o.v.trim());
    if (optsRaw.length < 2) return toast.error("Minimal 2 opsi");

    let imageUrl = editQ.image_url;
    if (editImageFile) {
      setEditUploadingImg(true);
      const url = await uploadImage(editImageFile);
      setEditUploadingImg(false);
      if (!url) return;
      imageUrl = url;
    }

    const options = optsRaw.map((o) => o.v);
    const payload: any = {
      question_text: editQ.question_text.trim(), options, subtest: editQ.subtest,
      explanation: editQ.explanation.trim(), image_url: imageUrl || null,
      topic: editQ.topic?.trim() || null,
    };
    if (editQ.subtest === "tkp") {
      payload.option_points = Object.fromEntries(optsRaw.map((o) => [o.v, o.p]));
      payload.correct_answer = optsRaw.reduce((m, o) => (o.p > m.p ? o : m), optsRaw[0]).v;
    } else {
      if (!editQ.correct || !options.includes(editQ.correct)) return toast.error("Jawaban benar harus sama persis dengan salah satu opsi");
      payload.correct_answer = editQ.correct;
    }
    const { error } = await supabase.from("questions").update(payload).eq("id", editQ.id);
    if (error) return toast.error(error.message);
    toast.success("Soal diperbarui"); setEditQ(null); refresh();
  };

  const deleteQ = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    await supabase.from("questions").delete().eq("id", id);
    await supabase.from("exams").update({ total_questions: Math.max(0, questions.length - 1) }).eq("id", selectedExam);
    toast.success("Soal dihapus"); refresh();
  };

  const syncQuestionCount = async () => {
    if (!selectedExam) return;
    const { count } = await (supabase as any)
      .from("exam_question_assignments").select("*", { count: "exact", head: true }).eq("exam_id", selectedExam);
    await supabase.from("exams").update({ total_questions: count ?? 0 }).eq("id", selectedExam);
    toast.success(`Total soal diperbarui: ${count ?? 0} soal`);
    refresh();
  };

  const generateViaAI = async (targetExamId?: string) => {
    const examIdToUse = targetExamId ?? selectedExam;
    if (!targetExamId && !selectedExam) return toast.error("Pilih tryout dulu");
    setAiStatus("loading"); setAiResult(null); setAiError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setAiStatus("error"); return toast.error("Sesi tidak ditemukan"); }

      // Upload image only for "upload" mode (not needed for chart modes)
      let finalImageUrl = aiGen.imageUrl;
      if (aiGen.chartType === "none" && aiGen.imageFile) {
        setAiImageUploading(true);
        const url = await uploadImage(aiGen.imageFile);
        setAiImageUploading(false);
        if (!url) { setAiStatus("error"); return; }
        finalImageUrl = url;
        setAiGen((g) => ({ ...g, imageUrl: url }));
      }

      const selectedMaterial = aiGen.materialId ? materials.find((m) => m.id === aiGen.materialId) : null;
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          ...(examIdToUse ? { exam_id: examIdToUse } : {}),
          subtest: aiGen.subtest, topic: aiGen.topic, count: aiGen.count,
          chart_type: aiGen.chartType,
          image_url: aiGen.chartType === "none" ? finalImageUrl || null : null,
          custom_instruction: aiGen.customInstruction.trim() || null,
          material_text: selectedMaterial?.extracted_text || null,
          material_title: selectedMaterial?.title || null,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        const msg = error.message ?? "Gagal generate soal";
        setAiStatus("error"); setAiError(msg); return toast.error(msg);
      }
      if (data?.error) {
        setAiStatus("error"); setAiError(data.error); return toast.error(data.error);
      }

      setAiStatus("done"); setAiResult(data);
      const chartLabel = aiGen.chartType !== "none" ? ` (grafik ${aiGen.chartType})` : "";
      if (data.count === 0) {
        toast.warning(`AI merespons tapi tidak ada soal yang bisa diproses. Coba lagi.`);
      } else {
        toast.success(`${data.count} soal${chartLabel} + pembahasan berhasil di-generate`);
      }
      setAiGen((g) => ({ ...g, imageFile: null, imageUrl: "" }));
      setAddQuestionMode(null);
      setBankListMode(null);
      // Sync newly generated questions to assignment table (only when targeting a specific exam)
      if (data.count > 0 && examIdToUse) {
        const currentIds = new Set(questions.map((q) => q.id));
        const { data: newQs } = await supabase.from("questions").select("id").eq("exam_id", examIdToUse).order("created_at", { ascending: false }).limit(data.count + 5);
        const toAssign = (newQs ?? []).filter((q: any) => !currentIds.has(q.id));
        if (toAssign.length > 0) {
          const maxPos = questions.length;
          await (supabase as any).from("exam_question_assignments").insert(
            toAssign.map((q: any, i: number) => ({ exam_id: examIdToUse, question_id: q.id, position: maxPos + i + 1 }))
          );
        }
      }
      if (bankView === "list") loadGlobalBank(); else refresh();
    } catch (e: any) {
      const msg = e?.message ?? "Terjadi kesalahan";
      setAiStatus("error"); setAiError(msg); toast.error(msg);
    }
  };

  const handleMatFilesChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: MatQueueItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "extracting" as const,
      text: "",
      title: file.name.replace(/\.[^.]+$/, ""),
      category: "general",
      topic: "",
    }));
    setMatQueue((prev) => [...prev, ...newItems]);
    if (matFileRef.current) matFileRef.current.value = "";

    for (const item of newItems) {
      try {
        const text = await extractTextFromFile(item.file);
        setMatQueue((prev) =>
          prev.map((q) => q.id === item.id ? { ...q, status: "ready", text } : q)
        );
      } catch (e: any) {
        setMatQueue((prev) =>
          prev.map((q) => q.id === item.id ? { ...q, status: "error", errorMsg: e.message } : q)
        );
      }
    }
  };

  const updateMatQueueItem = (id: string, patch: Partial<MatQueueItem>) => {
    setMatQueue((prev) => prev.map((q) => q.id === id ? { ...q, ...patch } : q));
  };

  const removeFromQueue = (id: string) => {
    setMatQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const saveAllMaterials = async () => {
    const readyItems = matQueue.filter((q) => q.status === "ready");
    if (readyItems.length === 0) return toast.error("Tidak ada materi siap disimpan");
    setMatUploading(true);
    const inserts = readyItems.map((q) => ({
      title: q.title.trim() || q.file.name,
      file_name: q.file.name,
      category: q.category,
      topic: q.topic.trim() || null,
      extracted_text: q.text,
      char_count: q.text.length,
    }));
    const { error } = await supabase.from("materials").insert(inserts);
    setMatUploading(false);
    if (error) return toast.error(error.message);
    toast.success(`${readyItems.length} materi berhasil disimpan`);
    setMatQueue((prev) => prev.filter((q) => q.status !== "ready"));
    refresh();
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Hapus materi ini?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Materi dihapus"); refresh();
  };

  const CHUNK_SIZE = 7000; // chars per request — keeps KIE API happy

  const splitTextIntoChunks = (text: string): string[] => {
    if (text.length <= CHUNK_SIZE) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);
      if (end < text.length) {
        // Try to split at a newline near the boundary
        const lastNl = text.lastIndexOf("\n", end);
        if (lastNl > start + CHUNK_SIZE * 0.5) end = lastNl + 1;
      }
      chunks.push(text.slice(start, end));
      start = end;
    }
    return chunks;
  };

  const initExtractChunks = (material: Material) => {
    const chunks = splitTextIntoChunks(material.extracted_text);
    setExtractChunks((prev) => ({
      ...prev,
      [material.id]: chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle", count: 0 })),
    }));
  };

  const resetExtractChunks = (material: Material) => {
    const chunks = splitTextIntoChunks(material.extracted_text);
    setExtractChunks((prev) => ({
      ...prev,
      [material.id]: chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle", count: 0 })),
    }));
  };

  const doExtractQuestions = async (material: Material, onlyIdle = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return toast.error("Sesi tidak ditemukan");

    const chunks = splitTextIntoChunks(material.extracted_text);
    const current = extractChunks[material.id] ?? chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle" as const, count: 0 }));
    const toProcess = onlyIdle
      ? current.filter((cs) => cs.status === "idle" || cs.status === "error")
      : current;

    if (toProcess.length === 0) {
      toast.info("Semua bagian sudah selesai diproses.");
      return;
    }

    setExtractRunning(true);

    for (const cs of toProcess) {
      setExtractChunks((prev) => ({
        ...prev,
        [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "processing" } : c),
      }));
      try {
        const { data, error } = await supabase.functions.invoke("extract-questions", {
          body: { text_chunk: chunks[cs.index], exam_id: extractExamId || undefined, category: material.category, topic: material.topic ?? undefined },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error || data?.error) {
          const msg = data?.error ?? error?.message ?? "Gagal";
          setExtractChunks((prev) => ({
            ...prev,
            [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c),
          }));
        } else {
          setExtractChunks((prev) => ({
            ...prev,
            [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "done", count: data.count ?? 0, errorMsg: undefined } : c),
          }));
        }
      } catch (e: any) {
        const msg = e.message ?? "Error";
        setExtractChunks((prev) => ({
          ...prev,
          [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c),
        }));
      }
    }

    setExtractRunning(false);
    refresh();
    loadGlobalBank();
  };

  const addLynkPkg = async () => {
    if (!newLynkPkg.lynk_uuid.trim()) return toast.error("Lynk UUID wajib diisi");
    if (!newLynkPkg.title.trim()) return toast.error("Title wajib diisi");
    const { error } = await supabase.from("lynk_packages").insert({
      lynk_uuid: newLynkPkg.lynk_uuid.trim(),
      exam_id: newLynkPkg.exam_id || null,
      title: newLynkPkg.title.trim(),
      is_active: newLynkPkg.is_active,
      description: newLynkPkg.description?.trim() || null,
      notification_title: newLynkPkg.notification_title?.trim() || null,
      notification_message: newLynkPkg.notification_message?.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Package ditambahkan"); setNewLynkPkg(emptyLynkPkg()); setShowNewLynkForm(false); refresh();
  };

  const saveLynkPkg = async () => {
    if (!editLynkPkg) return;
    if (!editLynkPkg.lynk_uuid.trim()) return toast.error("Lynk UUID wajib diisi");
    if (!editLynkPkg.title.trim()) return toast.error("Title wajib diisi");
    const { error } = await supabase.from("lynk_packages").update({
      lynk_uuid: editLynkPkg.lynk_uuid.trim(),
      exam_id: editLynkPkg.exam_id || null,
      title: editLynkPkg.title.trim(),
      is_active: editLynkPkg.is_active,
      description: editLynkPkg.description?.trim() || null,
      notification_title: editLynkPkg.notification_title?.trim() || null,
      notification_message: editLynkPkg.notification_message?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editLynkPkg.id);
    if (error) return toast.error(error.message);
    toast.success("Package diperbarui"); setEditLynkPkg(null); refresh();
  };

  const deleteLynkPkg = async (id: string) => {
    if (!confirm("Hapus konfigurasi ini?")) return;
    const { error } = await supabase.from("lynk_packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Package dihapus"); refresh();
  };

  const bulkDistribute = async () => {
    if (globalBankSelectedIds.size === 0 || distributeTargetIds.size === 0) return;
    setDistributing(true);
    const qIds = Array.from(globalBankSelectedIds);
    const eIds = Array.from(distributeTargetIds);

    for (const examId of eIds) {
      const { count: startPos } = await (supabase as any)
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", examId);

      const rows = qIds.map((qid, i) => ({
        exam_id: examId,
        question_id: qid,
        position: (startPos ?? 0) + i + 1,
      }));
      await (supabase as any).from("exam_question_assignments")
        .upsert(rows, { onConflict: "exam_id,question_id", ignoreDuplicates: true });

      const { count: total } = await (supabase as any)
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", examId);
      await supabase.from("exams").update({ total_questions: total ?? 0 }).eq("id", examId);
    }

    toast.success(`${qIds.length} soal didistribusikan ke ${eIds.length} tryout`);
    setDistributing(false);
    setDistributeOpen(false);
    setGlobalBankSelectedIds(new Set());
    setDistributeTargetIds(new Set());
    await refresh();
    loadGlobalBank();
  };

  const bulkDeleteQuestions = async () => {
    const qIds = Array.from(globalBankSelectedIds);
    if (qIds.length === 0) return;
    setDeleting(true);
    // Remove assignments first
    await (supabase as any).from("exam_question_assignments").delete().in("question_id", qIds);
    // Delete questions
    const { error } = await supabase.from("questions").delete().in("id", qIds);
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (error) { toast.error("Gagal hapus soal: " + error.message); return; }
    toast.success(`${qIds.length} soal dihapus dari bank`);
    setGlobalBankSelectedIds(new Set());
    await refresh();
    loadGlobalBank();
  };

  const loadBankQuestions = async () => {
    setBankLoading(true);
    const assignedIds = new Set(questions.map((q) => q.id));
    let query = (supabase as any)
      .from("questions")
      .select("id, question_text, subtest, topic, exam_id")
      .order("created_at", { ascending: false })
      .limit(300);
    if (bankFilter.subtest !== "all") query = query.eq("subtest", bankFilter.subtest);
    if (bankFilter.search.trim()) query = query.ilike("question_text", `%${bankFilter.search.trim()}%`);
    const { data } = await query;
    setBankQuestions(((data ?? []).filter((q: any) => !assignedIds.has(q.id))) as BankQuestion[]);
    setBankLoading(false);
  };

  const assignFromBank = async (questionIds: string[]) => {
    if (questionIds.length === 0) return toast.error("Pilih soal terlebih dahulu");
    const maxPos = questions.length;
    const { error } = await (supabase as any).from("exam_question_assignments").insert(
      questionIds.map((qid, i) => ({ exam_id: selectedExam, question_id: qid, position: maxPos + i + 1 }))
    );
    if (error) return toast.error(error.message);
    toast.success(`${questionIds.length} soal ditambahkan dari bank`);
    setSelectedBankIds(new Set());
    setAddQuestionMode(null);
    refresh();
  };

  const addRandomFromBank = async (subtest: string, count: number) => {
    const assignedIds = new Set(questions.map((q) => q.id));
    let query = (supabase as any).from("questions").select("id").limit(1000);
    if (subtest !== "all") query = query.eq("subtest", subtest);
    const { data } = await query;
    const pool = (data ?? []).filter((q: any) => !assignedIds.has(q.id));
    if (pool.length === 0) return toast.error("Tidak ada soal tersedia di bank untuk filter ini");
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    await assignFromBank(shuffled.map((q: any) => q.id));
  };

  const removeAssignment = async (questionId: string) => {
    const { error } = await (supabase as any)
      .from("exam_question_assignments")
      .delete()
      .eq("exam_id", selectedExam)
      .eq("question_id", questionId);
    if (error) return toast.error(error.message);
    toast.success("Soal dilepas dari tryout ini");
    refresh();
  };

  const toggleExpand = (id: string) => {
    setExpandedQ((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="w-full overflow-x-hidden">
        <h1 className="text-3xl font-bold">
          {activeTab === "bank" ? "Bank Soal" :
           activeTab === "exams" ? "Tryout" :
           activeTab === "scores" ? "Skor User" :
           activeTab === "topups" ? "History Transaksi" :
           activeTab === "balances" ? "Semua User" :
           activeTab === "settings" ? "Pengaturan" :
           "Admin Dashboard"}
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">

          {/* ── BANK SOAL ── */}
          <TabsContent value="bank" className="space-y-4">
            {/* Sub-navigation */}
            <div className="flex gap-1 border-b pb-0">
              {[
                { value: "list", label: "Daftar Soal" },
                { value: "materi", label: "Materi & Ekstrak" },
                { value: "exam", label: "Per Tryout" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setBankView(item.value)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                    bankView === item.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* View: Daftar Soal (Global Bank) */}
            {bankView === "list" && (
              <div className="space-y-4">
                {/* Header actions */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-sm">
                      Semua Soal
                      <span className="ml-1.5 text-muted-foreground font-normal">({globalBank.length})</span>
                    </h2>
                    {globalBankSelectedIds.size > 0 && (
                      <>
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setDistributeOpen(true)}>
                          <Plus className="h-3 w-3" />
                          Distribute ({globalBankSelectedIds.size})
                        </Button>
                        <Button
                          size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={() => setDeleteConfirmOpen(true)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus ({globalBankSelectedIds.size})
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant={bankListMode === "manual" ? "outline" : "default"} className="h-7 text-xs gap-1"
                      onClick={() => setBankListMode((m) => m === "manual" ? null : "manual")}
                    >
                      <Pencil className="h-3 w-3" />
                      {bankListMode === "manual" ? "Tutup" : "Tambah Manual"}
                    </Button>
                    <Button
                      size="sm" variant={bankListMode === "ai" ? "outline" : "default"} className="h-7 text-xs gap-1"
                      onClick={() => setBankListMode((m) => m === "ai" ? null : "ai")}
                    >
                      <Sparkles className="h-3 w-3" />
                      {bankListMode === "ai" ? "Tutup" : "Generate AI"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={loadGlobalBank} disabled={globalBankLoading}>
                      {globalBankLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {/* Tambah Manual form (bank mode) */}
                {bankListMode === "manual" && (
                  <Card>
                    <CardHeader><h3 className="font-semibold text-sm flex items-center gap-2"><Pencil className="h-4 w-4" /> Tambah Soal Manual ke Bank</h3></CardHeader>
                    <CardContent className="space-y-3">
                      {/* Reuse same newQ form fields — identical to Per Tryout manual form */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Subtes *</Label>
                          <Select value={newQ.subtest} onValueChange={(v: any) => setNewQ({ ...newQ, subtest: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="twk">TWK</SelectItem>
                              <SelectItem value="tiu">TIU</SelectItem>
                              <SelectItem value="tkp">TKP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Topik</Label>
                          <Input className="h-8 text-xs" placeholder="cth: Pancasila" value={newQ.topic} onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Pertanyaan *</Label>
                        <Textarea rows={3} placeholder="Tulis pertanyaan..." value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pilihan Jawaban *</Label>
                        {(["a","b","c","d","e"] as const).map((k) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className="text-xs font-bold w-4 shrink-0">{k.toUpperCase()}.</span>
                            <Input className="h-7 text-xs flex-1" placeholder={`Opsi ${k.toUpperCase()}`} value={newQ[k]} onChange={(e) => setNewQ({ ...newQ, [k]: e.target.value })} />
                            {newQ.subtest !== "tkp" && (
                              <button type="button" className={cn("h-7 px-2 rounded text-xs border transition-colors shrink-0", newQ.correct === newQ[k] && newQ[k] ? "bg-green-500 text-white border-green-500" : "border-border hover:bg-accent")} onClick={() => { if (newQ[k]) setNewQ({ ...newQ, correct: newQ[k] }); }}>✓</button>
                            )}
                          </div>
                        ))}
                      </div>
                      {newQ.subtest !== "tkp" && <p className="text-[10px] text-muted-foreground">Klik ✓ di sebelah kanan opsi untuk menandai jawaban benar.</p>}
                      <div>
                        <Label className="text-xs">Pembahasan (opsional)</Label>
                        <Textarea rows={2} placeholder="Jelaskan mengapa jawaban benar..." value={newQ.explanation} onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={addQuestionToBank} disabled={newQUploadingImg}>Tambah ke Bank</Button>
                        <Button variant="outline" onClick={() => { setBankListMode(null); setNewQ(emptyNewQ()); }}>Batal</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generate AI form (bank mode) — reuse aiGen state, no selectedExam needed */}
                {bankListMode === "ai" && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Generate Soal AI ke Bank</h3>
                      <p className="text-xs text-muted-foreground">Soal yang digenerate langsung masuk ke Bank Soal tanpa perlu pilih tryout.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Subtes *</Label>
                          <Select value={aiGen.subtest} onValueChange={(v: any) => setAiGen((g) => ({ ...g, subtest: v, topic: v === "twk" ? "pancasila" : v === "tiu" ? "analogi" : "pelayanan" }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="twk">TWK</SelectItem>
                              <SelectItem value="tiu">TIU</SelectItem>
                              <SelectItem value="tkp">TKP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Topik *</Label>
                          <Select value={aiGen.topic} onValueChange={(v) => setAiGen((g) => ({ ...g, topic: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(TOPIC_OPTIONS[aiGen.subtest] ?? []).map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Jumlah</Label>
                          <Input type="number" min={1} max={30} className="h-8 text-xs" value={aiGen.count} onChange={(e) => setAiGen((g) => ({ ...g, count: Math.max(1, Math.min(30, +e.target.value)) }))} />
                        </div>
                      </div>
                      {aiStatus === "loading" && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" /> Generating {aiGen.count} soal {aiGen.subtest.toUpperCase()}...
                        </div>
                      )}
                      {aiStatus === "done" && aiResult && (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Check className="h-4 w-4" /> {aiResult.count} soal berhasil ditambahkan ke bank
                        </div>
                      )}
                      {aiStatus === "error" && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" /> {aiError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={() => generateViaAI(undefined)} disabled={aiStatus === "loading"}>
                          {aiStatus === "loading" ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate {aiGen.count} Soal</>}
                        </Button>
                        <Button variant="outline" onClick={() => { setBankListMode(null); setAiStatus("idle"); }}>Tutup</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    className="h-7 text-xs w-52"
                    placeholder="Cari soal..."
                    value={globalBankFilter.search}
                    onChange={(e) => setGlobalBankFilter((f) => ({ ...f, search: e.target.value }))}
                  />
                  <Select value={globalBankFilter.subtest} onValueChange={(v) => setGlobalBankFilter((f) => ({ ...f, subtest: v }))}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Semua subtes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua subtes</SelectItem>
                      <SelectItem value="twk">TWK</SelectItem>
                      <SelectItem value="tiu">TIU</SelectItem>
                      <SelectItem value="tkp">TKP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={globalBankFilter.source} onValueChange={(v) => setGlobalBankFilter((f) => ({ ...f, source: v }))}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Semua sumber" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua sumber</SelectItem>
                      <SelectItem value="manual">Dari Manual</SelectItem>
                      <SelectItem value="ai">Dari AI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={globalBankFilter.assigned} onValueChange={(v) => setGlobalBankFilter((f) => ({ ...f, assigned: v }))}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Semua status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua status</SelectItem>
                      <SelectItem value="unassigned">Belum di-assign</SelectItem>
                      <SelectItem value="assigned">Sudah di-assign</SelectItem>
                    </SelectContent>
                  </Select>
                  {(globalBankFilter.subtest !== "all" || globalBankFilter.source !== "all" || globalBankFilter.assigned !== "all" || globalBankFilter.search) && (
                    <button onClick={() => setGlobalBankFilter({ subtest: "all", source: "all", assigned: "all", search: "" })} className="text-[10px] text-primary hover:underline">
                      Reset
                    </button>
                  )}
                  {globalBankSelectedIds.size > 0 && (
                    <button onClick={() => setGlobalBankSelectedIds(new Set())} className="text-[10px] text-muted-foreground hover:underline ml-auto">
                      Batal pilih semua
                    </button>
                  )}
                </div>

                {/* Question list */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {globalBankLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                      <div className="divide-y divide-border">
                        {(() => {
                          const filtered = globalBank.filter((q) => {
                            if (globalBankFilter.subtest !== "all" && q.subtest !== globalBankFilter.subtest) return false;
                            if (globalBankFilter.source !== "all" && (q.source ?? "manual") !== globalBankFilter.source) return false;
                            if (globalBankFilter.assigned === "unassigned" && q.assign_count > 0) return false;
                            if (globalBankFilter.assigned === "assigned" && q.assign_count === 0) return false;
                            if (globalBankFilter.search && !q.question_text.toLowerCase().includes(globalBankFilter.search.toLowerCase())) return false;
                            return true;
                          });
                          if (filtered.length === 0) {
                            return (
                              <p className="text-center text-sm text-muted-foreground py-12">
                                {globalBank.length === 0 ? "Bank soal kosong. Tambah soal via Materi & Ekstrak atau Per Tryout." : "Tidak ada soal yang cocok."}
                              </p>
                            );
                          }
                          const allFilteredSelected = filtered.length > 0 && filtered.every((q) => globalBankSelectedIds.has(q.id));
                          const someSelected = filtered.some((q) => globalBankSelectedIds.has(q.id));
                          return (
                            <>
                              {/* Select All row */}
                              <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b">
                                <input
                                  type="checkbox"
                                  checked={allFilteredSelected}
                                  ref={(el) => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                                  onChange={(e) => {
                                    const next = new Set(globalBankSelectedIds);
                                    if (e.target.checked) filtered.forEach((q) => next.add(q.id));
                                    else filtered.forEach((q) => next.delete(q.id));
                                    setGlobalBankSelectedIds(next);
                                  }}
                                  className="h-3.5 w-3.5 rounded accent-primary shrink-0 cursor-pointer"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {allFilteredSelected
                                    ? `Semua ${filtered.length} soal dipilih`
                                    : someSelected
                                    ? `${globalBankSelectedIds.size} dipilih dari ${filtered.length} soal`
                                    : `Pilih semua ${filtered.length} soal`}
                                </span>
                              </div>
                              {filtered.map((q) => {
                            const isSelected = globalBankSelectedIds.has(q.id);
                            return (
                              <div
                                key={q.id}
                                className={cn("flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors", isSelected && "bg-primary/5")}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const next = new Set(globalBankSelectedIds);
                                    e.target.checked ? next.add(q.id) : next.delete(q.id);
                                    setGlobalBankSelectedIds(next);
                                  }}
                                  className="h-3.5 w-3.5 rounded accent-primary shrink-0 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <Badge variant="outline" className="uppercase text-[9px] px-1 py-0 h-4 shrink-0">{q.subtest ?? "tiu"}</Badge>
                                    {q.topic && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">{q.topic}</Badge>}
                                    {(q.source ?? "manual") === "ai"
                                      ? <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-purple-100 text-purple-700 border-purple-300">Dari AI</Badge>
                                      : <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-gray-100 text-gray-600 border-gray-300">Dari Manual</Badge>
                                    }
                                    {q.assign_count === 0
                                      ? <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-yellow-50 text-yellow-700 border-yellow-300">Belum di-assign</Badge>
                                      : <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-blue-50 text-blue-700 border-blue-300">Di {q.assign_count} tryout</Badge>
                                    }
                                  </div>
                                  <p className="text-xs leading-snug line-clamp-2 text-foreground">{q.question_text}</p>
                                </div>
                                <Button
                                  size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1"
                                  onClick={() => {
                                    setGlobalBankSelectedIds(new Set([q.id]));
                                    setDistributeOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3" /> Tryout
                                </Button>
                              </div>
                            );
                          })}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delete confirmation modal */}
                {deleteConfirmOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteConfirmOpen(false); }}>
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-sm">
                      <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="font-semibold text-destructive flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> Hapus Soal
                        </h2>
                        {!deleting && <button onClick={() => setDeleteConfirmOpen(false)}><X className="h-5 w-5" /></button>}
                      </div>
                      <div className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Anda akan menghapus <span className="font-semibold text-foreground">{globalBankSelectedIds.size} soal</span> dari bank soal secara permanen. Soal yang sudah di-assign ke tryout manapun juga akan dihapus dari tryout tersebut.
                        </p>
                        <p className="text-sm font-semibold text-destructive">Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Batal</Button>
                          <Button variant="destructive" onClick={bulkDeleteQuestions} disabled={deleting} className="gap-2">
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Menghapus...</> : <><Trash2 className="h-4 w-4" /> Ya, Hapus</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Distribute modal */}
                {distributeOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) setDistributeOpen(false); }}>
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="font-semibold">Distribute ke Tryout</h2>
                        <button onClick={() => setDistributeOpen(false)}><X className="h-5 w-5" /></button>
                      </div>
                      <div className="p-6 space-y-3">
                        <p className="text-sm text-muted-foreground">{globalBankSelectedIds.size} soal akan ditambahkan ke tryout yang dipilih di bawah (duplikat diabaikan otomatis).</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {exams.map((ex) => {
                            const isTarget = distributeTargetIds.has(ex.id);
                            return (
                              <label key={ex.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors", isTarget ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
                                <input
                                  type="checkbox"
                                  checked={isTarget}
                                  onChange={(e) => {
                                    const next = new Set(distributeTargetIds);
                                    e.target.checked ? next.add(ex.id) : next.delete(ex.id);
                                    setDistributeTargetIds(next);
                                  }}
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{ex.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{ex.total_questions} soal saat ini</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={bulkDistribute}
                            disabled={distributing || distributeTargetIds.size === 0 || globalBankSelectedIds.size === 0}
                            className="flex-1"
                          >
                            {distributing ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Memproses...</> : `Distribute ke ${distributeTargetIds.size} Tryout`}
                          </Button>
                          <Button variant="outline" onClick={() => setDistributeOpen(false)}>Batal</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View: Materi & Ekstrak */}
            {bankView === "materi" && (
              <div className="space-y-4">
                {/* Upload card */}
                <Card>
                  <CardHeader>
                    <h2 className="flex items-center gap-2 font-semibold">
                      <BookOpen className="h-4 w-4 text-primary" /> Upload Materi Referensi
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload PDF atau TXT dari modul SKD, UUD 1945, Pancasila, dll. Bisa pilih banyak file sekaligus — teks diekstrak otomatis di browser.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Drop zone */}
                    <input
                      ref={matFileRef}
                      type="file"
                      accept=".pdf,.txt,.md"
                      multiple
                      className="hidden"
                      onChange={(e) => handleMatFilesChange(e.target.files)}
                    />
                    <div
                      onClick={() => matFileRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleMatFilesChange(e.dataTransfer.files); }}
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Klik atau drag-drop PDF / TXT</p>
                      <p className="text-xs text-muted-foreground">Bisa pilih banyak file sekaligus</p>
                    </div>

                    {/* Queue list */}
                    {matQueue.length > 0 && (
                      <div className="space-y-2">
                        {matQueue.map((q) => (
                          <div key={q.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              {q.status === "extracting" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                              {q.status === "ready" && <FileText className="h-4 w-4 text-green-500 shrink-0" />}
                              {q.status === "error" && <FileText className="h-4 w-4 text-destructive shrink-0" />}
                              <span className="text-xs text-muted-foreground truncate flex-1">{q.file.name}</span>
                              {q.status === "ready" && <span className="text-[10px] text-green-600 shrink-0">{q.text.length.toLocaleString("id-ID")} kar</span>}
                              {q.status === "error" && <span className="text-[10px] text-destructive shrink-0">Gagal</span>}
                              <button onClick={() => removeFromQueue(q.id)} className="ml-1 shrink-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {q.status === "error" && <p className="text-[11px] text-destructive">{q.errorMsg}</p>}
                            {q.status === "ready" && (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                  <Input
                                    placeholder="Judul materi"
                                    value={q.title}
                                    onChange={(e) => updateMatQueueItem(q.id, { title: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <Select value={q.category} onValueChange={(v) => updateMatQueueItem(q.id, { category: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">Umum</SelectItem>
                                    <SelectItem value="twk">TWK</SelectItem>
                                    <SelectItem value="tiu">TIU</SelectItem>
                                    <SelectItem value="tkp">TKP</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="sm:col-span-3">
                                  <Input
                                    placeholder="Topik (opsional) — cth: Pancasila, UUD 1945 Pasal 1-5..."
                                    value={q.topic}
                                    onChange={(e) => updateMatQueueItem(q.id, { topic: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {matQueue.filter((q) => q.status === "ready").length} dari {matQueue.length} file siap disimpan
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setMatQueue([])} className="gap-1 h-8 text-xs">
                              Bersihkan
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveAllMaterials}
                              disabled={matUploading || matQueue.every((q) => q.status !== "ready")}
                              className="gap-1 h-8 text-xs"
                            >
                              {matUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                              {matUploading ? "Menyimpan..." : `Simpan ${matQueue.filter((q) => q.status === "ready").length} Materi`}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daftar materi */}
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold text-sm">Materi Tersimpan ({materials.length})</h2>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {materials.map((m) => {
                        const isExpanded = matExpanded.has(m.id);
                        const isExtractOpen = extractPanelId === m.id;
                        const mChunks = extractChunks[m.id];
                        const totalExtracted = mChunks ? mChunks.reduce((s, c) => s + (c.status === "done" ? c.count : 0), 0) : 0;
                        const allDone = mChunks && mChunks.length > 0 && mChunks.every((c) => c.status === "done");
                        return (
                          <div key={m.id} className="px-4 py-3 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[9px] uppercase px-1 h-4 shrink-0">
                                    {m.category === "general" ? "Umum" : m.category.toUpperCase()}
                                  </Badge>
                                  {m.topic && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">{m.topic}</Badge>}
                                  <span className="text-sm font-semibold">{m.title}</span>
                                  {totalExtracted > 0 && (
                                    <Badge className="text-[9px] px-1 h-4 bg-green-100 text-green-700 border-green-300">
                                      ✓ {totalExtracted} soal{allDone ? "" : " (sebagian)"}
                                    </Badge>
                                  )}
                                </div>
                                {m.description && <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {m.file_name && <span className="mr-2">📄 {m.file_name}</span>}
                                  {(m.char_count ?? 0).toLocaleString("id-ID")} karakter ·{" "}
                                  {new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                                <button
                                  onClick={() => {
                                    const next = new Set(matExpanded);
                                    isExpanded ? next.delete(m.id) : next.add(m.id);
                                    setMatExpanded(next);
                                  }}
                                  className="mt-1 text-[11px] text-primary hover:underline"
                                >
                                  {isExpanded ? "Sembunyikan teks ▲" : "Lihat preview teks ▼"}
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 rounded border bg-muted/30 p-3 text-xs whitespace-pre-wrap line-clamp-10 max-h-48 overflow-y-auto">
                                    {m.extracted_text.slice(0, 2000)}{m.extracted_text.length > 2000 ? "\n\n[... terpotong, total " + m.char_count?.toLocaleString() + " karakter]" : ""}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <Button
                                  size="sm" variant="outline"
                                  className={cn("h-7 text-xs gap-1", isExtractOpen && "border-primary text-primary")}
                                  onClick={() => {
                                    if (isExtractOpen) {
                                      setExtractPanelId(null);
                                    } else {
                                      setExtractPanelId(m.id);
                                      setExtractExamId("");
                                      if (!extractChunks[m.id]) initExtractChunks(m);
                                    }
                                  }}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Ekstrak Soal
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => deleteMaterial(m.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Inline extract panel */}
                            {isExtractOpen && (
                              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Ekstrak soal dari "{m.title}" ke bank soal
                                </p>

                                {/* Exam selector + action buttons */}
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="flex-1 min-w-48">
                                    <Label className="text-[10px] mb-1 block">Tryout tujuan (opsional)</Label>
                                    <Select
                                      value={extractExamId || "__none__"}
                                      onValueChange={(v) => {
                                        setExtractExamId(v === "__none__" ? "" : v);
                                        resetExtractChunks(m);
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs bg-background">
                                        <SelectValue placeholder="Pilih tryout..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Tanpa assign — masuk bank saja</SelectItem>
                                        {exams.map((ex) => (
                                          <SelectItem key={ex.id} value={ex.id}>
                                            {ex.title.slice(0, 60)}{ex.title.length > 60 ? "..." : ""}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-1.5">
                                    {mChunks && mChunks.some((c) => c.status === "idle" || c.status === "error") && (
                                      <Button
                                        size="sm" className="h-8 text-xs gap-1"
                                        disabled={extractRunning}
                                        onClick={() => doExtractQuestions(m, true)}
                                      >
                                        {extractRunning
                                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...</>
                                          : <><Sparkles className="h-3.5 w-3.5" /> {mChunks.every((c) => c.status === "idle") ? "Mulai Ekstrak" : "Lanjutkan"}</>
                                        }
                                      </Button>
                                    )}
                                    {mChunks && mChunks.some((c) => c.status === "done" || c.status === "error") && (
                                      <Button
                                        size="sm" variant="outline" className="h-8 text-xs gap-1"
                                        disabled={extractRunning}
                                        onClick={() => { resetExtractChunks(m); }}
                                        title="Reset semua bagian ke idle"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {!mChunks && (
                                      <Button
                                        size="sm" className="h-8 text-xs gap-1"
                                        onClick={() => { initExtractChunks(m); }}
                                      >
                                        <Sparkles className="h-3.5 w-3.5" /> Mulai Ekstrak
                                      </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={extractRunning} onClick={() => setExtractPanelId(null)}>
                                      Tutup
                                    </Button>
                                  </div>
                                </div>

                                {/* Per-chunk status rows */}
                                {mChunks && (
                                  <div className="space-y-1">
                                    {mChunks.map((cs) => (
                                      <div
                                        key={cs.index}
                                        className={cn(
                                          "flex items-center gap-2 rounded px-2 py-1.5 text-[11px]",
                                          cs.status === "done" && "bg-green-50 border border-green-200",
                                          cs.status === "error" && "bg-red-50 border border-red-200",
                                          cs.status === "processing" && "bg-primary/10 border border-primary/30",
                                          cs.status === "idle" && "bg-background border border-border",
                                        )}
                                      >
                                        <span className="font-medium text-muted-foreground w-16 shrink-0">
                                          Bagian {cs.index + 1}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                          {cs.charCount.toLocaleString("id-ID")} kar
                                        </span>
                                        <span className="flex-1" />
                                        {cs.status === "idle" && <span className="text-muted-foreground">belum diproses</span>}
                                        {cs.status === "processing" && <span className="text-primary flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> memproses...</span>}
                                        {cs.status === "done" && (
                                          <span className="text-green-700 flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            {cs.count > 0 ? `${cs.count} soal` : "0 soal (tidak ada soal ditemukan)"}
                                          </span>
                                        )}
                                        {cs.status === "error" && (
                                          <span className="text-red-600 flex items-center gap-1" title={cs.errorMsg}>
                                            <X className="h-3 w-3" /> Gagal{cs.errorMsg ? ` — ${cs.errorMsg.slice(0, 60)}` : ""}
                                          </span>
                                        )}
                                        {(cs.status === "idle" || cs.status === "error") && !extractRunning && (
                                          <button
                                            className="ml-1 text-[10px] text-primary underline underline-offset-2 hover:no-underline"
                                            onClick={async () => {
                                              const chunks = splitTextIntoChunks(m.extracted_text);
                                              const { data: { session } } = await supabase.auth.getSession();
                                              const token = session?.access_token;
                                              if (!token) return toast.error("Sesi tidak ditemukan");
                                              setExtractRunning(true);
                                              setExtractChunks((prev) => ({
                                                ...prev,
                                                [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "processing" } : c),
                                              }));
                                              try {
                                                const { data, error } = await supabase.functions.invoke("extract-questions", {
                                                  body: { text_chunk: chunks[cs.index], exam_id: extractExamId || undefined, category: m.category, topic: m.topic ?? undefined },
                                                  headers: { Authorization: `Bearer ${token}` },
                                                });
                                                if (error || data?.error) {
                                                  const msg = data?.error ?? error?.message ?? "Gagal";
                                                  setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c) }));
                                                } else {
                                                  setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "done", count: data.count ?? 0, errorMsg: undefined } : c) }));
                                                }
                                              } catch (e: any) {
                                                setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: e.message ?? "Error" } : c) }));
                                              }
                                              setExtractRunning(false);
                                              refresh();
                                              loadGlobalBank();
                                            }}
                                          >
                                            Proses
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {mChunks.length > 0 && (
                                      <p className="text-[10px] text-muted-foreground pt-1">
                                        {mChunks.filter((c) => c.status === "done").length}/{mChunks.length} bagian selesai
                                        {totalExtracted > 0 && ` · ${totalExtracted} soal total`}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {materials.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
                          <BookOpen className="h-8 w-8 opacity-30" />
                          <p className="text-sm">Belum ada materi. Upload PDF atau TXT di atas.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* View: Per Tryout */}
            {bankView === "exam" && (
              <div className="space-y-4">
                {/* Exam selector as cards */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pilih Tryout</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {exams.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => { setBankView("exam"); setSelectedExam(e.id); setFilterSubtest("all"); setFilterTopic("all"); setFilterSource("all"); setAddQuestionMode(null); }}
                    className={cn(
                      "text-left rounded-lg border px-3 py-2.5 transition-all",
                      selectedExam === e.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <p className="text-xs font-semibold leading-snug line-clamp-2">{e.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{e.total_questions} soal</p>
                  </button>
                ))}
                {exams.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4">Belum ada tryout. Buat di tab Tryout.</p>
                )}
              </div>
            </div>

            {selectedExam && (
              <>
                {/* Tombol Tambah dari Bank */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (addQuestionMode === "bank") {
                        setAddQuestionMode(null);
                      } else {
                        setAddQuestionMode("bank");
                        setBankQuestions([]);
                        setSelectedBankIds(new Set());
                      }
                    }}
                    variant={addQuestionMode === "bank" ? "outline" : "default"}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    {addQuestionMode === "bank" ? "Tutup" : "Pilih dari Bank Soal"}
                  </Button>
                </div>

                {/* Bank soal picker */}
                {addQuestionMode === "bank" && (
                  <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                      <h2 className="flex items-center gap-2 font-semibold">
                        <BookOpen className="h-4 w-4 text-green-700" /> Pilih dari Bank Soal
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pilih soal dari bank (semua soal yang pernah dibuat). Soal yang dipilih akan ditambahkan ke tryout ini.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Filter row */}
                      <div className="flex gap-2 flex-wrap">
                        <Select value={bankFilter.subtest} onValueChange={(v) => setBankFilter((f) => ({ ...f, subtest: v }))}>
                          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Subtes</SelectItem>
                            <SelectItem value="twk">TWK</SelectItem>
                            <SelectItem value="tiu">TIU</SelectItem>
                            <SelectItem value="tkp">TKP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Cari teks soal..."
                          value={bankFilter.search}
                          onChange={(e) => setBankFilter((f) => ({ ...f, search: e.target.value }))}
                          className="h-8 text-xs flex-1 min-w-32"
                          onKeyDown={(e) => e.key === "Enter" && loadBankQuestions()}
                        />
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={loadBankQuestions} disabled={bankLoading}>
                          {bankLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cari"}
                        </Button>
                      </div>

                      {/* Random add row */}
                      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-green-300 bg-green-50/50">
                        <span className="text-xs text-muted-foreground shrink-0">Tambah acak:</span>
                        <Select value={bankRandomSubtest} onValueChange={setBankRandomSubtest}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="twk">TWK</SelectItem>
                            <SelectItem value="tiu">TIU</SelectItem>
                            <SelectItem value="tkp">TKP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min={1} max={200}
                          value={bankRandomCount}
                          onChange={(e) => setBankRandomCount(Math.max(1, +e.target.value))}
                          className="h-7 text-xs w-16"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">soal</span>
                        <Button size="sm" className="h-7 text-xs bg-green-700 hover:bg-green-800" onClick={() => addRandomFromBank(bankRandomSubtest, bankRandomCount)}>
                          Tambah Acak
                        </Button>
                      </div>

                      {/* Question list */}
                      {bankLoading && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!bankLoading && bankQuestions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Klik "Cari" untuk muat soal dari bank, atau gunakan "Tambah Acak".
                        </p>
                      )}
                      {bankQuestions.length > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{bankQuestions.length} soal tersedia · {selectedBankIds.size} dipilih</span>
                            <button
                              className="text-xs text-primary hover:underline"
                              onClick={() => {
                                if (selectedBankIds.size === bankQuestions.length) setSelectedBankIds(new Set());
                                else setSelectedBankIds(new Set(bankQuestions.map((q) => q.id)));
                              }}
                            >
                              {selectedBankIds.size === bankQuestions.length ? "Batal semua" : "Pilih semua"}
                            </button>
                          </div>
                          <div className="divide-y divide-border rounded-lg border max-h-80 overflow-y-auto bg-background">
                            {bankQuestions.map((q) => (
                              <label key={q.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent">
                                <input
                                  type="checkbox"
                                  checked={selectedBankIds.has(q.id)}
                                  onChange={(e) => {
                                    const next = new Set(selectedBankIds);
                                    e.target.checked ? next.add(q.id) : next.delete(q.id);
                                    setSelectedBankIds(next);
                                  }}
                                  className="mt-0.5 shrink-0 accent-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap mb-0.5">
                                    <Badge variant="outline" className="uppercase text-[9px] px-1 h-4 shrink-0">{q.subtest}</Badge>
                                    {q.topic && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">{q.topic}</Badge>}
                                  </div>
                                  <p className="text-xs line-clamp-2 text-foreground">{q.question_text}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                          <Button
                            onClick={() => assignFromBank([...selectedBankIds])}
                            disabled={selectedBankIds.size === 0}
                            className="gap-2 bg-green-700 hover:bg-green-800"
                          >
                            <Plus className="h-4 w-4" />
                            Tambah Terpilih ({selectedBankIds.size} soal)
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* AI Generate */}
                {addQuestionMode === "ai" && <>
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" /> Generate Soal via AI
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Setiap generate otomatis menyertakan pembahasan jawaban. Soal & pembahasan disimpan ke bank soal.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label>Subtes</Label>
                        <Select value={aiGen.subtest} onValueChange={(v: any) => setAiGen({ ...aiGen, subtest: v, topic: TOPIC_OPTIONS[v as keyof typeof TOPIC_OPTIONS][0].value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="twk">TWK — Wawasan Kebangsaan</SelectItem>
                            <SelectItem value="tiu">TIU — Intelegensia Umum</SelectItem>
                            <SelectItem value="tkp">TKP — Karakteristik Pribadi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Topik</Label>
                        <Select value={aiGen.topic} onValueChange={(v) => setAiGen({ ...aiGen, topic: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TOPIC_OPTIONS[aiGen.subtest].map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Jumlah Soal (1–30)</Label>
                        <Input
                          type="number" min={1} max={30} value={aiGen.count}
                          onChange={(e) => setAiGen({ ...aiGen, count: Math.max(1, Math.min(30, +e.target.value)) })}
                        />
                      </div>
                    </div>

                    {/* Materi Referensi */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <Label className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-primary" /> Materi Referensi
                        <span className="text-[10px] font-normal text-muted-foreground">(opsional — AI akan buat soal dari materi ini)</span>
                      </Label>
                      <Select
                        value={aiGen.materialId || "none"}
                        onValueChange={(v) => setAiGen({ ...aiGen, materialId: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Pilih materi referensi..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Tanpa materi (gunakan pengetahuan AI) —</SelectItem>
                          {materials
                            .filter((m) => m.category === "general" || m.category === aiGen.subtest)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                [{m.category === "general" ? "Umum" : m.category.toUpperCase()}] {m.title}
                                {m.topic ? ` — ${m.topic}` : ""}
                              </SelectItem>
                            ))}
                          {materials.filter((m) => m.category !== "general" && m.category !== aiGen.subtest).length > 0 && (
                            <>
                              {materials
                                .filter((m) => m.category !== "general" && m.category !== aiGen.subtest)
                                .map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="opacity-60">
                                    [{m.category.toUpperCase()}] {m.title}
                                  </SelectItem>
                                ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {aiGen.materialId && (() => {
                        const mat = materials.find((m) => m.id === aiGen.materialId);
                        return mat ? (
                          <p className="text-[11px] text-primary">
                            ✓ {mat.char_count?.toLocaleString("id-ID")} karakter · {mat.file_name ?? "teks manual"}
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Tipe Soal */}
                    <div className="space-y-2">
                      <Label>Tipe Soal</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {CHART_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const active = aiGen.chartType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAiGen({ ...aiGen, chartType: opt.value, imageFile: null, imageUrl: "" })}
                              className={cn(
                                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs transition-all",
                                active
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-border hover:border-primary/40 hover:bg-accent text-muted-foreground"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {aiGen.chartType !== "none" && (
                        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                          ✓ {CHART_OPTIONS.find(o => o.value === aiGen.chartType)?.desc} — Grafik di-generate otomatis via SVG, gratis & akurat. Tidak perlu image model.
                        </p>
                      )}
                    </div>

                    {/* Upload gambar hanya untuk mode teks saja (foto ilustrasi) */}
                    {aiGen.chartType === "none" && (
                      <div className="rounded border border-dashed border-border p-3 space-y-2">
                        <Label className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Image className="h-3.5 w-3.5" /> Upload Foto/Ilustrasi (Opsional)
                        </Label>
                        <input ref={aiImgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) setAiGen({ ...aiGen, imageFile: f, imageUrl: "" }); }}
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => aiImgRef.current?.click()}>
                            <Upload className="h-3.5 w-3.5 mr-1" />{aiGen.imageFile ? aiGen.imageFile.name : "Pilih Gambar"}
                          </Button>
                          {aiGen.imageFile && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setAiGen({ ...aiGen, imageFile: null, imageUrl: "" })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {aiGen.imageFile && (
                          <img src={URL.createObjectURL(aiGen.imageFile)} alt="Preview" className="max-h-32 rounded border object-contain" />
                        )}
                        <p className="text-xs text-muted-foreground">AI akan membuat soal berdasarkan foto/ilustrasi yang diupload.</p>
                      </div>
                    )}

                    {/* Custom Instruction */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-instruction" className="flex items-center gap-2">
                        Instruksi Kustom
                        <span className="text-[10px] font-normal text-muted-foreground">(opsional)</span>
                      </Label>
                      <Textarea
                        id="custom-instruction"
                        value={aiGen.customInstruction}
                        onChange={(e) => setAiGen({ ...aiGen, customInstruction: e.target.value })}
                        placeholder={`Contoh:\n- Buat soal tentang Pemilu 2024 dan sistem proporsional terbuka\n- Fokus pada kasus nyata di pemerintahan daerah\n- Tingkatkan kesulitan, hindari soal yang terlalu mudah\n- Gunakan konteks ASN di bidang kesehatan`}
                        rows={3}
                        className="resize-none text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Instruksi ini ditambahkan ke prompt AI. Gunakan untuk konteks spesifik, tingkat kesulitan, tema, atau format soal tertentu.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={generateViaAI}
                        disabled={aiStatus === "loading" || aiImageUploading}
                        className="gap-2"
                      >
                        {(aiStatus === "loading" || aiImageUploading)
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Sparkles className="h-4 w-4" />}
                        {aiStatus === "loading" ? "Sedang generate..." : aiImageUploading ? "Upload gambar..." : "Generate via AI"}
                      </Button>
                      {aiStatus === "done" && aiResult && (
                        <span className="text-sm text-green-600 font-medium">
                          ✓ {aiResult.count} / {aiResult.requested} soal + pembahasan ditambahkan
                        </span>
                      )}
                      {aiStatus === "error" && (
                        <span className="text-sm text-destructive">
                          {aiError ? `Gagal: ${aiError.slice(0, 120)}` : "Gagal generate soal. Coba lagi."}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </>}

                {/* Tambah Soal Manual */}
                {addQuestionMode === "manual" && <Card>
                  <CardHeader><h2 className="font-semibold">Tambah Soal Manual</h2></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Subtes</Label>
                      <Select value={newQ.subtest} onValueChange={(v: any) => setNewQ({ ...newQ, subtest: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twk">TWK — Tes Wawasan Kebangsaan</SelectItem>
                          <SelectItem value="tiu">TIU — Tes Intelegensia Umum</SelectItem>
                          <SelectItem value="tkp">TKP — Tes Karakteristik Pribadi (poin 1–5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Topik <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                      <Input
                        value={newQ.topic}
                        onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                        placeholder="cth: Pancasila, Analogi Verbal, Pelayanan Publik..."
                      />
                    </div>

                    {/* Gambar Opsional */}
                    <div className="rounded border border-dashed border-border p-3 space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Image className="h-4 w-4" /> Gambar Soal (Opsional)
                      </Label>
                      <input ref={newQImgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewQImageFile(f); }}
                      />
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button type="button" variant="outline" size="sm" onClick={() => newQImgRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          {newQImageFile ? newQImageFile.name : "Upload Gambar"}
                        </Button>
                        {(newQImageFile || newQ.image_url) && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setNewQImageFile(null); setNewQ({ ...newQ, image_url: "" }); }}>
                            <X className="h-3.5 w-3.5 mr-1" /> Hapus
                          </Button>
                        )}
                      </div>
                      {newQImageFile && (
                        <img src={URL.createObjectURL(newQImageFile)} alt="Preview" className="max-h-32 rounded border object-contain" />
                      )}
                    </div>

                    <div>
                      <Label>Pertanyaan</Label>
                      <Textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} rows={3} />
                    </div>

                    {(["a", "b", "c", "d", "e"] as const).map((k) => (
                      <div key={k} className="grid grid-cols-[1fr_80px] gap-2 items-end">
                        <div>
                          <Label>Opsi {k.toUpperCase()}{k === "e" ? " (opsional)" : ""}</Label>
                          <Input value={(newQ as any)[k]} onChange={(e) => setNewQ({ ...newQ, [k]: e.target.value } as any)} />
                        </div>
                        {newQ.subtest === "tkp" && (
                          <div>
                            <Label>Poin</Label>
                            <Input type="number" min={1} max={5} value={(newQ as any)["p" + k]}
                              onChange={(e) => setNewQ({ ...newQ, ["p" + k]: Math.max(1, Math.min(5, +e.target.value)) } as any)} />
                          </div>
                        )}
                      </div>
                    ))}

                    {newQ.subtest !== "tkp" && (
                      <div>
                        <Label>Jawaban Benar (ketik persis sama dengan opsi)</Label>
                        <Input value={newQ.correct} onChange={(e) => setNewQ({ ...newQ, correct: e.target.value })} />
                      </div>
                    )}

                    <div>
                      <Label>Pembahasan / Penjelasan Jawaban</Label>
                      <Textarea
                        value={newQ.explanation}
                        onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                        placeholder="Tuliskan penjelasan singkat mengapa jawaban tersebut benar..."
                        rows={2}
                      />
                    </div>

                    <Button onClick={addQuestion} disabled={newQUploadingImg}>
                      {newQUploadingImg ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Upload...</> : "Tambah Soal"}
                    </Button>
                  </CardContent>
                </Card>}

                {/* Daftar Soal */}
                {(() => {
                  const uniqueTopics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean))) as string[];
                  const filtered = questions.filter((q) => {
                    if (filterSubtest !== "all" && q.subtest !== filterSubtest) return false;
                    if (filterTopic !== "all" && q.topic !== filterTopic) return false;
                    if (filterSource !== "all") {
                      const isBank = q.exam_id !== selectedExam;
                      if (filterSource === "bank" && !isBank) return false;
                      if (filterSource === "manual" && (isBank || q.source === "ai")) return false;
                      if (filterSource === "ai" && (isBank || q.source !== "ai")) return false;
                    }
                    return true;
                  });
                  return (
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-3">
                        {/* Title row */}
                        <div className="flex items-center flex-wrap gap-2">
                          <h2 className="font-semibold text-sm shrink-0">
                            Management Soal
                            <span className="ml-1.5 text-muted-foreground font-normal">
                              ({filtered.length}{filtered.length !== questions.length ? `/${questions.length}` : ""})
                            </span>
                          </h2>

                          {/* Filters inline */}
                          <div className="flex items-center gap-1.5 flex-wrap flex-1">
                            <Select value={filterSubtest} onValueChange={(v) => setFilterSubtest(v as any)}>
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue placeholder="Semua subtes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Semua subtes</SelectItem>
                                <SelectItem value="twk">TWK</SelectItem>
                                <SelectItem value="tiu">TIU</SelectItem>
                                <SelectItem value="tkp">TKP</SelectItem>
                              </SelectContent>
                            </Select>
                            {uniqueTopics.length > 0 && (
                              <Select value={filterTopic} onValueChange={setFilterTopic}>
                                <SelectTrigger className="h-7 text-xs w-36">
                                  <SelectValue placeholder="Semua topik" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Semua topik</SelectItem>
                                  {uniqueTopics.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Select value={filterSource} onValueChange={setFilterSource}>
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue placeholder="Semua sumber" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Semua sumber</SelectItem>
                                <SelectItem value="manual">Dari Manual</SelectItem>
                                <SelectItem value="ai">Dari AI</SelectItem>
                                <SelectItem value="bank">Dari Bank</SelectItem>
                              </SelectContent>
                            </Select>
                            {(filterSubtest !== "all" || filterTopic !== "all" || filterSource !== "all") && (
                              <button
                                onClick={() => { setFilterSubtest("all"); setFilterTopic("all"); setFilterSource("all"); }}
                                className="text-[10px] text-primary hover:underline shrink-0"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          {/* Update Soal button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0"
                            onClick={syncQuestionCount}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Update Soal
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {filtered.map((q, idx) => {
                            const isExpanded = expandedQ.has(q.id);
                            const globalIdx = questions.indexOf(q) + 1;
                            return (
                              <div key={q.id} className="overflow-hidden">
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                                  onClick={() => toggleExpand(q.id)}
                                >
                                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{globalIdx}.</span>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                      <Badge variant="outline" className="uppercase text-[9px] px-1 py-0 h-4 shrink-0">{q.subtest ?? "tiu"}</Badge>
                                      {q.topic && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">{q.topic}</Badge>}
                                      {q.svg_content && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">Grafik</Badge>}
                                      {q.image_url && !q.svg_content && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">Gambar</Badge>}
                                      {q.exam_id !== selectedExam
                                        ? <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-green-100 text-green-700 border-green-300">Dari Bank</Badge>
                                        : q.source === "ai"
                                          ? <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-purple-100 text-purple-700 border-purple-300">Dari AI</Badge>
                                          : <Badge className="text-[9px] px-1 py-0 h-4 shrink-0 bg-gray-100 text-gray-600 border-gray-300">Dari Manual</Badge>
                                      }
                                    </div>
                                    <p className="text-xs font-medium leading-snug line-clamp-1 text-foreground">{q.question_text}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                                      {q.subtest === "tkp" && q.option_points
                                        ? `Poin: ${Object.values(q.option_points).sort((a, b) => b - a).join(",")}`
                                        : `✓ ${q.correct_answer ?? "-"}`}
                                      {q.explanation ? " · Ada pembahasan" : ""}
                                    </p>
                                  </div>
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                </button>

                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-2 bg-muted/30 space-y-2.5 overflow-hidden">
                                    {/* Topic + badges */}
                                    {q.topic && (
                                      <p className="text-[10px] text-muted-foreground">
                                        Topik: <span className="font-medium text-foreground">{q.topic}</span>
                                      </p>
                                    )}
                                    {q.svg_content && (
                                      <div className="rounded border bg-white p-2 max-w-full [&_svg]:max-w-full [&_svg]:h-auto">
                                        <div dangerouslySetInnerHTML={{ __html: q.svg_content }} />
                                      </div>
                                    )}
                                    {q.image_url && !q.svg_content && (
                                      <img src={q.image_url} alt="Gambar soal" className="max-h-40 rounded border object-contain" />
                                    )}
                                    <div>
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pertanyaan</p>
                                      <p className="text-xs leading-relaxed">{q.question_text}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pilihan Jawaban</p>
                                      <ul className="space-y-1">
                                        {q.options.map((opt) => (
                                          <li key={opt} className={cn(
                                            "text-xs px-2.5 py-1 rounded border",
                                            opt === q.correct_answer ? "border-green-500 bg-green-50 text-green-900 font-medium" : "border-border"
                                          )}>
                                            {opt}
                                            {opt === q.correct_answer && " ✓"}
                                            {q.subtest === "tkp" && q.option_points && ` (${q.option_points[opt]} poin)`}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    {q.explanation && (
                                      <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
                                        <p className="text-[10px] font-semibold text-blue-900 mb-1 uppercase tracking-wide">Pembahasan</p>
                                        <p className="text-xs text-blue-800 leading-relaxed">{q.explanation}</p>
                                      </div>
                                    )}
                                    <div className="flex gap-2 pt-1 flex-wrap">
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(q)}>
                                        <Pencil className="h-3 w-3 mr-1" /> Edit
                                      </Button>
                                      <Button
                                        size="sm" variant="outline"
                                        className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                        onClick={() => removeAssignment(q.id)}
                                      >
                                        <X className="h-3 w-3 mr-1" /> Lepas dari Tryout
                                      </Button>
                                      {q.exam_id === selectedExam && (
                                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteQ(q.id)}>
                                          <Trash2 className="h-3 w-3 mr-1" /> Hapus
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {filtered.length === 0 && (
                            <p className="px-6 py-8 text-sm text-muted-foreground text-center">
                              {questions.length === 0 ? "Belum ada soal. Generate via AI atau tambah manual." : "Tidak ada soal yang cocok dengan filter."}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
              </div>
            )}
          </TabsContent>

          {/* ── TRYOUT ── */}
          <TabsContent value="exams" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewExamForm((v) => !v)} variant={showNewExamForm ? "outline" : "default"} className="gap-2">
                <Plus className="h-4 w-4" />
                {showNewExamForm ? "Tutup Form" : "Buat Tryout Baru"}
              </Button>
            </div>

            {/* Create new — collapsible */}
            {showNewExamForm && (
              <Card>
                <CardHeader><h2 className="font-semibold text-sm">Buat Tryout Baru</h2></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Judul *</Label><Input placeholder="cth: SKD CPNS Premium - Paket 1" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} /></div>
                  <div><Label>Deskripsi</Label><Textarea placeholder="Ringkasan singkat" value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Durasi (detik) <span className="text-muted-foreground text-xs font-normal">— otomatis 60 menit/paket</span></Label>
                      <Input type="number" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Paket</Label>
                      <Input
                        type="number" min={1} value={newExam.bundle_size}
                        onChange={(e) => {
                          const n = Math.max(1, +e.target.value);
                          setNewExam({ ...newExam, bundle_size: n, duration: n * 3600 });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Harga (Rp)</Label><Input type="number" placeholder="0 = gratis" value={newExam.price} onChange={(e) => setNewExam({ ...newExam, price: +e.target.value })} /></div>
                    <div><Label>Harga Coret (Rp)</Label><Input type="number" placeholder="opsional" value={newExam.original_price} onChange={(e) => setNewExam({ ...newExam, original_price: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Kategori *</Label>
                      <Select value={newExam.category} onValueChange={(v) => setNewExam({ ...newExam, category: v, subcategory: "" })}>
                        <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                        <SelectContent><SelectItem value="cpns">CPNS</SelectItem><SelectItem value="pppk">PPPK</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subkategori *</Label>
                      {(() => {
                        const opts = Array.from(new Set(exams.filter((e) => e.category === newExam.category).map((e) => e.subcategory).filter(Boolean)));
                        const inList = opts.includes(newExam.subcategory);
                        const showInput = !inList;
                        return (
                          <div className="space-y-1.5">
                            <Select
                              value={inList ? newExam.subcategory : (opts.length > 0 ? "__lainnya__" : "")}
                              onValueChange={(v) => setNewExam({ ...newExam, subcategory: v === "__lainnya__" ? "" : v })}
                            >
                              <SelectTrigger><SelectValue placeholder="Pilih subkategori..." /></SelectTrigger>
                              <SelectContent>
                                {opts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                <SelectItem value="__lainnya__">Lainnya (ketik sendiri)...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(showInput || opts.length === 0) && (
                              <Input
                                placeholder="cth: SKD, SKB Bidan"
                                maxLength={80}
                                value={newExam.subcategory}
                                onChange={(e) => setNewExam({ ...newExam, subcategory: e.target.value })}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Skor Lulus</Label><Input type="number" placeholder="0 = tidak ada batas" value={newExam.passing_score} onChange={(e) => setNewExam({ ...newExam, passing_score: +e.target.value })} /></div>
                  </div>
                  <div><Label>CTA Link Beli <span className="text-muted-foreground text-xs">(opsional — misal WhatsApp atau link eksternal)</span></Label>
                    <Input placeholder="https://wa.me/62..." value={newExam.cta_link} onChange={(e) => setNewExam({ ...newExam, cta_link: e.target.value })} />
                  </div>
                  <Button onClick={async () => { await addExam(); setShowNewExamForm(false); }}>Buat Tryout</Button>
                </CardContent>
              </Card>
            )}

            {/* Existing exams */}
            <Card>
              <CardHeader><h2 className="font-semibold text-sm">Paket Tryout ({exams.length})</h2></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {exams.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="uppercase text-[9px] px-1 h-4 shrink-0">{ex.category || "—"}</Badge>
                          {ex.subcategory && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">{ex.subcategory}</Badge>}
                          <span className="text-xs font-semibold truncate">{ex.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {ex.total_questions} soal ·{" "}
                          {ex.price === 0 ? "Gratis" : `Rp ${ex.price.toLocaleString("id-ID")}`}
                          {ex.original_price ? ` (coret: Rp ${ex.original_price.toLocaleString("id-ID")})` : ""}
                          {" · "}{Math.floor(ex.duration / 60)} menit
                          {ex.cta_link ? " · Ada CTA link" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditExam(ex)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => duplicateExam(ex)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteExam(ex.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {exams.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground text-center">Belum ada paket tryout.</p>}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ── LYNK WEBHOOK ── */}
          {/* ── SKOR USER ── */}
          <TabsContent value="scores">
            <Card>
              <CardHeader><h2 className="font-semibold text-sm">Semua Skor User ({scores.length})</h2></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead><tr className="text-left text-muted-foreground bg-muted/50 border-b">
                      <th className="px-4 py-2 font-medium">User</th>
                      <th className="px-4 py-2 font-medium">Tryout</th>
                      <th className="px-4 py-2 font-medium text-right">Skor</th>
                      <th className="px-4 py-2 font-medium">Tanggal</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {scores.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2">
                            <div className="font-medium">{s.profiles?.username ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{s.profiles?.email}</div>
                          </td>
                          <td className="px-4 py-2 max-w-[240px]">
                            <div className="truncate">{s.exams?.title ?? "—"}</div>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-primary">{s.score}</td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                            {new Date(s.completed_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                      {scores.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada skor.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── HISTORY TRANSAKSI ── */}
          <TabsContent value="topups">
            <Card>
              <CardHeader><h2 className="font-semibold text-sm">History Pembelian Paket ({purchases.length})</h2></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-muted/50 text-left border-b"><tr>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">User</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Paket</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{p.profiles?.username ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{p.profiles?.email}</div>
                          </td>
                          <td className="px-4 py-2 max-w-[240px]">
                            <div className="truncate">{p.exams?.title ?? "—"}</div>
                          </td>
                        </tr>
                      ))}
                      {purchases.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Belum ada transaksi.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SEMUA USER ── */}
          <TabsContent value="balances">
            <Card>
              <CardHeader><h2 className="font-semibold text-sm">Semua User ({balances.length})</h2></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-xs">
                    <thead className="bg-muted/50 text-left border-b"><tr>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Username</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {balances.map((b) => (
                        <tr key={b.user_id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{b.profiles?.username ?? "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{b.profiles?.email ?? "—"}</td>
                        </tr>
                      ))}
                      {balances.length === 0 && (
                        <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">Belum ada user.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PENGATURAN ── */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold"><Key className="h-4 w-4" /> Konfigurasi API</h2>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="kie-key">KIE AI API Key</Label>
                  <div className="relative">
                    <Input
                      id="kie-key"
                      type={showApiKey ? "text" : "password"}
                      value={kieApiKey}
                      onChange={(e) => { setKieApiKey(e.target.value); setKeyStatus("idle"); setKeyMessage(""); }}
                      placeholder="Masukkan KIE API Key..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dapatkan API key di{" "}
                    <a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      kie.ai/api-key
                    </a>
                    . API key disimpan terenkripsi di database dan hanya bisa diakses oleh admin.
                  </p>
                </div>
                <Button
                  onClick={saveApiKey}
                  disabled={savingKey || keyStatus === "testing"}
                  className="gap-2"
                >
                  {(savingKey || keyStatus === "testing")
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Key className="h-4 w-4" />}
                  {keyStatus === "testing" ? "Mengecek koneksi..." : savingKey ? "Menyimpan..." : "Simpan & Cek Koneksi"}
                </Button>

                {keyStatus === "ok" && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{keyMessage}</span>
                  </div>
                )}
                {keyStatus === "error" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                    <X className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{keyMessage}</span>
                  </div>
                )}
                {keyStatus === "idle" && kieApiKey && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    API key tersimpan. Klik "Simpan &amp; Cek Koneksi" untuk verifikasi ulang.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lynk Webhook Settings */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Lynk Webhook</h2>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                {/* Webhook URL */}
                <div className="space-y-1.5">
                  <Label>URL Webhook</Label>
                  <div className="flex gap-2">
                    <Input readOnly value="https://equfmmkjtedbhyfypxwg.supabase.co/functions/v1/lynk-webhook" className="text-xs font-mono bg-muted" />
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => {
                      navigator.clipboard.writeText("https://equfmmkjtedbhyfypxwg.supabase.co/functions/v1/lynk-webhook");
                      toast.success("URL disalin");
                    }}>Copy</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Daftarkan URL ini di pengaturan webhook Lynk.</p>
                </div>

                {/* Merchant Key */}
                <div className="space-y-2">
                  <Label>Merchant Key</Label>
                  <div className="relative">
                    <Input
                      type={showLynkKey ? "text" : "password"}
                      value={lynkMerchantKey}
                      onChange={(e) => setLynkMerchantKey(e.target.value)}
                      placeholder="Paste merchant key dari Lynk..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLynkKey(!showLynkKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLynkKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digunakan untuk memverifikasi bahwa request webhook benar-benar dari Lynk. Salin dari dashboard Lynk → Webhook → Merchant Key.
                  </p>
                  <Button onClick={saveLynkKey} disabled={savingLynkKey} className="gap-2">
                    {savingLynkKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    {savingLynkKey ? "Menyimpan..." : "Simpan Merchant Key"}
                  </Button>
                  {lynkMerchantKey && !savingLynkKey && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0" /> Merchant Key tersimpan.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Package Configurations (Lynk) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Package Configurations ({lynkPackages.length})</h2>
                  <Button size="sm" onClick={() => setShowNewLynkForm((v) => !v)} variant={showNewLynkForm ? "outline" : "default"} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {showNewLynkForm ? "Tutup" : "Tambah Package"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {showNewLynkForm && (
                  <Card className="border-dashed">
                    <CardHeader><h2 className="font-semibold text-sm">Konfigurasi Package Baru</h2></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Lynk UUID *</Label>
                          <Input placeholder="691fd44f389..." value={newLynkPkg.lynk_uuid} onChange={(e) => setNewLynkPkg({ ...newLynkPkg, lynk_uuid: e.target.value })} />
                          <p className="text-[10px] text-muted-foreground mt-1">UUID product dari Lynk webhook (items[0].uuid)</p>
                        </div>
                        <div>
                          <Label>Title *</Label>
                          <Input placeholder="cth: Paket Premium CPNS" value={newLynkPkg.title} onChange={(e) => setNewLynkPkg({ ...newLynkPkg, title: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Exam yang Diberi Akses *</Label>
                        <Select value={newLynkPkg.exam_id} onValueChange={(v) => setNewLynkPkg({ ...newLynkPkg, exam_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Pilih exam..." /></SelectTrigger>
                          <SelectContent>
                            {exams.map((ex) => <SelectItem key={ex.id} value={ex.id}>{ex.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Notification Title</Label>
                          <Input placeholder="cth: Pembelian Berhasil!" value={newLynkPkg.notification_title} onChange={(e) => setNewLynkPkg({ ...newLynkPkg, notification_title: e.target.value })} />
                        </div>
                        <div>
                          <Label>Notification Message</Label>
                          <Input placeholder="cth: Akses exam Anda sudah aktif." value={newLynkPkg.notification_message} onChange={(e) => setNewLynkPkg({ ...newLynkPkg, notification_message: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Transaction Description</Label>
                        <Input placeholder="cth: Pembelian Paket SKD CPNS Premium" value={newLynkPkg.description} onChange={(e) => setNewLynkPkg({ ...newLynkPkg, description: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setNewLynkPkg({ ...newLynkPkg, is_active: !newLynkPkg.is_active })}
                          className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors", newLynkPkg.is_active ? "bg-primary" : "bg-muted-foreground/40")}
                        >
                          <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", newLynkPkg.is_active ? "translate-x-4" : "translate-x-0")} />
                        </button>
                        <Label className="cursor-pointer" onClick={() => setNewLynkPkg({ ...newLynkPkg, is_active: !newLynkPkg.is_active })}>Active</Label>
                      </div>
                      <Button onClick={addLynkPkg}>Simpan Package</Button>
                    </CardContent>
                  </Card>
                )}

                <div className="divide-y divide-border rounded-lg border overflow-hidden">
                  {lynkPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", pkg.is_active ? "bg-green-500" : "bg-muted-foreground/40")} />
                          <span className="text-sm font-semibold">{pkg.title}</span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{pkg.lynk_uuid}</p>
                        <p className="text-[11px] text-muted-foreground">
                          → {pkg.exams?.title ?? <span className="text-destructive">Tidak ada exam terhubung</span>}
                        </p>
                        {pkg.description && <p className="text-[10px] text-muted-foreground italic">{pkg.description}</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditLynkPkg(pkg)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteLynkPkg(pkg.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {lynkPackages.length === 0 && (
                    <p className="px-4 py-8 text-sm text-muted-foreground text-center">Belum ada konfigurasi package Lynk.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Question Modal */}
      {editQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditQ(null); }}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Edit Soal</h2>
              <button onClick={() => setEditQ(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Subtes</Label>
                <Select value={editQ.subtest} onValueChange={(v) => setEditQ({ ...editQ, subtest: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twk">TWK</SelectItem>
                    <SelectItem value="tiu">TIU</SelectItem>
                    <SelectItem value="tkp">TKP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Topik <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                <Input
                  value={editQ.topic}
                  onChange={(e) => setEditQ({ ...editQ, topic: e.target.value })}
                  placeholder="cth: Pancasila, Analogi Verbal, Pelayanan Publik..."
                />
              </div>

              {/* Edit image */}
              <div className="rounded border border-dashed p-3 space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground"><Image className="h-4 w-4" /> Gambar Soal</Label>
                <input ref={editImgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditImageFile(f); }}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => editImgRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" />{editImageFile ? editImageFile.name : "Ganti Gambar"}
                  </Button>
                  {(editImageFile || editQ.image_url) && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setEditImageFile(null); setEditQ({ ...editQ, image_url: "" }); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Hapus Gambar
                    </Button>
                  )}
                </div>
                {editImageFile
                  ? <img src={URL.createObjectURL(editImageFile)} alt="Preview" className="max-h-32 rounded border object-contain" />
                  : editQ.image_url
                    ? <img src={editQ.image_url} alt="Gambar saat ini" className="max-h-32 rounded border object-contain" />
                    : null}
              </div>

              <div>
                <Label>Pertanyaan</Label>
                <Textarea value={editQ.question_text} onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })} rows={3} />
              </div>

              {(["a", "b", "c", "d", "e"] as const).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_80px] gap-2 items-end">
                  <div>
                    <Label>Opsi {k.toUpperCase()}</Label>
                    <Input value={(editQ as any)[k]} onChange={(e) => setEditQ({ ...editQ, [k]: e.target.value } as any)} />
                  </div>
                  {editQ.subtest === "tkp" && (
                    <div>
                      <Label>Poin</Label>
                      <Input type="number" min={1} max={5} value={(editQ as any)["p" + k]}
                        onChange={(e) => setEditQ({ ...editQ, ["p" + k]: Math.max(1, Math.min(5, +e.target.value)) } as any)} />
                    </div>
                  )}
                </div>
              ))}

              {editQ.subtest !== "tkp" && (
                <div>
                  <Label>Jawaban Benar</Label>
                  <Input value={editQ.correct} onChange={(e) => setEditQ({ ...editQ, correct: e.target.value })} />
                </div>
              )}

              <div>
                <Label>Pembahasan / Penjelasan</Label>
                <Textarea value={editQ.explanation} onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })} rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit} disabled={editUploadingImg} className="flex-1">
                  {editUploadingImg ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Upload...</> : "Simpan Perubahan"}
                </Button>
                <Button variant="outline" onClick={() => setEditQ(null)}>Batal</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lynk Package Modal */}
      {editLynkPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditLynkPkg(null); }}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Edit Package</h2>
              <button onClick={() => setEditLynkPkg(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Lynk UUID *</Label>
                  <Input value={editLynkPkg.lynk_uuid} onChange={(e) => setEditLynkPkg({ ...editLynkPkg, lynk_uuid: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground mt-1">UUID product dari Lynk webhook (items[0].uuid)</p>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input value={editLynkPkg.title} onChange={(e) => setEditLynkPkg({ ...editLynkPkg, title: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Exam yang Diberi Akses</Label>
                <Select value={editLynkPkg.exam_id ?? ""} onValueChange={(v) => setEditLynkPkg({ ...editLynkPkg, exam_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Pilih exam..." /></SelectTrigger>
                  <SelectContent>
                    {exams.map((ex) => <SelectItem key={ex.id} value={ex.id}>{ex.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Notification Title</Label>
                  <Input value={editLynkPkg.notification_title ?? ""} onChange={(e) => setEditLynkPkg({ ...editLynkPkg, notification_title: e.target.value })} />
                </div>
                <div>
                  <Label>Notification Message</Label>
                  <Input value={editLynkPkg.notification_message ?? ""} onChange={(e) => setEditLynkPkg({ ...editLynkPkg, notification_message: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Transaction Description</Label>
                <Input value={editLynkPkg.description ?? ""} onChange={(e) => setEditLynkPkg({ ...editLynkPkg, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditLynkPkg({ ...editLynkPkg, is_active: !editLynkPkg.is_active })}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                    editLynkPkg.is_active ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                >
                  <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", editLynkPkg.is_active ? "translate-x-4" : "translate-x-0")} />
                </button>
                <Label className="cursor-pointer" onClick={() => setEditLynkPkg({ ...editLynkPkg, is_active: !editLynkPkg.is_active })}>
                  Active
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveLynkPkg}>Update</Button>
                <Button variant="destructive" onClick={() => { deleteLynkPkg(editLynkPkg.id); setEditLynkPkg(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button variant="outline" onClick={() => setEditLynkPkg(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {editExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setEditExam(null); setEditExamCoverFile(null); } }}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Edit Paket Tryout</h2>
              <button onClick={() => { setEditExam(null); setEditExamCoverFile(null); }}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <Label>Judul *</Label>
                <Input value={editExam.title} onChange={(e) => setEditExam({ ...editExam, title: e.target.value })} />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea value={editExam.description ?? ""} onChange={(e) => setEditExam({ ...editExam, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kategori *</Label>
                  <Select value={editExam.category} onValueChange={(v) => setEditExam({ ...editExam, category: v, subcategory: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cpns">CPNS</SelectItem><SelectItem value="pppk">PPPK</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subkategori *</Label>
                  {(() => {
                    const opts = Array.from(new Set(exams.filter((e) => e.category === editExam.category).map((e) => e.subcategory).filter(Boolean)));
                    const inList = opts.includes(editExam.subcategory);
                    const showInput = !inList;
                    return (
                      <div className="space-y-1.5">
                        <Select
                          value={inList ? editExam.subcategory : "__lainnya__"}
                          onValueChange={(v) => setEditExam({ ...editExam, subcategory: v === "__lainnya__" ? "" : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Pilih subkategori..." /></SelectTrigger>
                          <SelectContent>
                            {opts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            <SelectItem value="__lainnya__">Lainnya (ketik sendiri)...</SelectItem>
                          </SelectContent>
                        </Select>
                        {showInput && (
                          <Input
                            placeholder="Ketik subkategori baru..."
                            value={editExam.subcategory}
                            onChange={(e) => setEditExam({ ...editExam, subcategory: e.target.value })}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Durasi (detik) <span className="text-muted-foreground text-xs font-normal">— otomatis 60 menit/paket</span></Label>
                  <Input type="number" value={editExam.duration} onChange={(e) => setEditExam({ ...editExam, duration: +e.target.value })} />
                </div>
                <div>
                  <Label>Paket</Label>
                  <Input
                    type="number" min={1} value={editExam.bundle_size}
                    onChange={(e) => {
                      const n = Math.max(1, +e.target.value);
                      setEditExam({ ...editExam, bundle_size: n, duration: n * 3600 });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga (Rp)</Label>
                  <Input type="number" value={editExam.price} onChange={(e) => setEditExam({ ...editExam, price: +e.target.value })} />
                </div>
                <div>
                  <Label>Harga Coret (Rp)</Label>
                  <Input type="number" value={editExam.original_price ?? 0} onChange={(e) => setEditExam({ ...editExam, original_price: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Skor Lulus</Label>
                <Input type="number" value={editExam.passing_score ?? 0} onChange={(e) => setEditExam({ ...editExam, passing_score: +e.target.value })} />
              </div>
              <div>
                <Label>CTA Link Beli <span className="text-muted-foreground text-xs">(WhatsApp / link eksternal — kosongkan untuk beli via saldo)</span></Label>
                <Input value={editExam.cta_link ?? ""} onChange={(e) => setEditExam({ ...editExam, cta_link: e.target.value })} placeholder="https://wa.me/62..." />
              </div>
              <div>
                <Label>Gambar Cover <span className="text-muted-foreground text-xs">(opsional — tampil di card Beli Paket)</span></Label>
                <input ref={editExamCoverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditExamCoverFile(f); }} />
                <div className="mt-1.5 flex gap-2 items-center flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => editExamCoverRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {editExamCoverFile ? editExamCoverFile.name : "Upload Gambar Cover"}
                  </Button>
                  {(editExamCoverFile || editExam.cover_image_url) && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setEditExamCoverFile(null); setEditExam({ ...editExam, cover_image_url: null }); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Hapus
                    </Button>
                  )}
                </div>
                {editExamCoverFile ? (
                  <img src={URL.createObjectURL(editExamCoverFile)} alt="Preview" className="mt-2 max-h-36 w-full rounded-lg border object-cover" />
                ) : editExam.cover_image_url ? (
                  <img src={editExam.cover_image_url} alt="Cover saat ini" className="mt-2 max-h-36 w-full rounded-lg border object-cover" />
                ) : null}
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveExam} disabled={editExamCoverUploading}>
                  {editExamCoverUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Upload...</> : "Simpan Perubahan"}
                </Button>
                <Button variant="outline" onClick={() => { setEditExam(null); setEditExamCoverFile(null); }}>Batal</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Admin;
