import { useEffect, useState } from "react";
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
import { Trash2, Wallet, Check, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Exam = { id: string; title: string; total_questions: number };
type Question = { id: string; exam_id: string; question_text: string; options: string[]; correct_answer: string; subtest: string; option_points: Record<string, number> | null };
type Score = { id: string; score: number; completed_at: string; profiles: { full_name: string | null; email: string | null } | null; exams: { title: string } | null };
type Topup = { id: string; user_id: string; amount: number; status: "pending" | "approved" | "rejected"; created_at: string; profiles: { full_name: string | null; email: string | null } | null };
type UserBalance = { user_id: string; balance: number; profiles: { full_name: string | null; email: string | null } | null };

const Admin = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [adjustAmount, setAdjustAmount] = useState<Record<string, number>>({});
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [newQ, setNewQ] = useState({ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "", subtest: "tiu" as "twk"|"tiu"|"tkp"|"skb", pa: 5, pb: 4, pc: 3, pd: 2, pe: 1 });
  const [newExam, setNewExam] = useState({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "" });

  const refresh = async () => {
    const { data: e } = await supabase.from("exams").select("id,title,total_questions").order("created_at");
    setExams(e ?? []);
    if (selectedExam) {
      const { data: q } = await supabase.from("questions").select("*").eq("exam_id", selectedExam);
      setQuestions((q as any) ?? []);
    }
    const { data: s } = await supabase.from("user_scores")
      .select("id, score, completed_at, profiles(full_name,email), exams(title)")
      .order("completed_at", { ascending: false }).limit(100);
    setScores((s as any) ?? []);

    const { data: t } = await supabase.from("topup_requests")
      .select("id,user_id,amount,status,created_at")
      .order("created_at", { ascending: false }).limit(100);
    const { data: b } = await supabase.from("user_balances")
      .select("user_id,balance")
      .order("balance", { ascending: false }).limit(200);

    const ids = Array.from(new Set([...(t ?? []).map((x: any) => x.user_id), ...(b ?? []).map((x: any) => x.user_id)]));
    let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      profileMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
    }
    setTopups(((t as any) ?? []).map((x: any) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
    setBalances(((b as any) ?? []).map((x: any) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
  };

  useEffect(() => { refresh(); }, [selectedExam]);

  const approveTopup = async (t: Topup) => {
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: t.user_id, _amount: t.amount, _topup_id: t.id, _approve: true,
    });
    if (error) return toast.error(error.message);
    toast.success(`Topup Rp ${t.amount.toLocaleString("id-ID")} disetujui`);
    refresh();
  };

  const rejectTopup = async (t: Topup) => {
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: t.user_id, _amount: 0, _topup_id: t.id, _approve: false,
    });
    if (error) return toast.error(error.message);
    toast.success("Topup ditolak");
    refresh();
  };

  const adjustBalance = async (userId: string) => {
    const amt = adjustAmount[userId];
    if (!amt || isNaN(amt)) return toast.error("Masukkan nominal");
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: userId, _amount: amt, _topup_id: null, _approve: true,
    });
    if (error) return toast.error(error.message);
    toast.success(`Saldo diperbarui (${amt > 0 ? "+" : ""}Rp ${amt.toLocaleString("id-ID")})`);
    setAdjustAmount({ ...adjustAmount, [userId]: 0 });
    refresh();
  };

  const addExam = async () => {
    const title = newExam.title.trim();
    const subcategory = newExam.subcategory.trim();
    if (!title) return toast.error("Judul wajib");
    if (!newExam.category) return toast.error("Kategori utama wajib dipilih");
    if (!subcategory) return toast.error("Subkategori wajib diisi");
    if (subcategory.length > 80) return toast.error("Subkategori maksimal 80 karakter");
    const { error } = await supabase.from("exams").insert({
      ...newExam, title, subcategory, total_questions: 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Tryout dibuat"); setNewExam({ title: "", description: "", duration: 600, price: 0, original_price: 0, bundle_size: 1, category: "", subcategory: "" }); refresh();
  };

  const addQuestion = async () => {
    if (!selectedExam) return toast.error("Pilih tryout dulu");
    if (!newQ.question_text) return toast.error("Lengkapi pertanyaan");
    const optsRaw = [
      { k: "a", v: newQ.a, p: newQ.pa },
      { k: "b", v: newQ.b, p: newQ.pb },
      { k: "c", v: newQ.c, p: newQ.pc },
      { k: "d", v: newQ.d, p: newQ.pd },
      { k: "e", v: newQ.e, p: newQ.pe },
    ].filter((o) => o.v.trim());
    if (optsRaw.length < 2) return toast.error("Minimal 2 opsi");
    const options = optsRaw.map((o) => o.v);
    const payload: any = {
      exam_id: selectedExam, question_text: newQ.question_text, options, subtest: newQ.subtest,
    };
    if (newQ.subtest === "tkp") {
      payload.option_points = Object.fromEntries(optsRaw.map((o) => [o.v, o.p]));
      payload.correct_answer = optsRaw.reduce((m, o) => (o.p > m.p ? o : m), optsRaw[0]).v;
    } else {
      if (!newQ.correct || !options.includes(newQ.correct)) return toast.error("Jawaban benar harus salah satu opsi");
      payload.correct_answer = newQ.correct;
    }
    const { error } = await supabase.from("questions").insert(payload);
    if (error) return toast.error(error.message);
    await supabase.from("exams").update({ total_questions: questions.length + 1 }).eq("id", selectedExam);
    toast.success("Soal ditambahkan");
    setNewQ({ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "", subtest: newQ.subtest, pa: 5, pb: 4, pc: 3, pd: 2, pe: 1 }); refresh();
  };

  const deleteQ = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    await supabase.from("exams").update({ total_questions: Math.max(0, questions.length - 1) }).eq("id", selectedExam);
    refresh();
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
          </TabsList>

          <TabsContent value="questions" className="space-y-6">
            <Card><CardHeader><h2 className="font-semibold">Pilih Tryout</h2></CardHeader><CardContent>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger><SelectValue placeholder="Pilih tryout..." /></SelectTrigger>
                <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent></Card>

            {selectedExam && (
              <>
                <Card><CardHeader><h2 className="font-semibold">Tambah Soal</h2></CardHeader><CardContent className="space-y-3">
                  <div>
                    <Label>Subtes</Label>
                    <Select value={newQ.subtest} onValueChange={(v: any) => setNewQ({ ...newQ, subtest: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twk">TWK — Tes Wawasan Kebangsaan</SelectItem>
                        <SelectItem value="tiu">TIU — Tes Intelegensia Umum</SelectItem>
                        <SelectItem value="tkp">TKP — Tes Karakteristik Pribadi (poin 1–5)</SelectItem>
                        <SelectItem value="skb">SKB — Seleksi Kompetensi Bidang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Pertanyaan</Label><Textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} /></div>
                  {(["a","b","c","d","e"] as const).map((k) => (
                    <div key={k} className="grid grid-cols-[1fr_90px] gap-2 items-end">
                      <div><Label>Opsi {k.toUpperCase()}{k === "e" ? " (opsional)" : ""}</Label>
                        <Input value={(newQ as any)[k]} onChange={(e) => setNewQ({ ...newQ, [k]: e.target.value } as any)} />
                      </div>
                      {newQ.subtest === "tkp" && (
                        <div><Label>Poin</Label>
                          <Input type="number" min={1} max={5} value={(newQ as any)["p"+k]} onChange={(e) => setNewQ({ ...newQ, ["p"+k]: Math.max(1, Math.min(5, +e.target.value)) } as any)} />
                        </div>
                      )}
                    </div>
                  ))}
                  {newQ.subtest !== "tkp" && (
                    <div><Label>Jawaban Benar (ketik persis sama dengan opsi)</Label><Input value={newQ.correct} onChange={(e) => setNewQ({ ...newQ, correct: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">Benar = 5 poin, salah/kosong = 0.</p></div>
                  )}
                  {newQ.subtest === "tkp" && (
                    <p className="text-xs text-muted-foreground">TKP: setiap opsi punya nilai 1–5. Tidak ada jawaban salah.</p>
                  )}
                  <Button onClick={addQuestion}>Tambah Soal</Button>
                </CardContent></Card>

                <Card><CardHeader><h2 className="font-semibold">Soal Saat Ini ({questions.length})</h2></CardHeader><CardContent>
                  <ul className="divide-y divide-border">
                    {questions.map((q) => (
                      <li key={q.id} className="flex items-start justify-between py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase text-[10px]">{q.subtest ?? "tiu"}</Badge>
                            <p className="font-medium">{q.question_text}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {q.subtest === "tkp" && q.option_points
                              ? `Poin: ${Object.entries(q.option_points).map(([k,v]) => `${k}=${v}`).join(", ")}`
                              : `Jawaban: ${q.correct_answer}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteQ(q.id)}><Trash2 className="h-4 w-4" /></Button>
                      </li>
                    ))}
                  </ul>
                </CardContent></Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="exams">
            <Card><CardHeader><h2 className="font-semibold">Buat Tryout Baru</h2></CardHeader><CardContent className="space-y-3">
              <div><Label>Judul *</Label><Input placeholder="cth: SKB Bidan Ahli - Paket 1" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} /></div>
              <div><Label>Deskripsi</Label><Textarea placeholder="Ringkasan singkat paket tryout" value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Durasi (detik)</Label><Input type="number" placeholder="600" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: +e.target.value })} /></div>
                <div><Label>Jumlah Paket / Bundling</Label><Input type="number" min={1} placeholder="1" value={newExam.bundle_size} onChange={(e) => setNewExam({ ...newExam, bundle_size: Math.max(1, +e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Harga (Rp)</Label><Input type="number" placeholder="0 = gratis" value={newExam.price} onChange={(e) => setNewExam({ ...newExam, price: +e.target.value })} /></div>
                <div><Label>Harga Asli (coret, opsional)</Label><Input type="number" placeholder="cth: 182850" value={newExam.original_price} onChange={(e) => setNewExam({ ...newExam, original_price: +e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">Isi jika ingin menampilkan harga coret + badge diskon.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kategori Utama *</Label>
                  <Select value={newExam.category} onValueChange={(v) => setNewExam({ ...newExam, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Wajib pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpns">CPNS</SelectItem>
                      <SelectItem value="pppk">PPPK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subkategori *</Label>
                  <Input placeholder="cth: SKB Bidan Ahli" maxLength={80} value={newExam.subcategory} onChange={(e) => setNewExam({ ...newExam, subcategory: e.target.value })} />
                  <p className="mt-1 text-xs text-muted-foreground">Wajib diisi, maksimal 80 karakter.</p>
                </div>
              </div>
              <Button onClick={addExam}>Buat Tryout</Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="scores">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="text-left text-muted-foreground">
                    <th className="pb-2">Nama</th><th>Email</th><th>Tryout</th><th>Skor</th><th>Tanggal</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {scores.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2">{s.profiles?.full_name}</td>
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

          <TabsContent value="topups">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-secondary text-left">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Nominal</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topups.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{t.profiles?.full_name ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{t.profiles?.email}</div>
                        </td>
                        <td className="px-3 py-2 font-semibold">Rp {t.amount.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2">
                          <Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {t.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => approveTopup(t)} className="gap-1"><Check className="h-3.5 w-3.5" /> Setujui</Button>
                              <Button size="sm" variant="outline" onClick={() => rejectTopup(t)} className="gap-1"><X className="h-3.5 w-3.5" /> Tolak</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {topups.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada topup.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="balances">
            <Card><CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-secondary text-left">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Saldo</th>
                      <th className="px-3 py-2">Adjust (point, bisa negatif)</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {balances.map((b) => (
                      <tr key={b.user_id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{b.profiles?.full_name ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{b.profiles?.email}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 font-semibold"><Wallet className="h-3.5 w-3.5 text-primary" />{b.balance.toLocaleString("id-ID")}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={adjustAmount[b.user_id] ?? ""}
                            onChange={(e) => setAdjustAmount({ ...adjustAmount, [b.user_id]: Number(e.target.value) })}
                            placeholder="contoh: 50000 atau -10000"
                            className="max-w-[200px]"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" onClick={() => adjustBalance(b.user_id)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Terapkan</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
