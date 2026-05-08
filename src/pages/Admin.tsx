import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2, Wallet, Check, X, Plus, Sparkles, Loader2,
  Pencil, Image, Upload, Key, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

type Exam = { id: string; title: string; total_questions: number };
type Question = {
  id: string; exam_id: string; question_text: string; options: string[];
  correct_answer: string; subtest: string; option_points: Record<string, number> | null;
  explanation?: string; image_url?: string | null;
};
type Score = { id: string; score: number; completed_at: string; profiles: { username: string | null; email: string | null } | null; exams: { title: string } | null };
type Topup = { id: string; user_id: string; amount: number; status: "pending" | "approved" | "rejected"; created_at: string; profiles: { username: string | null; email: string | null } | null };
type UserBalance = { user_id: string; balance: number; profiles: { username: string | null; email: string | null } | null };

type EditQ = {
  id: string; question_text: string; a: string; b: string; c: string; d: string; e: string;
  correct: string; subtest: string; pa: number; pb: number; pc: number; pd: number; pe: number;
  explanation: string; image_url: string;
};

const emptyNewQ = () => ({
  question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "", subtest: "tiu" as const,
  pa: 5, pb: 4, pc: 3, pd: 2, pe: 1, explanation: "", image_url: "",
});

const Admin = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [adjustAmount, setAdjustAmount] = useState<Record<string, number>>({});
  const [selectedExam, setSelectedExam] = useState<string>("");

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

  // New exam form
  const [newExam, setNewExam] = useState({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "" });

  // AI Generate
  const [aiGen, setAiGen] = useState({
    subtest: "twk" as "twk" | "tiu" | "tkp", topic: "pancasila", count: 10,
    withImage: false, imageMode: "upload" as "upload" | "describe", imageFile: null as File | null, imageUrl: "",
  });
  const [aiImageUploading, setAiImageUploading] = useState(false);
  const aiImgRef = useRef<HTMLInputElement>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiResult, setAiResult] = useState<{ count: number; requested: number } | null>(null);

  // Settings
  const [kieApiKey, setKieApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const refresh = async () => {
    const { data: e } = await supabase.from("exams").select("id,title,total_questions").order("created_at");
    setExams(e ?? []);
    if (selectedExam) {
      const { data: q } = await supabase.from("questions").select("*").eq("exam_id", selectedExam).order("created_at");
      setQuestions((q as Question[]) ?? []);
    }
    const { data: s } = await supabase.from("user_scores")
      .select("id,score,completed_at,profiles(username,email),exams(title)")
      .order("completed_at", { ascending: false }).limit(100);
    setScores((s as Score[]) ?? []);

    const { data: t } = await supabase.from("topup_requests")
      .select("id,user_id,amount,status,created_at")
      .order("created_at", { ascending: false }).limit(100);
    const { data: b } = await supabase.from("user_balances")
      .select("user_id,balance").order("balance", { ascending: false }).limit(200);

    const ids = Array.from(new Set([...(t ?? []).map((x: any) => x.user_id), ...(b ?? []).map((x: any) => x.user_id)]));
    let profileMap: Record<string, { username: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,email").in("id", ids);
      profileMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { username: p.username, email: p.email }]));
    }
    setTopups(((t ?? []) as any[]).map((x) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
    setBalances(((b ?? []) as any[]).map((x) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
  };

  useEffect(() => { refresh(); }, [selectedExam]);

  // Load saved API key on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "kie_api_key").maybeSingle();
      if (data?.value) setKieApiKey(data.value);
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
    if (!kieApiKey.trim()) return toast.error("Masukkan API key terlebih dahulu");
    setSavingKey(true);
    const { error } = await supabase.from("admin_settings").upsert({ key: "kie_api_key", value: kieApiKey.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSavingKey(false);
    if (error) return toast.error("Gagal menyimpan: " + error.message);
    toast.success("API key berhasil disimpan");
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
    setNewExam({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "" }); refresh();
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
    await supabase.from("exams").update({ total_questions: questions.length + 1 }).eq("id", selectedExam);
    toast.success("Soal ditambahkan");
    setNewQ(emptyNewQ()); setNewQImageFile(null); refresh();
  };

  const openEdit = (q: Question) => {
    const opts = q.options ?? [];
    setEditQ({
      id: q.id, question_text: q.question_text, subtest: q.subtest ?? "tiu",
      a: opts[0] ?? "", b: opts[1] ?? "", c: opts[2] ?? "", d: opts[3] ?? "", e: opts[4] ?? "",
      pa: q.option_points?.[opts[0]] ?? 5, pb: q.option_points?.[opts[1]] ?? 4,
      pc: q.option_points?.[opts[2]] ?? 3, pd: q.option_points?.[opts[3]] ?? 2, pe: q.option_points?.[opts[4]] ?? 1,
      correct: q.correct_answer ?? "", explanation: q.explanation ?? "", image_url: q.image_url ?? "",
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

  const generateViaAI = async () => {
    if (!selectedExam) return toast.error("Pilih tryout dulu");
    setAiStatus("loading"); setAiResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setAiStatus("error"); return toast.error("Sesi tidak ditemukan"); }

      // Upload image if AI image mode
      let finalImageUrl = aiGen.imageUrl;
      if (aiGen.withImage && aiGen.imageMode === "upload" && aiGen.imageFile) {
        setAiImageUploading(true);
        const url = await uploadImage(aiGen.imageFile);
        setAiImageUploading(false);
        if (!url) { setAiStatus("error"); return; }
        finalImageUrl = url;
        setAiGen((g) => ({ ...g, imageUrl: url }));
      }

      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          exam_id: selectedExam, subtest: aiGen.subtest, topic: aiGen.topic, count: aiGen.count,
          with_image: aiGen.withImage,
          image_url: aiGen.withImage ? finalImageUrl || null : null,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) { setAiStatus("error"); return toast.error(error.message ?? "Gagal generate soal"); }
      if (data?.error) { setAiStatus("error"); return toast.error(data.error); }

      setAiStatus("done"); setAiResult(data);
      toast.success(`${data.count} soal beserta pembahasan berhasil di-generate`);
      setAiGen((g) => ({ ...g, imageFile: null, imageUrl: "" }));
      refresh();
    } catch (e: any) {
      setAiStatus("error"); toast.error(e?.message ?? "Terjadi kesalahan");
    }
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
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <Tabs defaultValue="questions" className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="questions">Manajemen Soal</TabsTrigger>
            <TabsTrigger value="exams">Tryout</TabsTrigger>
            <TabsTrigger value="scores">Skor User</TabsTrigger>
            <TabsTrigger value="topups">Topup</TabsTrigger>
            <TabsTrigger value="balances">Saldo User</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          {/* ── MANAJEMEN SOAL ── */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader><h2 className="font-semibold">Pilih Tryout</h2></CardHeader>
              <CardContent>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger><SelectValue placeholder="Pilih tryout..." /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedExam && (
              <>
                {/* AI Generate */}
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

                    {/* Opsi Gambar */}
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          id="with-image"
                          checked={aiGen.withImage}
                          onCheckedChange={(v) => setAiGen({ ...aiGen, withImage: v, imageFile: null, imageUrl: "" })}
                        />
                        <Label htmlFor="with-image" className="flex items-center gap-2 cursor-pointer">
                          <Image className="h-4 w-4 text-muted-foreground" />
                          Soal Berbasis Gambar (Opsional)
                        </Label>
                      </div>

                      {aiGen.withImage && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/30">
                          <div className="flex gap-3">
                            <Button
                              type="button" size="sm"
                              variant={aiGen.imageMode === "upload" ? "default" : "outline"}
                              onClick={() => setAiGen({ ...aiGen, imageMode: "upload", imageFile: null, imageUrl: "" })}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" /> Upload Gambar
                            </Button>
                            <Button
                              type="button" size="sm"
                              variant={aiGen.imageMode === "describe" ? "default" : "outline"}
                              onClick={() => setAiGen({ ...aiGen, imageMode: "describe", imageFile: null, imageUrl: "" })}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" /> AI Generate (Teks)
                            </Button>
                          </div>

                          {aiGen.imageMode === "upload" && (
                            <div>
                              <input
                                ref={aiImgRef} type="file"
                                accept="image/jpeg,image/png,image/webp" className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setAiGen({ ...aiGen, imageFile: f, imageUrl: "" });
                                }}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={() => aiImgRef.current?.click()}>
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                {aiGen.imageFile ? aiGen.imageFile.name : "Pilih Gambar..."}
                              </Button>
                              {aiGen.imageFile && (
                                <img
                                  src={URL.createObjectURL(aiGen.imageFile)}
                                  alt="Preview" className="mt-2 max-h-40 rounded border object-contain"
                                />
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                AI akan membuat soal berdasarkan gambar ini. Gambar otomatis tersimpan dan terlampir pada soal.
                              </p>
                            </div>
                          )}
                          {aiGen.imageMode === "describe" && (
                            <p className="text-xs text-muted-foreground">
                              AI akan membuat soal bertipe gambar (ada keterangan gambar di soal), tanpa gambar nyata.
                            </p>
                          )}
                        </div>
                      )}
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
                        <span className="text-sm text-destructive">Gagal — cek API key di tab Pengaturan</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tambah Soal Manual */}
                <Card>
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
                </Card>

                {/* Daftar Soal */}
                <Card>
                  <CardHeader><h2 className="font-semibold">Soal Saat Ini ({questions.length})</h2></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {questions.map((q, idx) => {
                        const isExpanded = expandedQ.has(q.id);
                        return (
                          <div key={q.id}>
                            <button
                              className="w-full flex items-start gap-3 px-6 py-4 hover:bg-accent text-left transition-colors"
                              onClick={() => toggleExpand(q.id)}
                            >
                              <span className="text-sm font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="uppercase text-[10px]">{q.subtest ?? "tiu"}</Badge>
                                  {q.image_url && <Badge variant="secondary" className="text-[10px]"><Image className="h-2.5 w-2.5 mr-1" />Gambar</Badge>}
                                  <p className="font-medium truncate">{q.question_text}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {q.subtest === "tkp" && q.option_points
                                    ? `${q.options.length} opsi — poin ${Object.values(q.option_points).sort((a,b) => b-a).join(",")}`
                                    : `Jawaban: ${q.correct_answer ?? "-"}`}
                                  {q.explanation ? " · Ada pembahasan" : " · Belum ada pembahasan"}
                                </p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            </button>

                            {isExpanded && (
                              <div className="px-6 pb-5 pt-2 bg-muted/30 space-y-3">
                                {q.image_url && (
                                  <img src={q.image_url} alt="Gambar soal" className="max-h-48 rounded border object-contain" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-muted-foreground">Pertanyaan:</p>
                                  <p className="mt-1 text-sm">{q.question_text}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-muted-foreground">Pilihan Jawaban:</p>
                                  <ul className="mt-1 space-y-1">
                                    {q.options.map((opt) => (
                                      <li key={opt} className={cn(
                                        "text-sm px-3 py-1.5 rounded border",
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
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p className="text-xs font-semibold text-blue-900 mb-1">Pembahasan:</p>
                                    <p className="text-sm text-blue-800">{q.explanation}</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEdit(q)}>
                                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Soal
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => deleteQ(q.id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {questions.length === 0 && (
                        <p className="px-6 py-8 text-sm text-muted-foreground text-center">Belum ada soal. Generate via AI atau tambah manual.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── TRYOUT ── */}
          <TabsContent value="exams">
            <Card>
              <CardHeader><h2 className="font-semibold">Buat Tryout Baru</h2></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Judul *</Label><Input placeholder="cth: SKB Bidan Ahli - Paket 1" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} /></div>
                <div><Label>Deskripsi</Label><Textarea placeholder="Ringkasan singkat" value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Durasi (detik)</Label><Input type="number" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: +e.target.value })} /></div>
                  <div><Label>Bundling (jumlah tryout)</Label><Input type="number" min={1} value={newExam.bundle_size} onChange={(e) => setNewExam({ ...newExam, bundle_size: Math.max(1, +e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Harga (Rp)</Label><Input type="number" placeholder="0 = gratis" value={newExam.price} onChange={(e) => setNewExam({ ...newExam, price: +e.target.value })} /></div>
                  <div><Label>Harga Asli / Coret (Rp)</Label><Input type="number" placeholder="opsional" value={newExam.original_price} onChange={(e) => setNewExam({ ...newExam, original_price: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kategori *</Label>
                    <Select value={newExam.category} onValueChange={(v) => setNewExam({ ...newExam, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent><SelectItem value="cpns">CPNS</SelectItem><SelectItem value="pppk">PPPK</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Subkategori *</Label><Input placeholder="cth: SKD, SKB Bidan" maxLength={80} value={newExam.subcategory} onChange={(e) => setNewExam({ ...newExam, subcategory: e.target.value })} /></div>
                </div>
                <Button onClick={addExam}>Buat Tryout</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SKOR USER ── */}
          <TabsContent value="scores">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2">Username</th><th>Email</th><th>Tryout</th><th>Skor</th><th>Tanggal</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {scores.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2">{s.profiles?.username ?? "-"}</td>
                        <td>{s.profiles?.email}</td>
                        <td>{s.exams?.title}</td>
                        <td className="font-bold text-primary">{s.score}</td>
                        <td>{new Date(s.completed_at).toLocaleDateString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* ── TOPUP ── */}
          <TabsContent value="topups">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-secondary text-left"><tr>
                    <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">User</th><th className="px-3 py-2">Nominal</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {topups.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2"><div>{t.profiles?.username ?? "-"}</div><div className="text-xs text-muted-foreground">{t.profiles?.email}</div></td>
                        <td className="px-3 py-2 font-semibold">Rp {t.amount.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2"><Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge></td>
                        <td className="px-3 py-2">{t.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => approveTopup(t)} className="gap-1"><Check className="h-3.5 w-3.5" /> Setujui</Button>
                            <Button size="sm" variant="outline" onClick={() => rejectTopup(t)} className="gap-1"><X className="h-3.5 w-3.5" /> Tolak</Button>
                          </div>
                        )}</td>
                      </tr>
                    ))}
                    {topups.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada topup.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* ── SALDO USER ── */}
          <TabsContent value="balances">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-secondary text-left"><tr>
                    <th className="px-3 py-2">User</th><th className="px-3 py-2">Saldo</th><th className="px-3 py-2">Adjust</th><th className="px-3 py-2 text-right">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {balances.map((b) => (
                      <tr key={b.user_id}>
                        <td className="px-3 py-2"><div>{b.profiles?.username ?? "-"}</div><div className="text-xs text-muted-foreground">{b.profiles?.email}</div></td>
                        <td className="px-3 py-2 font-semibold"><span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-primary" />{b.balance.toLocaleString("id-ID")}</span></td>
                        <td className="px-3 py-2"><Input type="number" value={adjustAmount[b.user_id] ?? ""} onChange={(e) => setAdjustAmount({ ...adjustAmount, [b.user_id]: Number(e.target.value) })} placeholder="contoh: 50000 atau -10000" className="max-w-[180px]" /></td>
                        <td className="px-3 py-2 text-right"><Button size="sm" onClick={() => adjustBalance(b.user_id)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Terapkan</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
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
                      onChange={(e) => setKieApiKey(e.target.value)}
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
                <Button onClick={saveApiKey} disabled={savingKey} className="gap-2">
                  {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {savingKey ? "Menyimpan..." : "Simpan API Key"}
                </Button>
                {kieApiKey && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    ✓ API key sudah dikonfigurasi. Generator soal AI siap digunakan.
                  </div>
                )}
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
    </AppLayout>
  );
};

export default Admin;
