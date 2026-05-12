import { useState } from "react";
import {
  Loader2, Sparkles, Image, Check, X, ChevronRight, ChevronLeft,
  Pencil, Wand2, ImageOff, RefreshCw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TOPIC_OPTIONS as TopicOpts } from "@/types/admin";

type Subtest = "twk" | "tiu" | "tkp";

interface ImageQuestionFormProps {
  TOPIC_OPTIONS: Record<string, { value: string; label: string }[]>;
  onSaved: () => void;
  onClose: () => void;
}

interface QuestionDraft {
  subtest: Subtest;
  topic: string;
  customTopic: string;
  question_text: string;
  options: [string, string, string, string, string];
  correct_answer: string;
  explanation: string;
  // TKP
  option_points: Record<string, number>;
  // Image
  svg_content: string;
  svg_prompt: string;
}

const emptyDraft = (): QuestionDraft => ({
  subtest: "tiu",
  topic: "analogi",
  customTopic: "",
  question_text: "",
  options: ["", "", "", "", ""],
  correct_answer: "",
  explanation: "",
  option_points: {},
  svg_content: "",
  svg_prompt: "",
});

export function ImageQuestionForm({ TOPIC_OPTIONS, onSaved, onClose }: ImageQuestionFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft());
  const [genSoalStatus, setGenSoalStatus] = useState<"idle" | "loading" | "error">("idle");
  const [genSoalError, setGenSoalError] = useState("");
  const [genImgStatus, setGenImgStatus] = useState<"idle" | "loading" | "error">("idle");
  const [genImgError, setGenImgError] = useState("");
  const [saving, setSaving] = useState(false);

  const topicResolved = draft.topic === "custom" ? draft.customTopic.trim() : draft.topic;

  // ── Step 1: Generate question via AI ────────────────────────────────────────
  const handleGenerateSoal = async () => {
    if (!topicResolved) return toast.error("Isi topik terlebih dahulu");
    setGenSoalStatus("loading");
    setGenSoalError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesi tidak ditemukan");

      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          action: "generate_single_question",
          subtest: draft.subtest,
          topic: topicResolved,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      const q = data.question;
      const opts: [string, string, string, string, string] = [
        q.options[0] ?? "", q.options[1] ?? "",
        q.options[2] ?? "", q.options[3] ?? "", q.options[4] ?? "",
      ];
      setDraft(d => ({
        ...d,
        question_text: q.question_text ?? "",
        options: opts,
        correct_answer: q.correct_answer ?? "",
        explanation: q.explanation ?? "",
        option_points: q.option_points ?? {},
        svg_prompt: q.svg_prompt ?? "",
      }));
      setGenSoalStatus("idle");
      toast.success("Soal berhasil di-generate! Periksa dan edit jika perlu.");
    } catch (e: any) {
      setGenSoalStatus("error");
      setGenSoalError(e.message ?? "Gagal generate soal");
      toast.error(e.message ?? "Gagal generate soal");
    }
  };

  // ── Step 2: Generate SVG illustration via Claude ─────────────────────────────
  const handleGenerateSVG = async () => {
    if (!draft.question_text.trim()) return toast.error("Isi soal terlebih dahulu");
    setGenImgStatus("loading");
    setGenImgError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesi tidak ditemukan");

      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          action: "generate_svg_illustration",
          question_text: draft.question_text,
          options: draft.options.filter(Boolean),
          svg_prompt: draft.svg_prompt || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      setDraft(d => ({ ...d, svg_content: data.svg_content }));
      setGenImgStatus("idle");
      toast.success("Ilustrasi SVG berhasil dibuat!");
    } catch (e: any) {
      setGenImgStatus("error");
      setGenImgError(e.message ?? "Gagal generate SVG");
      toast.error(e.message ?? "Gagal generate ilustrasi");
    }
  };

  // ── Step 3: Save to bank ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!draft.question_text.trim()) return toast.error("Pertanyaan wajib diisi");
    const validOpts = draft.options.filter(o => o.trim());
    if (validOpts.length < 2) return toast.error("Minimal 2 pilihan jawaban");
    if (draft.subtest !== "tkp" && !draft.correct_answer) return toast.error("Pilih jawaban benar");

    setSaving(true);
    try {
      const payload: any = {
        exam_id: null,
        question_text: draft.question_text.trim(),
        options: validOpts,
        subtest: draft.subtest,
        explanation: draft.explanation.trim() || null,
        svg_content: draft.svg_content || null,
        topic: topicResolved || null,
        source: "manual",
      };

      if (draft.subtest === "tkp") {
        if (Object.keys(draft.option_points).length < 2) return toast.error("Isi poin TKP untuk setiap opsi");
        payload.option_points = draft.option_points;
        payload.correct_answer = Object.entries(draft.option_points).reduce((a, b) => b[1] > a[1] ? b : a)[0];
      } else {
        if (!validOpts.includes(draft.correct_answer)) return toast.error("Jawaban benar harus sama persis dengan salah satu opsi");
        payload.correct_answer = draft.correct_answer;
      }

      const { error } = await supabase.from("questions").insert(payload);
      if (error) throw new Error(error.message);
      toast.success("Soal bergambar berhasil disimpan ke bank!");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const canGoStep2 = draft.question_text.trim().length > 5;
  const canGoStep3 = canGoStep2 && (draft.subtest === "tkp" || draft.correct_answer);

  return (
    <Card className="border-purple-200 bg-purple-50/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-sm text-purple-800">Soal Bergambar (SVG)</h3>
            <Badge variant="outline" className="text-[9px] border-purple-300 text-purple-600">
              SVG via Claude AI
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                step === s ? "bg-purple-600 text-white" :
                step > s ? "bg-purple-200 text-purple-700" :
                "bg-muted text-muted-foreground"
              )}>
                {step > s ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className={cn("text-[10px]", step === s ? "text-purple-700 font-semibold" : "text-muted-foreground")}>
                {s === 1 ? "Tulis Soal" : s === 2 ? "Generate Gambar" : "Simpan"}
              </span>
              {s < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── STEP 1: Write Question ── */}
        {step === 1 && (
          <div className="space-y-3">
            {/* Subtes + Topik */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subtes</Label>
                <Select
                  value={draft.subtest}
                  onValueChange={(v: Subtest) =>
                    setDraft(d => ({ ...d, subtest: v, topic: TOPIC_OPTIONS[v][0].value, correct_answer: "" }))
                  }
                >
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
                <Select value={draft.topic} onValueChange={(v) => setDraft(d => ({ ...d, topic: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(TOPIC_OPTIONS[draft.subtest] ?? []).map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.topic === "custom" && (
              <div>
                <Label className="text-xs text-purple-700 font-semibold">Topik Kustom</Label>
                <Input
                  placeholder="cth: Soal cerita jarak dan kecepatan..."
                  className="h-8 text-xs"
                  value={draft.customTopic}
                  onChange={e => setDraft(d => ({ ...d, customTopic: e.target.value }))}
                />
              </div>
            )}

            {/* AI Generate Button */}
            <div className="flex items-center gap-2 p-2 bg-purple-100/70 rounded-lg border border-purple-200">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
              <p className="text-[11px] text-purple-700 flex-1">Bingung mau buat soal apa? Biarkan AI buatkan soalnya.</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 shrink-0 gap-1"
                onClick={handleGenerateSoal}
                disabled={genSoalStatus === "loading"}
              >
                {genSoalStatus === "loading"
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                  : <><Wand2 className="h-3 w-3" /> Buat Soal via AI</>}
              </Button>
            </div>
            {genSoalStatus === "error" && (
              <p className="text-xs text-red-600 flex items-center gap-1"><X className="h-3 w-3" />{genSoalError}</p>
            )}

            {/* Question text */}
            <div>
              <Label className="text-xs">Teks Pertanyaan *</Label>
              <Textarea
                rows={3}
                placeholder="Tulis pertanyaan di sini, atau klik 'Buat Soal via AI' di atas..."
                value={draft.question_text}
                onChange={e => setDraft(d => ({ ...d, question_text: e.target.value }))}
                className="text-sm resize-none"
              />
            </div>

            {/* Options */}
            <div>
              <Label className="text-xs">Pilihan Jawaban *</Label>
              <div className="space-y-1.5 mt-1">
                {(["A", "B", "C", "D", "E"] as const).map((letter, i) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 shrink-0 text-muted-foreground">{letter}.</span>
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder={`Opsi ${letter}`}
                      value={draft.options[i]}
                      onChange={e => {
                        const newOpts = [...draft.options] as [string, string, string, string, string];
                        newOpts[i] = e.target.value;
                        setDraft(d => ({ ...d, options: newOpts }));
                      }}
                    />
                    {draft.subtest !== "tkp" && (
                      <button
                        type="button"
                        className={cn(
                          "h-8 px-2 rounded text-xs border transition-colors shrink-0",
                          draft.correct_answer === draft.options[i] && draft.options[i]
                            ? "bg-green-500 text-white border-green-500"
                            : "border-border hover:bg-accent"
                        )}
                        onClick={() => { if (draft.options[i]) setDraft(d => ({ ...d, correct_answer: draft.options[i] })); }}
                      >✓</button>
                    )}
                    {draft.subtest === "tkp" && (
                      <Select
                        value={String(draft.option_points[draft.options[i]] ?? "")}
                        onValueChange={v => setDraft(d => ({
                          ...d,
                          option_points: { ...d.option_points, [draft.options[i]]: Number(v) }
                        }))}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs shrink-0"><SelectValue placeholder="Poin" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
              {draft.subtest !== "tkp" && (
                <p className="text-[10px] text-muted-foreground mt-1">Klik ✓ di sebelah kanan opsi untuk menandai jawaban benar.</p>
              )}
            </div>

            {/* Explanation */}
            <div>
              <Label className="text-xs">Pembahasan / Kunci Jawaban</Label>
              <Textarea
                rows={2}
                placeholder="Jelaskan mengapa jawaban benar..."
                value={draft.explanation}
                onChange={e => setDraft(d => ({ ...d, explanation: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>

            {/* SVG prompt hint */}
            {draft.svg_prompt && draft.svg_prompt !== "none" && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                <p className="text-[11px] text-blue-700 font-semibold">💡 Saran Ilustrasi dari AI:</p>
                <p className="text-[11px] text-blue-600">{draft.svg_prompt}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Bisa diedit di Langkah 2</p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                Lanjut: Generate Gambar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Generate SVG ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Preview soal */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview Soal</p>
              <p className="text-sm font-medium leading-snug">{draft.question_text}</p>
              <div className="grid grid-cols-1 gap-0.5 mt-1">
                {draft.options.filter(Boolean).map((opt, i) => (
                  <p key={i} className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    opt === draft.correct_answer ? "bg-green-100 text-green-800 font-semibold" : "text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + i)}. {opt}
                    {opt === draft.correct_answer && " ✓"}
                  </p>
                ))}
              </div>
            </div>

            {/* SVG prompt control */}
            <div>
              <Label className="text-xs">Deskripsi Ilustrasi untuk AI</Label>
              <Textarea
                rows={2}
                placeholder="cth: a number line showing sequence 3, 6, 12, 24, ? in boxes — atau biarkan kosong untuk biarkan AI memilih"
                value={draft.svg_prompt === "none" ? "" : draft.svg_prompt}
                onChange={e => setDraft(d => ({ ...d, svg_prompt: e.target.value }))}
                className="text-xs resize-none mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Deskripsikan ilustrasi yang ingin Anda lihat, atau kosongkan dan biarkan Claude memilih.
              </p>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerateSVG}
              disabled={genImgStatus === "loading"}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {genImgStatus === "loading"
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Claude sedang menggambar SVG...</>
                : draft.svg_content
                  ? <><RefreshCw className="h-4 w-4" /> Re-generate Ilustrasi</>
                  : <><Image className="h-4 w-4" /> Generate Ilustrasi SVG via Claude</>
              }
            </Button>
            {genImgStatus === "error" && (
              <p className="text-xs text-red-600 flex items-center gap-1"><X className="h-3 w-3" />{genImgError}</p>
            )}

            {/* SVG Preview */}
            {draft.svg_content && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-green-700 font-semibold">Ilustrasi SVG berhasil dibuat!</p>
                </div>
                <div
                  className="rounded-lg border border-border overflow-hidden bg-white"
                  dangerouslySetInnerHTML={{ __html: draft.svg_content }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => setDraft(d => ({ ...d, svg_content: "" }))}
                >
                  <ImageOff className="h-3 w-3" /> Hapus Gambar (simpan tanpa gambar)
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Kembali Edit Soal
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canGoStep3}
                className="gap-2 bg-purple-600 hover:bg-purple-700 flex-1"
              >
                Lanjut: Simpan ke Bank <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Save ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Review Soal Bergambar</p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="uppercase text-[9px]">{draft.subtest}</Badge>
                <Badge variant="secondary" className="text-[9px]">{topicResolved}</Badge>
                {draft.svg_content
                  ? <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-300">Ada Ilustrasi SVG ✓</Badge>
                  : <Badge className="text-[9px] bg-gray-100 text-gray-600">Tanpa Gambar</Badge>
                }
              </div>

              <p className="text-sm leading-snug font-medium">{draft.question_text}</p>

              {draft.svg_content && (
                <div className="rounded border border-border overflow-hidden bg-white max-h-48">
                  <div dangerouslySetInnerHTML={{ __html: draft.svg_content }} className="w-full" />
                </div>
              )}

              <div className="space-y-0.5">
                {draft.options.filter(Boolean).map((opt, i) => (
                  <p key={i} className={cn(
                    "text-xs px-2 py-1 rounded",
                    opt === draft.correct_answer ? "bg-green-100 text-green-800 font-semibold" : ""
                  )}>
                    {String.fromCharCode(65 + i)}. {opt}
                    {opt === draft.correct_answer && " ← Jawaban Benar"}
                  </p>
                ))}
              </div>

              {draft.explanation && (
                <div className="bg-blue-50 rounded px-2 py-1.5">
                  <p className="text-[10px] text-blue-600 font-semibold">Pembahasan:</p>
                  <p className="text-xs text-blue-800">{draft.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-purple-600 hover:bg-purple-700 flex-1"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                  : <><Save className="h-4 w-4" /> Simpan ke Bank Soal</>
                }
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
