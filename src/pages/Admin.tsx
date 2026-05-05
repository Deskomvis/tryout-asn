import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Exam = { id: string; title: string; total_questions: number };
type Question = { id: string; exam_id: string; question_text: string; options: string[]; correct_answer: string };
type Score = { id: string; score: number; completed_at: string; profiles: { full_name: string | null; email: string | null } | null; exams: { title: string } | null };

const Admin = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [newQ, setNewQ] = useState({ question_text: "", a: "", b: "", c: "", d: "", correct: "" });
  const [newExam, setNewExam] = useState({ title: "", description: "", duration: 600, price: 0 });

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
  };

  useEffect(() => { refresh(); }, [selectedExam]);

  const addExam = async () => {
    if (!newExam.title) return toast.error("Judul wajib");
    const { error } = await supabase.from("exams").insert({ ...newExam, total_questions: 0 });
    if (error) return toast.error(error.message);
    toast.success("Tryout dibuat"); setNewExam({ title: "", description: "", duration: 600, price: 0 }); refresh();
  };

  const addQuestion = async () => {
    if (!selectedExam) return toast.error("Pilih tryout dulu");
    if (!newQ.question_text || !newQ.correct) return toast.error("Lengkapi soal & jawaban");
    const options = [newQ.a, newQ.b, newQ.c, newQ.d].filter(Boolean);
    if (!options.includes(newQ.correct)) return toast.error("Jawaban benar harus salah satu opsi");
    const { error } = await supabase.from("questions").insert({
      exam_id: selectedExam, question_text: newQ.question_text, options, correct_answer: newQ.correct,
    });
    if (error) return toast.error(error.message);
    await supabase.from("exams").update({ total_questions: questions.length + 1 }).eq("id", selectedExam);
    toast.success("Soal ditambahkan");
    setNewQ({ question_text: "", a: "", b: "", c: "", d: "", correct: "" }); refresh();
  };

  const deleteQ = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    await supabase.from("exams").update({ total_questions: Math.max(0, questions.length - 1) }).eq("id", selectedExam);
    refresh();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-10">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Tabs defaultValue="questions" className="mt-6">
          <TabsList>
            <TabsTrigger value="questions">Manajemen Soal</TabsTrigger>
            <TabsTrigger value="exams">Tryout</TabsTrigger>
            <TabsTrigger value="scores">Skor User</TabsTrigger>
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
                  <div><Label>Pertanyaan</Label><Textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Opsi A</Label><Input value={newQ.a} onChange={(e) => setNewQ({ ...newQ, a: e.target.value })} /></div>
                    <div><Label>Opsi B</Label><Input value={newQ.b} onChange={(e) => setNewQ({ ...newQ, b: e.target.value })} /></div>
                    <div><Label>Opsi C</Label><Input value={newQ.c} onChange={(e) => setNewQ({ ...newQ, c: e.target.value })} /></div>
                    <div><Label>Opsi D</Label><Input value={newQ.d} onChange={(e) => setNewQ({ ...newQ, d: e.target.value })} /></div>
                  </div>
                  <div><Label>Jawaban Benar (ketik persis sama dengan opsi)</Label><Input value={newQ.correct} onChange={(e) => setNewQ({ ...newQ, correct: e.target.value })} /></div>
                  <Button onClick={addQuestion}>Tambah Soal</Button>
                </CardContent></Card>

                <Card><CardHeader><h2 className="font-semibold">Soal Saat Ini ({questions.length})</h2></CardHeader><CardContent>
                  <ul className="divide-y divide-border">
                    {questions.map((q) => (
                      <li key={q.id} className="flex items-start justify-between py-3">
                        <div>
                          <p className="font-medium">{q.question_text}</p>
                          <p className="text-xs text-muted-foreground">Jawaban: {q.correct_answer}</p>
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
              <div><Label>Judul</Label><Input value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} /></div>
              <div><Label>Deskripsi</Label><Textarea value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Durasi (detik)</Label><Input type="number" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: +e.target.value })} /></div>
                <div><Label>Harga (Rp)</Label><Input type="number" value={newExam.price} onChange={(e) => setNewExam({ ...newExam, price: +e.target.value })} /></div>
              </div>
              <Button onClick={addExam}>Buat Tryout</Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="scores">
            <Card><CardContent className="pt-6">
              <table className="w-full text-sm">
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
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
