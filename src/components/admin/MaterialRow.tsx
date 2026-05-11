import React from "react";
import { RotateCcw, Sparkles, Trash2, Check, X, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { splitTextIntoChunks } from "@/lib/adminUtils";
import type { Material, ChunkStatus, Exam } from "@/types/admin";

interface MaterialRowProps {
  material: Material;
  mChunks: ChunkStatus[] | undefined;
  displayCount: number;
  isExpanded: boolean;
  isExtractOpen: boolean;
  extractExamId: string;
  extractRunning: boolean;
  exams: Exam[];
  matExpanded: Set<string>;
  setMatExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExtractPanelId: React.Dispatch<React.SetStateAction<string | null>>;
  setExtractExamId: React.Dispatch<React.SetStateAction<string>>;
  setExtractChunks: React.Dispatch<React.SetStateAction<Record<string, ChunkStatus[]>>>;
  setExtractRunning: React.Dispatch<React.SetStateAction<boolean>>;
  onPrepareReExtract: (m: Material) => void;
  onInitExtractChunks: (m: Material) => void;
  onResetExtractChunks: (m: Material) => void;
  onDoExtractQuestions: (m: Material, onlyIdle: boolean) => void;
  onDeleteMaterial: (id: string) => void;
}

export function MaterialRow({
  material: m,
  mChunks,
  displayCount,
  isExpanded,
  isExtractOpen,
  extractExamId,
  extractRunning,
  exams,
  matExpanded,
  setMatExpanded,
  setExtractPanelId,
  setExtractExamId,
  setExtractChunks,
  setExtractRunning,
  onPrepareReExtract,
  onInitExtractChunks,
  onResetExtractChunks,
  onDoExtractQuestions,
  onDeleteMaterial,
}: MaterialRowProps) {
  const allDone = mChunks && mChunks.length > 0 && mChunks.every((c) => c.status === "done");
  // totalExtracted = same as chunkCount computed from mChunks
  const totalExtracted = mChunks ? mChunks.reduce((s, c) => s + (c.status === "done" ? c.count : 0), 0) : 0;

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] uppercase px-1 h-4 shrink-0">
              {m.category === "general" ? "Umum" : m.category.toUpperCase()}
            </Badge>
            {m.topic && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">{m.topic}</Badge>}
            <span className="text-sm font-semibold">{m.title}</span>
            {displayCount > 0 && (
              <Badge className="text-[9px] px-1 h-4 bg-green-100 text-green-700 border-green-300 border">
                ✓ {displayCount} soal{mChunks && !allDone ? " (sebagian)" : ""}
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
          {/* Re-extract button — only shown if previously extracted */}
          {displayCount > 0 && !isExtractOpen && (
            <Button
              size="sm" variant="outline"
              className="h-7 w-7 p-0 text-orange-600 border-orange-300 hover:bg-orange-50"
              title="Proses ulang ekstraksi — hapus soal lama, insert soal baru"
              onClick={() => onPrepareReExtract(m)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm" variant="outline"
            className={cn("h-7 text-xs gap-1", isExtractOpen && "border-primary text-primary")}
            onClick={() => {
              if (isExtractOpen) {
                setExtractPanelId(null);
              } else {
                setExtractPanelId(m.id);
                setExtractExamId("");
                if (!mChunks) onInitExtractChunks(m);
              }
            }}
          >
            <Sparkles className="h-3 w-3" />
            Ekstrak Soal
          </Button>
          <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => onDeleteMaterial(m.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Inline extract panel */}
      {isExtractOpen && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Ekstrak soal dari "{m.title}" ke bank soal
            </p>
            {mChunks && mChunks.some((c) => c.status === "done") && (
              <button
                className="flex items-center gap-1 text-[10px] text-orange-600 hover:text-orange-700 border border-orange-300 rounded px-2 py-1 bg-orange-50 hover:bg-orange-100 transition-colors"
                title="Hapus soal lama dari materi ini, lalu proses ulang semua chunk"
                onClick={() => onPrepareReExtract(m)}
                disabled={extractRunning}
              >
                <RotateCcw className="h-3 w-3" />
                Reset & Proses Ulang Semua
              </button>
            )}
          </div>

          {/* Exam selector + action buttons */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-48">
              <Label className="text-[10px] mb-1 block">Tryout tujuan (opsional)</Label>
              <Select
                value={extractExamId || "__none__"}
                onValueChange={(v) => {
                  setExtractExamId(v === "__none__" ? "" : v);
                  onResetExtractChunks(m);
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
                  onClick={() => onDoExtractQuestions(m, true)}
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
                  onClick={() => { onResetExtractChunks(m); }}
                  title="Reset semua bagian ke idle"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              {!mChunks && (
                <Button
                  size="sm" className="h-8 text-xs gap-1"
                  onClick={() => { onInitExtractChunks(m); }}
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
                      {cs.count > 0
                        ? `${cs.count} soal${cs.svgCount ? ` · ${cs.svgCount} bergambar SVG` : ""}`
                        : "0 soal (tidak ada soal ditemukan)"}
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
                            body: { text_chunk: chunks[cs.index], exam_id: extractExamId || undefined, material_id: m.id, category: m.category, topic: m.topic ?? undefined },
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (error || data?.error) {
                            const msg = data?.error ?? error?.message ?? "Gagal";
                            setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c) }));
                          } else {
                            setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "done", count: data.count ?? 0, svgCount: data.with_svg ?? 0, errorMsg: undefined } : c) }));
                          }
                        } catch (e: any) {
                          setExtractChunks((prev) => ({ ...prev, [m.id]: prev[m.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: e.message ?? "Error" } : c) }));
                        }
                        setExtractRunning(false);
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
}
