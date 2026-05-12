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
  Trash2, Check, X, Plus, Sparkles, Loader2,
  Pencil, Image, Upload, Key, Eye, EyeOff, ChevronLeft, ChevronDown, ChevronUp,
  RotateCcw, Copy,
  BookOpen, FileText, Package, MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { extractTextFromFile } from "@/lib/extractPdfText";
import {
  ChartType, CHART_OPTIONS, TOPIC_OPTIONS,
  Exam, Question, BankQuestion, Score, Topup, UserBalance, Purchase,
  Material, MatQueueItem, ChunkStatus, LynkPackage, EditQ, GlobalBankQ,
  emptyNewQ, VALID_TABS, BANK_VIEWS,
} from "@/types/admin";
import { splitTextIntoChunks } from "@/lib/adminUtils";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import { GlobalBankTable } from "@/components/admin/GlobalBankTable";
import { MaterialRow } from "@/components/admin/MaterialRow";

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
  const [bankListMode, setBankListMode] = useState<null | "manual" | "ai" | "image">(null);

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
  const [materialQuestionCounts, setMaterialQuestionCounts] = useState<Record<string, number>>({});

  // Global bank list (Daftar Soal view)
  const [globalBank, setGlobalBank] = useState<GlobalBankQ[]>([]);
  const [globalBankLoading, setGlobalBankLoading] = useState(false);
  const [globalBankFilter, setGlobalBankFilter] = useState({ subtest: "all", source: "all", assigned: "all", search: "" });
  const [bankPage, setBankPage] = useState(0);
  const [bankTotalCount, setBankTotalCount] = useState(0);
  const BANK_PAGE_SIZE = 100;
  const [globalBankSelectedIds, setGlobalBankSelectedIds] = useState<Set<string>>(new Set());
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeTargetIds, setDistributeTargetIds] = useState<Set<string>>(new Set());
  const [distributing, setDistributing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reExtractConfirmMat, setReExtractConfirmMat] = useState<Material | null>(null);
  const [reExtractStats, setReExtractStats] = useState<{ total: number; assigned: number } | null>(null);
  const [reExtracting, setReExtracting] = useState(false);

  // Lynk packages
  const [lynkPackages, setLynkPackages] = useState<LynkPackage[]>([]);
  const emptyLynkPkg = () => ({ lynk_uuid: "", exam_id: "", title: "", is_active: true, description: "", notification_title: "", notification_message: "" });
  const [newLynkPkg, setNewLynkPkg] = useState(emptyLynkPkg());
  const [editLynkPkg, setEditLynkPkg] = useState<LynkPackage | null>(null);
  const [showNewLynkForm, setShowNewLynkForm] = useState(false);

  // New exam form
  const [newExam, setNewExam] = useState({ title: "", description: "", duration: 5400, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "", passing_score: 0, cta_link: "" });
  // Edit exam modal
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [editExamCoverFile, setEditExamCoverFile] = useState<File | null>(null);
  const [editExamCoverUploading, setEditExamCoverUploading] = useState(false);
  const editExamCoverRef = useRef<HTMLInputElement>(null);
  const [addSubPkgParent, setAddSubPkgParent] = useState<Exam | null>(null);
  const [subPkgDuration, setSubPkgDuration] = useState(90); // minutes

  // AI Generate
  const [aiGen, setAiGen] = useState({
    subtest: "twk" as "twk" | "tiu" | "tkp", topic: "nasionalisme", count: 10,
    customTopic: "",
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
  const [selectedParentExam, setSelectedParentExam] = useState<string | null>(null);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());

  // Settings
  const [kieApiKey, setKieApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [keyMessage, setKeyMessage] = useState("");

  const [lynkMerchantKey, setLynkMerchantKey] = useState("");
  const [showLynkKey, setShowLynkKey] = useState(false);

  // Meta Pixel
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaCapiToken, setMetaCapiToken] = useState("");
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [savingPixel, setSavingPixel] = useState(false);
  const [savingLynkKey, setSavingLynkKey] = useState(false);

  // WhatsApp Settings
  const [adminWaNumber, setAdminWaNumber] = useState("6289611777177");
  const [adminWaText, setAdminWaText] = useState("Halo Admin, saya ingin konsultasi mengenai Ruang CASN.");
  const [savingWa, setSavingWa] = useState(false);

  const refresh = async () => {
    const { data: e } = await supabase.from("exams")
      .select("id,title,total_questions,description,duration,price,original_price,bundle_size,category,subcategory,exam_type,passing_score,cta_link,cover_image_url,parent_exam_id")
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

  const loadGlobalBank = async (page = 0, filter = globalBankFilter) => {
    setGlobalBankLoading(true);
    const start = page * BANK_PAGE_SIZE;
    const end = start + BANK_PAGE_SIZE - 1;

    let query = supabase
      .from("questions")
      .select("id, question_text, subtest, topic, source, exam_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (filter.subtest !== "all") query = query.eq("subtest", filter.subtest);
    if (filter.source === "ai") query = query.eq("source", "ai");
    else if (filter.source === "manual") query = (query as any).or("source.is.null,source.eq.manual");
    if (filter.search) query = query.ilike("question_text", `%${filter.search}%`);

    const { data: qs, count } = await query;

    const pageIds = (qs ?? []).map((q: any) => q.id);
    const countMap: Record<string, number> = {};
    if (pageIds.length > 0) {
      const { data: asgns } = await (supabase as any)
        .from("exam_question_assignments")
        .select("question_id")
        .in("question_id", pageIds);
      (asgns ?? []).forEach((a: any) => {
        countMap[a.question_id] = (countMap[a.question_id] ?? 0) + 1;
      });
    }

    const result: GlobalBankQ[] = (qs ?? []).map((q: any) => ({
      ...q,
      assign_count: countMap[q.id] ?? 0,
    }));
    setGlobalBank(result);
    setBankPage(page);
    setBankTotalCount(count ?? 0);
    setGlobalBankLoading(false);
  };

  const handleBankFilterChange = (newFilter: typeof globalBankFilter) => {
    setGlobalBankFilter(newFilter);
    if (
      newFilter.subtest !== globalBankFilter.subtest ||
      newFilter.source !== globalBankFilter.source ||
      newFilter.search !== globalBankFilter.search
    ) {
      loadGlobalBank(0, newFilter);
    }
  };

  useEffect(() => { refresh(); }, [selectedExam]);

  useEffect(() => {
    if (activeTab === "bank" && bankView === "list") {
      loadGlobalBank();
    }
  }, [activeTab, bankView]);

  // Load saved keys on mount
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("admin_settings").select("key,value").in("key", ["kie_api_key", "lynk_merchant_key", "meta_pixel_id", "meta_capi_token", "wa_number", "wa_text"]);
      (rows ?? []).forEach((r: any) => {
        if (r.key === "kie_api_key") setKieApiKey(r.value);
        if (r.key === "lynk_merchant_key") setLynkMerchantKey(r.value);
        if (r.key === "meta_pixel_id") setMetaPixelId(r.value ?? "");
        if (r.key === "meta_capi_token") setMetaCapiToken(r.value ?? "");
        if (r.key === "wa_number") setAdminWaNumber(r.value ?? "6289611777177");
        if (r.key === "wa_text") setAdminWaText(r.value ?? "Halo Admin, saya ingin konsultasi mengenai Ruang CASN.");
      });
    })();
  }, []);

  // Restore extract chunk progress from localStorage (survives tab switches)
  useEffect(() => {
    const saved = localStorage.getItem("admin-extract-chunks-v1");
    if (saved) {
      try { setExtractChunks(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Persist extract chunks to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(extractChunks).length > 0) {
      localStorage.setItem("admin-extract-chunks-v1", JSON.stringify(extractChunks));
    }
  }, [extractChunks]);

  // Fetch actual question counts from DB per material (ground truth for old sessions)
  // Stable string dep prevents re-running on every refresh() that creates a new materials array ref
  const materialIdsKey = materials.map((m) => m.id).join(",");
  useEffect(() => {
    if (materials.length === 0) return;
    Promise.all(
      materials.map(async (m) => {
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("material_id", m.id);
        return [m.id, count ?? 0] as [string, number];
      })
    ).then((results) => {
      setMaterialQuestionCounts(Object.fromEntries(results));
    });
  }, [materialIdsKey]);

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

  const savePixelSettings = async () => {
    setSavingPixel(true);
    const upserts = [
      { key: "meta_pixel_id", value: metaPixelId },
      { key: "meta_capi_token", value: metaCapiToken }
    ];
    const { error } = await supabase.from("admin_settings").upsert(upserts, { onConflict: "key" });
    setSavingPixel(false);
    if (error) return toast.error("Gagal simpan pixel: " + error.message);
    toast.success("Pengaturan Pixel & CAPI disimpan");
  };

  const saveWaSettings = async () => {
    setSavingWa(true);
    const { error } = await supabase.from("admin_settings").upsert([
      { key: "wa_number", value: adminWaNumber },
      { key: "wa_text", value: adminWaText },
    ], { onConflict: "key" });
    setSavingWa(false);
    if (error) return toast.error("Gagal simpan WA: " + error.message);
    toast.success("Pengaturan WhatsApp disimpan");
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
    const { data: created, error } = await supabase.from("exams").insert({ ...newExam, title: newExam.title.trim(), total_questions: 0 }).select("id").single();
    if (error) return toast.error(error.message);

    if (newExam.bundle_size > 1 && created) {
      const subPkgs = Array.from({ length: newExam.bundle_size }, (_, i) => ({
        title: `${newExam.title.trim()} - Paket ${String.fromCharCode(65 + i)}`,
        parent_exam_id: created.id,
        duration: 6000,
        price: 0,
        original_price: 0,
        bundle_size: 1,
        category: newExam.category,
        subcategory: newExam.subcategory,
        passing_score: newExam.passing_score ?? 0,
        total_questions: 0,
      }));
      const { error: subErr } = await supabase.from("exams").insert(subPkgs);
      if (subErr) toast.error("Sub-paket gagal dibuat: " + subErr.message);
      else toast.success(`Tryout + ${newExam.bundle_size} sub-paket berhasil dibuat`);
    } else {
      toast.success("Tryout dibuat");
    }

    setNewExam({ title: "", description: "", duration: 5400, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "", passing_score: 0, cta_link: "" });
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

    // Auto-create missing sub-packages if bundle_size increased
    if (editExam.bundle_size > 1) {
      const existing = exams.filter((e) => e.parent_exam_id === editExam.id);
      const missing = editExam.bundle_size - existing.length;
      if (missing > 0) {
        const newSubPkgs = Array.from({ length: missing }, (_, i) => ({
          title: `${editExam.title.trim()} - Paket ${String.fromCharCode(65 + existing.length + i)}`,
          parent_exam_id: editExam.id,
          duration: 6000,
          price: 0,
          original_price: 0,
          bundle_size: 1,
          category: editExam.category,
          subcategory: editExam.subcategory,
          passing_score: editExam.passing_score ?? 0,
          total_questions: 0,
        }));
        const { error: subErr } = await supabase.from("exams").insert(newSubPkgs);
        if (subErr) toast.error("Sub-paket baru gagal dibuat: " + subErr.message);
        else toast.success(`Paket diperbarui + ${missing} sub-paket baru`);
      } else {
        toast.success("Paket tryout diperbarui");
      }
    } else {
      toast.success("Paket tryout diperbarui");
    }

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

  const addSubPackage = async (parent: Exam) => {
    const siblings = exams.filter((e) => e.parent_exam_id === parent.id);
    const letter = String.fromCharCode(65 + siblings.length);
    const { error } = await supabase.from("exams").insert({
      title: `${parent.title} - Paket ${letter}`,
      parent_exam_id: parent.id,
      duration: subPkgDuration * 60,
      price: 0,
      original_price: 0,
      bundle_size: 1,
      category: parent.category,
      subcategory: parent.subcategory,
      exam_type: parent.exam_type ?? null,
      passing_score: parent.passing_score ?? 0,
      total_questions: 0,
    });
    if (error) return toast.error(error.message);
    toast.success(`Sub-paket ${letter} berhasil dibuat`);
    setAddSubPkgParent(null);
    setSubPkgDuration(90);
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
          subtest: aiGen.subtest, 
          topic: aiGen.topic === "custom" ? aiGen.customTopic : aiGen.topic, 
          count: aiGen.count,
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
          body: { text_chunk: chunks[cs.index], exam_id: extractExamId || undefined, material_id: material.id, category: material.category, topic: material.topic ?? undefined },
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
            [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "done", count: data.count ?? 0, svgCount: data.with_svg ?? 0, errorMsg: undefined } : c),
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

    try {
      // 1. Get affected exams before deleting assignments
      const { data: assignments } = await supabase
        .from("exam_question_assignments")
        .select("exam_id")
        .in("question_id", qIds);
      const affectedExamIds = Array.from(new Set(assignments?.map((a: any) => a.exam_id) || []));

      // 2. Remove assignments
      await (supabase as any).from("exam_question_assignments").delete().in("question_id", qIds);
      
      // 3. Delete questions
      const { error } = await supabase.from("questions").delete().in("id", qIds);
      if (error) throw error;

      // 4. Update total_questions for all affected exams
      for (const examId of affectedExamIds) {
        const { count: total } = await (supabase as any)
          .from("exam_question_assignments")
          .select("*", { count: "exact", head: true })
          .eq("exam_id", examId);
        await supabase.from("exams").update({ total_questions: total ?? 0 }).eq("id", examId);
      }

      toast.success(`${qIds.length} soal dihapus dari bank`);
      setGlobalBankSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      await refresh();
      loadGlobalBank();
    } catch (error: any) {
      toast.error("Gagal hapus soal: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Open re-extract confirm modal — fetch stats first
  const prepareReExtract = async (m: Material) => {
    const { data: qRows } = await supabase
      .from("questions").select("id").eq("material_id", m.id);
    const qIds = (qRows ?? []).map((r: any) => r.id);
    let assigned = 0;
    if (qIds.length > 0) {
      const { count } = await (supabase as any)
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .in("question_id", qIds);
      assigned = count ?? 0;
    }
    setReExtractStats({ total: qIds.length, assigned });
    setReExtractConfirmMat(m);
  };

  // Delete old questions from material then reset + open panel
  const confirmReExtract = async () => {
    if (!reExtractConfirmMat) return;
    setReExtracting(true);
    const m = reExtractConfirmMat;

    const { data: qRows } = await supabase
      .from("questions").select("id").eq("material_id", m.id);
    const qIds = (qRows ?? []).map((r: any) => r.id);

    if (qIds.length > 0) {
      await (supabase as any).from("exam_question_assignments").delete().in("question_id", qIds);
      await supabase.from("questions").delete().in("id", qIds);
    }

    setReExtracting(false);
    setReExtractConfirmMat(null);
    setReExtractStats(null);
    resetExtractChunks(m);
    setExtractPanelId(m.id);
    setExtractExamId("");
    loadGlobalBank();
    toast.success(`${qIds.length} soal lama dihapus. Siap proses ulang.`);
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
    let query = (supabase as any).from("questions").select("id").range(0, 9999);
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
    
    // Sync count
    const { count } = await (supabase as any)
      .from("exam_question_assignments")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", selectedExam);
    await supabase.from("exams").update({ total_questions: count ?? 0 }).eq("id", selectedExam);
    
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
            <AdminTabBar bankView={bankView} setBankView={setBankView} />

            {/* View: Daftar Soal (Global Bank) */}
            {bankView === "list" && (
              <GlobalBankTable
                globalBank={globalBank}
                globalBankLoading={globalBankLoading}
                globalBankFilter={globalBankFilter}
                onFilterChange={handleBankFilterChange}
                setGlobalBankFilter={setGlobalBankFilter}
                bankPage={bankPage}
                bankTotalCount={bankTotalCount}
                bankPageSize={BANK_PAGE_SIZE}
                onPageChange={(page) => loadGlobalBank(page)}
                globalBankSelectedIds={globalBankSelectedIds}
                setGlobalBankSelectedIds={setGlobalBankSelectedIds}
                distributeOpen={distributeOpen}
                setDistributeOpen={setDistributeOpen}
                distributeTargetIds={distributeTargetIds}
                setDistributeTargetIds={setDistributeTargetIds}
                distributing={distributing}
                deleteConfirmOpen={deleteConfirmOpen}
                setDeleteConfirmOpen={setDeleteConfirmOpen}
                deleting={deleting}
                exams={exams}
                bankListMode={bankListMode}
                setBankListMode={setBankListMode}
                newQ={newQ}
                setNewQ={setNewQ}
                newQUploadingImg={newQUploadingImg}
                aiGen={aiGen}
                setAiGen={setAiGen}
                aiStatus={aiStatus}
                setAiStatus={setAiStatus}
                aiResult={aiResult}
                aiError={aiError}
                TOPIC_OPTIONS={TOPIC_OPTIONS}
                emptyNewQ={emptyNewQ}
                onAddQuestionToBank={addQuestionToBank}
                onGenerateViaAI={generateViaAI}
                onLoadGlobalBank={() => loadGlobalBank(0)}
                onBulkDistribute={bulkDistribute}
                onBulkDeleteQuestions={bulkDeleteQuestions}
              />
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
                        const chunkCount = mChunks ? mChunks.reduce((s, c) => s + (c.status === "done" ? c.count : 0), 0) : 0;
                        const dbCount = materialQuestionCounts[m.id] ?? 0;
                        const displayCount = Math.max(chunkCount, dbCount);
                        return (
                          <MaterialRow
                            key={m.id}
                            material={m}
                            mChunks={mChunks}
                            displayCount={displayCount}
                            isExpanded={isExpanded}
                            isExtractOpen={isExtractOpen}
                            extractExamId={extractExamId}
                            extractRunning={extractRunning}
                            exams={exams}
                            matExpanded={matExpanded}
                            setMatExpanded={setMatExpanded}
                            setExtractPanelId={setExtractPanelId}
                            setExtractExamId={setExtractExamId}
                            setExtractChunks={setExtractChunks}
                            setExtractRunning={setExtractRunning}
                            onPrepareReExtract={prepareReExtract}
                            onInitExtractChunks={initExtractChunks}
                            onResetExtractChunks={resetExtractChunks}
                            onDoExtractQuestions={(mat, onlyIdle) => doExtractQuestions(mat, onlyIdle)}
                            onDeleteMaterial={deleteMaterial}
                          />
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
                {/* Exam selector with Parent-Child Navigation */}
                <div>
                  {!selectedParentExam ? (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pilih Paket Tryout Induk</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {exams
                          .filter(e => !e.parent_exam_id)
                          .sort((a, b) => a.title.localeCompare(b.title))
                          .map((ex) => {
                            const children = exams.filter(c => c.parent_exam_id === ex.id);
                            return (
                              <button
                                key={ex.id}
                                onClick={() => {
                                  setSelectedParentExam(ex.id);
                                  if (children.length === 0) {
                                    setSelectedExam(ex.id);
                                  } else {
                                    setSelectedExam("");
                                  }
                                }}
                                className={cn(
                                  "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:shadow-md hover:bg-accent",
                                  selectedParentExam === ex.id && "border-primary bg-primary/5 ring-1 ring-primary"
                                )}
                              >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                  <Package className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-bold uppercase tracking-tight block">{ex.title}</span>
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">{ex.category || "Umum"}</Badge>
                                    <span className="text-[10px] text-muted-foreground">{children.length > 0 ? `${children.length} Sub-paket` : `${ex.total_questions} Soal`}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        {exams.filter(e => !e.parent_exam_id).length === 0 && (
                          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">Belum ada tryout. Buat di tab Tryout.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => { setSelectedParentExam(null); setSelectedExam(""); }}
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <ChevronLeft className="h-3 w-3" /> Kembali ke Daftar Paket
                        </button>
                        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                          {exams.find(e => e.id === selectedParentExam)?.title}
                        </Badge>
                      </div>
                      
                      {(() => {
                        const parent = exams.find(e => e.id === selectedParentExam);
                        const children = exams.filter(c => c.parent_exam_id === selectedParentExam);
                        
                        if (children.length === 0) {
                          // If no children, just show the parent as selected (already handled by setSelectedExam in onClick)
                          return (
                            <div className="p-4 border border-dashed rounded-lg text-center bg-muted/20">
                              <p className="text-xs text-muted-foreground">Paket ini tidak memiliki sub-paket. Mengelola soal untuk: <span className="font-bold text-foreground">{parent?.title}</span></p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {children
                              .sort((a, b) => a.title.localeCompare(b.title))
                              .map((e) => (
                                <button
                                  key={e.id}
                                  onClick={() => {
                                    setSelectedExam(e.id);
                                    setFilterSubtest("all");
                                    setFilterTopic("all");
                                    setFilterSource("all");
                                    setAddQuestionMode(null);
                                  }}
                                  className={cn(
                                    "text-left rounded-lg border px-3 py-3 transition-all",
                                    selectedExam === e.id
                                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                                      : "border-border hover:border-primary/50 hover:bg-accent"
                                  )}
                                >
                                  <p className="text-xs font-bold leading-snug">{e.title}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1.5">{e.total_questions} soal</p>
                                </button>
                              ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

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
                      <div className={cn("space-y-3", aiGen.topic === "custom" ? "sm:col-span-2" : "")}>
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
                        {aiGen.topic === "custom" && (
                          <div className="animate-in fade-in slide-in-from-top-1">
                            <Label className="text-xs text-primary font-semibold">Tulis Topik Kustom</Label>
                            <Input 
                              placeholder="cth: Sejarah Kerajaan Majapahit, Logika Fuzzy, dll" 
                              value={aiGen.customTopic}
                              onChange={(e) => setAiGen({ ...aiGen, customTopic: e.target.value })}
                              className="border-primary/50 focus-visible:ring-primary"
                            />
                          </div>
                        )}
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

                          {/* Bulk actions */}
                          {selectedQIds.size > 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs shrink-0"
                              onClick={async () => {
                                if (confirm(`Lepas ${selectedQIds.size} soal terpilih dari paket ini? Soal akan tetap ada di bank soal.`)) {
                                  const ids = Array.from(selectedQIds);
                                  const { error } = await (supabase as any)
                                    .from("exam_question_assignments")
                                    .delete()
                                    .eq("exam_id", selectedExam)
                                    .in("question_id", ids);
                                  
                                  if (error) toast.error("Gagal melepas soal: " + error.message);
                                  else {
                                    toast.success(`${selectedQIds.size} soal berhasil dilepas dari paket`);
                                    setSelectedQIds(new Set());
                                    // Sync count
                                    const { count } = await (supabase as any)
                                      .from("exam_question_assignments")
                                      .select("*", { count: "exact", head: true })
                                      .eq("exam_id", selectedExam);
                                    await supabase.from("exams").update({ total_questions: count ?? 0 }).eq("id", selectedExam);
                                    fetchQuestions(selectedExam);
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Hapus ({selectedQIds.size})
                            </Button>
                          )}

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
                      <div className="bg-muted/30 px-4 py-1.5 border-b border-border flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={filtered.length > 0 && selectedQIds.size === filtered.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedQIds(new Set(filtered.map(q => q.id)));
                            else setSelectedQIds(new Set());
                          }}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Pilih Semua ({filtered.length})</span>
                      </div>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {filtered.map((q, idx) => {
                            const isExpanded = expandedQ.has(q.id);
                            const globalIdx = questions.indexOf(q) + 1;
                            return (
                              <div key={q.id} className="overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-accent transition-colors">
                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={selectedQIds.has(q.id)}
                                        onChange={(e) => {
                                          setSelectedQIds(prev => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(q.id);
                                            else next.delete(q.id);
                                            return next;
                                          });
                                        }}
                                      />
                                      <span className="text-xs font-bold text-muted-foreground w-5">{globalIdx}.</span>
                                    </div>
                                    <button
                                      className="flex-1 text-left min-w-0 overflow-hidden"
                                      onClick={() => toggleExpand(q.id)}
                                    >
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
                                    <p className="text-xs font-medium leading-snug text-foreground">{q.question_text}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                                      {q.subtest === "tkp" && q.option_points
                                        ? `Poin: ${Object.values(q.option_points).sort((a, b) => b - a).join(",")}`
                                        : `✓ ${q.correct_answer ?? "-"}`}
                                      {q.explanation ? " · Ada pembahasan" : ""}
                                    </p>
                                  </div>
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                  </button>
                                </div>

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
                                        <Trash2 className="h-3 w-3 mr-1" /> Hapus dari Paket
                                      </Button>
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
                      <Label>Durasi (menit) <span className="text-muted-foreground text-xs font-normal">per paket</span></Label>
                      <Input
                        type="number" min={1} max={600}
                        value={Math.round(newExam.duration / 60)}
                        onChange={(e) => setNewExam({ ...newExam, duration: Math.max(1, +e.target.value) * 60 })}
                      />
                    </div>
                    <div>
                      <Label>Jumlah Paket <span className="text-muted-foreground text-xs font-normal">(bundle)</span></Label>
                      <Input
                        type="number" min={1}
                        value={newExam.bundle_size}
                        onChange={(e) => setNewExam({ ...newExam, bundle_size: Math.max(1, +e.target.value) })}
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
                        <SelectContent>
                          <SelectItem value="cpns">CPNS</SelectItem>
                          <SelectItem value="pppk">PPPK</SelectItem>
                          <SelectItem value="kedinasan">Kedinasan</SelectItem>
                        </SelectContent>
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

            {/* Existing exams — hierarchical (parent + sub-packages) */}
            {(() => {
              const parentExams = exams.filter((e) => !e.parent_exam_id);
              const childrenOf = (pid: string) => exams.filter((e) => e.parent_exam_id === pid);
              return (
                <Card>
                  <CardHeader><h2 className="font-semibold text-sm">Paket Tryout ({parentExams.length} paket induk · {exams.length} total)</h2></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                       {parentExams.map((ex) => {
                         const children = childrenOf(ex.id);
                         const isAddingHere = addSubPkgParent?.id === ex.id;
                         const isExpanded = expandedExams.has(ex.id);
                         const toggleExpandExam = (id: string) => {
                           setExpandedExams(prev => {
                             const next = new Set(prev);
                             if (next.has(id)) next.delete(id);
                             else next.add(id);
                             return next;
                           });
                         };
                         return (
                           <div key={ex.id}>
                             {/* Parent row */}
                             <div 
                               className={cn(
                                 "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors",
                                 isExpanded && "bg-muted/30"
                               )}
                               onClick={() => toggleExpandExam(ex.id)}
                             >
                               <div className="shrink-0">
                                 {children.length > 0 ? (
                                   isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                 ) : (
                                   <div className="h-4 w-4" />
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 flex-wrap">
                                   <Badge variant="outline" className="uppercase text-[9px] px-1 h-4 shrink-0">{ex.category || "—"}</Badge>
                                   {ex.subcategory && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">{ex.subcategory}</Badge>}
                                   {children.length > 0 && (
                                     <Badge className="text-[9px] px-1 h-4 shrink-0 bg-blue-50 text-blue-700 border border-blue-300">
                                       {children.length} sub-paket
                                     </Badge>
                                   )}
                                   <span className="text-xs font-semibold truncate">{ex.title}</span>
                                 </div>
                                 <p className="text-[10px] text-muted-foreground mt-0.5">
                                   {children.length === 0 && `${ex.total_questions} soal · ${Math.round(ex.duration / 60)} menit · `}
                                   {ex.price === 0 ? "Gratis" : `Rp ${ex.price.toLocaleString("id-ID")}`}
                                   {ex.original_price ? ` (coret: Rp ${ex.original_price.toLocaleString("id-ID")})` : ""}
                                   {ex.cta_link ? " · Ada CTA link" : ""}
                                 </p>
                               </div>
                               <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                 <Button
                                   size="sm" variant={isAddingHere ? "outline" : "ghost"}
                                   className="h-7 text-xs gap-1"
                                   onClick={() => { 
                                     setAddSubPkgParent(isAddingHere ? null : ex); 
                                     setSubPkgDuration(90);
                                     if (!isExpanded) toggleExpandExam(ex.id);
                                   }}
                                 >
                                   <Plus className="h-3 w-3" />
                                   {isAddingHere ? "Tutup" : "Sub-paket"}
                                 </Button>
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

                             {isExpanded && (
                               <div className="bg-muted/10 pb-2">
                                 {/* Sub-package creation form */}
                                 {isAddingHere && (
                                   <div className="mx-4 my-3 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                                     <p className="text-xs font-semibold text-primary">
                                       Buat Paket {String.fromCharCode(65 + children.length)} &rarr; akan diberi nama:
                                       <span className="ml-1 font-normal text-foreground">"{ex.title} - Paket {String.fromCharCode(65 + children.length)}"</span>
                                     </p>
                                     <div className="flex items-end gap-3">
                                       <div className="flex-1 max-w-[160px]">
                                         <Label className="text-xs">Durasi (menit)</Label>
                                         <Input
                                           type="number" min={1} max={600} className="h-8 text-xs mt-1"
                                           value={subPkgDuration}
                                           onChange={(e) => setSubPkgDuration(Math.max(1, +e.target.value))}
                                         />
                                       </div>
                                       <Button size="sm" className="h-8 gap-1" onClick={() => addSubPackage(ex)}>
                                         <Plus className="h-3 w-3" /> Buat Sub-paket
                                       </Button>
                                       <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddSubPkgParent(null)}>Batal</Button>
                                     </div>
                                   </div>
                                 )}

                                 {/* Child sub-package rows */}
                                 {children.map((child, idx) => (
                                   <div key={child.id} className="flex items-center gap-3 pl-10 pr-4 py-2.5 hover:bg-accent/30 transition-colors border-t border-border/30">
                                     <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                                       {String.fromCharCode(65 + idx)}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <span className="text-xs font-medium">{child.title}</span>
                                       <p className="text-[10px] text-muted-foreground">
                                         {child.total_questions} soal · {Math.round(child.duration / 60)} menit
                                       </p>
                                     </div>
                                     <div className="flex gap-1.5 shrink-0">
                                       <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditExam(child)}>
                                         <Pencil className="h-3 w-3 mr-1" /> Edit
                                       </Button>
                                       <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteExam(child.id)}>
                                         <Trash2 className="h-3 w-3" />
                                       </Button>
                                     </div>
                                   </div>
                                 ))}
                                 {children.length === 0 && !isAddingHere && (
                                   <p className="text-[10px] text-muted-foreground italic px-10 py-2">Belum ada sub-paket.</p>
                                 )}
                               </div>
                             )}
                           </div>
                         );
                       })}
                      {parentExams.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground text-center">Belum ada paket tryout.</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

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

            {/* Meta Pixel & CAPI */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="text-base">📊</span> Meta Pixel & Conversions API
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Lacak konversi iklan Meta (Facebook/Instagram) melalui Facebook Pixel (client-side) dan Conversions API (server-side).
                </p>
              </CardHeader>
              <CardContent className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="pixel-id">Pixel ID</Label>
                  <Input
                    id="pixel-id"
                    placeholder="cth: 1234567890123456"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Temukan di{" "}
                    <span className="font-medium">Meta Business Suite → Events Manager → Data Sources → pilih Pixel → Settings</span>.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capi-token">CAPI Access Token</Label>
                  <div className="relative">
                    <Input
                      id="capi-token"
                      type={showCapiToken ? "text" : "password"}
                      placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxx..."
                      value={metaCapiToken}
                      onChange={(e) => setMetaCapiToken(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCapiToken(!showCapiToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generate di <span className="font-medium">Events Manager → pilih Pixel → Settings → Conversions API → Generate access token</span>.
                    Digunakan untuk event server-side (Purchase, Lead) yang lebih akurat.
                  </p>
                </div>
                <Button onClick={savePixelSettings} disabled={savingPixel} className="gap-2">
                  {savingPixel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {savingPixel ? "Menyimpan..." : "Simpan Pixel Settings"}
                </Button>
                {metaPixelId && !savingPixel && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0" /> Pixel ID tersimpan. Pixel akan aktif di semua halaman.
                  </div>
                )}
                {/* Event reference table */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-foreground">Event yang sudah terintegrasi:</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Event</th>
                          <th className="px-3 py-2 text-left font-medium">Kapan Trigger</th>
                          <th className="px-3 py-2 text-center font-medium">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { event: "PageView", trigger: "Setiap halaman dibuka", mode: "Client" },
                          { event: "ViewContent", trigger: "Buka daftar paket tryout (Beli Paket)", mode: "Client" },
                          { event: "InitiateCheckout", trigger: "Klik tombol Beli paket", mode: "Client" },
                          { event: "Purchase", trigger: "Pembelian paket berbayar berhasil", mode: "Client" },
                          { event: "Lead", trigger: "Aktivasi paket gratis berhasil", mode: "Client" },
                          { event: "CompleteRegistration", trigger: "Daftar akun baru berhasil", mode: "Client" },
                        ].map((row) => (
                          <tr key={row.event} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-mono font-semibold text-primary">{row.event}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.trigger}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                                {row.mode}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    * CAPI (server-side) akan diaktifkan menggunakan Access Token untuk Purchase & Lead events — menambah akurasi atribusi dan menangkap konversi yang diblokir oleh adblocker.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Settings */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="text-base">💬</span> Pengaturan WhatsApp Admin
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Atur nomor WhatsApp admin dan pesan otomatis untuk konsultasi di widget chat.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="wa-number">Nomor WhatsApp Admin</Label>
                  <Input
                    id="wa-number"
                    placeholder="cth: 6289611777177"
                    value={adminWaNumber}
                    onChange={(e) => setAdminWaNumber(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Gunakan format internasional tanpa tanda + atau spasi (cth: 628...).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wa-text">Pesan Otomatis (Custom Text)</Label>
                  <Textarea
                    id="wa-text"
                    placeholder="Halo Admin, saya ingin konsultasi..."
                    value={adminWaText}
                    onChange={(e) => setAdminWaText(e.target.value)}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Pesan ini akan muncul secara otomatis saat user mengklik tombol WhatsApp.
                  </p>
                </div>
                <Button onClick={saveWaSettings} disabled={savingWa} className="gap-2">
                  {savingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {savingWa ? "Menyimpan..." : "Simpan Pengaturan WA"}
                </Button>
                {adminWaNumber && !savingWa && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0" /> Pengaturan WhatsApp tersimpan.
                  </div>
                )}
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

      {/* Re-extract confirmation modal */}
      {reExtractConfirmMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget && !reExtracting) setReExtractConfirmMat(null); }}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-500" /> Proses Ulang Ekstraksi
              </h2>
              {!reExtracting && <button onClick={() => setReExtractConfirmMat(null)}><X className="h-5 w-5" /></button>}
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Soal lama dari materi <span className="font-semibold text-foreground">"{reExtractConfirmMat.title}"</span> akan dihapus dan digantikan hasil ekstraksi baru (dengan SVG untuk soal bergambar).
              </p>
              {reExtractStats && reExtractStats.total > 0 ? (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1 text-sm">
                  <p><span className="font-semibold">{reExtractStats.total}</span> soal lama akan dihapus dari bank soal</p>
                  {reExtractStats.assigned > 0 && (
                    <p className="text-orange-600 font-medium">⚠ {reExtractStats.assigned} assignment ke tryout juga ikut terhapus</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Belum ada soal dari materi ini — akan langsung proses baru.
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReExtractConfirmMat(null)} disabled={reExtracting}>Batal</Button>
                <Button
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={confirmReExtract}
                  disabled={reExtracting}
                >
                  {reExtracting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Menghapus soal lama...</>
                    : <><RotateCcw className="h-4 w-4" /> Ya, Hapus & Proses Ulang</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <SelectContent>
                      <SelectItem value="cpns">CPNS</SelectItem>
                      <SelectItem value="pppk">PPPK</SelectItem>
                      <SelectItem value="kedinasan">Kedinasan</SelectItem>
                    </SelectContent>
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
                  <Label>Durasi (menit) <span className="text-muted-foreground text-xs font-normal">per paket</span></Label>
                  <Input
                    type="number" min={1} max={600}
                    value={Math.round(editExam.duration / 60)}
                    onChange={(e) => setEditExam({ ...editExam, duration: Math.max(1, +e.target.value) * 60 })}
                  />
                </div>
                <div>
                  <Label>Jumlah Paket <span className="text-muted-foreground text-xs font-normal">(bundle)</span></Label>
                  <Input
                    type="number" min={1} value={editExam.bundle_size}
                    onChange={(e) => setEditExam({ ...editExam, bundle_size: Math.max(1, +e.target.value) })}
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
