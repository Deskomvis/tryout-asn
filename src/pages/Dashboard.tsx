import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import { Clock, FileText, Trophy, BarChart3 } from "lucide-react";

type Exam = { id: string; title: string; description: string | null; duration: number; total_questions: number; price: number };
type Score = { id: string; score: number; completed_at: string; exam_id: string; exams: { title: string } | null };

const Dashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    supabase.from("exams").select("*").order("created_at").then(({ data }) => setExams(data ?? []));
    supabase.from("user_scores").select("id, score, completed_at, exam_id, exams(title)")
      .eq("user_id", user!.id).order("completed_at", { ascending: false })
      .then(({ data }) => setScores((data as any) ?? []));
  }, [user]);

  const avg = scores.length ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores.map((s) => s.score)) : 0;

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container py-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Pilih tryout dan pantau perkembanganmu.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, label: "Total Ujian", value: scores.length },
            { icon: BarChart3, label: "Skor Rata-rata", value: avg },
            { icon: Trophy, label: "Skor Tertinggi", value: best },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary"><s.icon className="h-5 w-5" /></div>
                <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Tryout Tersedia</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((e) => (
              <Card key={e.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{e.title}</h3>
                    {e.price === 0 ? <Badge variant="secondary">Gratis</Badge> : <Badge>Rp {e.price.toLocaleString("id-ID")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{e.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {Math.round(e.duration / 60)} menit</span>
                    <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {e.total_questions} soal</span>
                  </div>
                  <Button asChild className="w-full"><Link to={`/exam/${e.id}`}>Mulai Tryout</Link></Button>
                </CardContent>
              </Card>
            ))}
            {exams.length === 0 && <p className="text-muted-foreground">Belum ada tryout.</p>}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Riwayat Ujian</h2>
          <Card><CardContent className="pt-6">
            {scores.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada riwayat.</p> : (
              <ul className="divide-y divide-border">
                {scores.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{s.exams?.title ?? "Tryout"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.completed_at).toLocaleString("id-ID")}</p>
                    </div>
                    <Badge variant={s.score >= 70 ? "default" : "secondary"}>Skor {s.score}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </section>
      </main>
      <WhatsAppButton />
    </div>
  );
};

export default Dashboard;
