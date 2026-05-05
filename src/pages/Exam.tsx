import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Q = { id: string; question_text: string; options: string[] };

const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<{ title: string; duration: number } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const submittedRef = useRef(false);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const timeSpent = Math.round((Date.now() - startedAt.current) / 1000);
    const { data, error } = await supabase.rpc("submit_exam", {
      _exam_id: examId!, _answers: answers, _time_spent: timeSpent,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); submittedRef.current = false; return; }
    toast.success(auto ? `Waktu habis! Skor: ${data}` : `Selesai. Skor: ${data}`);
    navigate("/dashboard");
  }, [examId, answers, navigate]);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("exams").select("title,duration").eq("id", examId!).maybeSingle();
      if (!e) { toast.error("Ujian tidak ditemukan"); navigate("/dashboard"); return; }
      setExam(e); setTimeLeft(e.duration);
      const { data: qs } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
      setQuestions((qs as any) ?? []);
    })();
  }, [examId, navigate]);

  useEffect(() => {
    if (!exam || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [exam, timeLeft]);

  useEffect(() => {
    if (exam && timeLeft === 0 && !submittedRef.current) submit(true);
  }, [timeLeft, exam, submit]);

  if (!exam) return <div className="flex min-h-screen items-center justify-center">Memuat...</div>;
  const q = questions[current];

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-sm text-muted-foreground">Soal {current + 1} dari {questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold ${timeLeft < 60 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
            <Timer className="h-5 w-5" /> {formatTime(timeLeft)}
          </div>
        </div>

        <Progress value={questions.length ? ((current + 1) / questions.length) * 100 : 0} className="mb-6" />

        {q && (
          <Card>
            <CardHeader><h2 className="text-lg font-semibold">{q.question_text}</h2></CardHeader>
            <CardContent>
              <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                {q.options.map((opt) => (
                  <div key={opt} className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-accent">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>Sebelumnya</Button>
                {current < questions.length - 1 ? (
                  <Button onClick={() => setCurrent((c) => c + 1)}>Berikutnya</Button>
                ) : (
                  <Button onClick={() => submit(false)} disabled={submitting}>{submitting ? "Mengirim..." : "Selesai & Submit"}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Exam;
