import { Loader2, Plus, RotateCcw, Trash2, X, Pencil, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GlobalBankQ, Exam } from "@/types/admin";

interface GlobalBankTableProps {
  globalBank: GlobalBankQ[];
  globalBankLoading: boolean;
  globalBankFilter: { subtest: string; source: string; assigned: string; search: string };
  setGlobalBankFilter: React.Dispatch<React.SetStateAction<{ subtest: string; source: string; assigned: string; search: string }>>;
  globalBankSelectedIds: Set<string>;
  setGlobalBankSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  distributeOpen: boolean;
  setDistributeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  distributeTargetIds: Set<string>;
  setDistributeTargetIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  distributing: boolean;
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deleting: boolean;
  exams: Exam[];
  bankListMode: null | "manual" | "ai";
  setBankListMode: React.Dispatch<React.SetStateAction<null | "manual" | "ai">>;
  // New question form (shared state from Admin)
  newQ: {
    question_text: string; a: string; b: string; c: string; d: string; e: string;
    correct: string; subtest: string; pa: number; pb: number; pc: number; pd: number; pe: number;
    explanation: string; image_url: string; topic: string;
  };
  setNewQ: React.Dispatch<React.SetStateAction<any>>;
  newQUploadingImg: boolean;
  // AI gen state
  aiGen: {
    subtest: "twk" | "tiu" | "tkp"; topic: string; count: number;
  };
  setAiGen: React.Dispatch<React.SetStateAction<any>>;
  aiStatus: "idle" | "loading" | "done" | "error";
  setAiStatus: React.Dispatch<React.SetStateAction<"idle" | "loading" | "done" | "error">>;
  aiResult: { count: number; requested: number } | null;
  aiError: string;
  TOPIC_OPTIONS: Record<string, { value: string; label: string }[]>;
  emptyNewQ: () => any;
  onAddQuestionToBank: () => Promise<void>;
  onGenerateViaAI: (targetExamId?: string) => Promise<void>;
  onLoadGlobalBank: () => void;
  onBulkDistribute: () => Promise<void>;
  onBulkDeleteQuestions: () => Promise<void>;
}

export function GlobalBankTable({
  globalBank,
  globalBankLoading,
  globalBankFilter,
  setGlobalBankFilter,
  globalBankSelectedIds,
  setGlobalBankSelectedIds,
  distributeOpen,
  setDistributeOpen,
  distributeTargetIds,
  setDistributeTargetIds,
  distributing,
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  deleting,
  exams,
  bankListMode,
  setBankListMode,
  newQ,
  setNewQ,
  newQUploadingImg,
  aiGen,
  setAiGen,
  aiStatus,
  setAiStatus,
  aiResult,
  aiError,
  TOPIC_OPTIONS,
  emptyNewQ,
  onAddQuestionToBank,
  onGenerateViaAI,
  onLoadGlobalBank,
  onBulkDistribute,
  onBulkDeleteQuestions,
}: GlobalBankTableProps) {
  return (
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
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onLoadGlobalBank} disabled={globalBankLoading}>
            {globalBankLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Tambah Manual form (bank mode) */}
      {bankListMode === "manual" && (
        <Card>
          <CardHeader><h3 className="font-semibold text-sm flex items-center gap-2"><Pencil className="h-4 w-4" /> Tambah Soal Manual ke Bank</h3></CardHeader>
          <CardContent className="space-y-3">
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
              <Button onClick={onAddQuestionToBank} disabled={newQUploadingImg}>Tambah ke Bank</Button>
              <Button variant="outline" onClick={() => { setBankListMode(null); setNewQ(emptyNewQ()); }}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate AI form (bank mode) */}
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
                <Select value={aiGen.subtest} onValueChange={(v: any) => setAiGen((g: any) => ({ ...g, subtest: v, topic: v === "twk" ? "pancasila" : v === "tiu" ? "analogi" : "pelayanan" }))}>
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
                <Select value={aiGen.topic} onValueChange={(v) => setAiGen((g: any) => ({ ...g, topic: v }))}>
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
                <Input type="number" min={1} max={30} className="h-8 text-xs" value={aiGen.count} onChange={(e) => setAiGen((g: any) => ({ ...g, count: Math.max(1, Math.min(30, +e.target.value)) }))} />
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
              <Button onClick={() => onGenerateViaAI(undefined)} disabled={aiStatus === "loading"}>
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
                <Button variant="destructive" onClick={onBulkDeleteQuestions} disabled={deleting} className="gap-2">
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
                  onClick={onBulkDistribute}
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
  );
}
