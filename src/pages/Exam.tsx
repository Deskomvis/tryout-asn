import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Timer, CheckCircle2, Circle, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Q = { id: string; question_text: string; options: string[]; subtest?: string };

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const getSubtestLabel = (subtest?: string) => {
  const labels: Record<string, string> = {
    TWK: "Tes Wawasan Kebangsaan",
    TIU: "Tes Intelegensia Umum",
    TKP: "Tes Karakteristik Pribadi",
  };
  return labels[subtest || ""] || "Soal";
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
  const endAtRef = useRef<number>(0);
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
    localStorage.removeItem(`exam-end-${examId}`);
    toast.success(auto ? `Waktu habis! Skor: ${data}` : `Selesai. Skor: ${data}`);
    navigate(`/exam-results/${examId}`);
  }, [examId, answers, navigate]);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("exams").select("title,duration").eq("id", examId!).maybeSingle();
      if (!e) { toast.error("Ujian tidak ditemukan"); navigate("/dashboard"); return; }
      setExam(e);
      const key = `exam-end-${examId}`;
      const stored = localStorage.getItem(key);
      let endAt: number;
      if (stored && Number(stored) > Date.now()) {
        endAt = Number(stored);
      } else {
        endAt = Date.now() + e.duration * 1000;
        localStorage.setItem(key, String(endAt));
      }
      endAtRef.current = endAt;
      setTimeLeft(Math.max(0, Math.round((endAt - Date.now()) / 1000)));
      const { data: qs } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
      setQuestions((qs as any) ?? []);
    })();
  }, [examId, navigate]);

  // Timer based on absolute end time — unaffected by tab throttling
  useEffect(() => {
    if (!exam) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const t = setInterval(tick, 500);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [exam]);

  useEffect(() => {
    if (exam && timeLeft === 0 && !submittedRef.current && questions.length > 0) submit(true);
  }, [timeLeft, exam, submit, questions.length]);

  const answeredCount = useMemo(() => Object.keys(answers).filter(k => answers[k]).length, [answers]);

  if (!exam) return <AppLayout><div className="flex items-center justify-center py-20">Memuat...</div></AppLayout>;
  const q = questions[current];

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                Soal {current + 1} dari {questions.length} · Terjawab {answeredCount}/{questions.length}
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold",
              timeLeft < 60 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"
            )}>
              <Timer className="h-5 w-5" /> {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <Progress value={questions.length ? (answeredCount / questions.length) * 100 : 0} className="mb-6" />

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <AnimatePresence mode="wait">
            {q && (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Soal {current + 1} · {getSubtestLabel(q.subtest)}</div>
                        <h2 className="mt-2 text-lg font-semibold">{q.question_text}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast.info("Fitur laporkan soal sedang dalam pengembangan")}
                        className="flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Flag className="h-4 w-4" />
                        <span className="hidden sm:inline">Laporkan</span>
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border hover:bg-accent"
                            )}
                          >
                            <span className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                              selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                            )}>
                              {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex justify-between gap-3">
                      <Button variant="outline" size="lg" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>← Sebelumnya</Button>
                      {current < questions.length - 1 ? (
                        <Button size="lg" onClick={() => setCurrent((c) => c + 1)}>Selanjutnya →</Button>
                      ) : (
                        <Button size="lg" onClick={() => submit(false)} disabled={submitting}>{submitting ? "Mengirim..." : "Selesai & Submit"}</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <h3 className="font-semibold">Nomor Soal</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mr-1 inline h-3 w-3 text-primary" /> Terjawab
                <Circle className="ml-3 mr-1 inline h-3 w-3 text-muted-foreground" /> Belum
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((qq, i) => {
                  const answered = !!answers[qq.id];
                  const isCurrent = i === current;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => setCurrent(i)}
                      className={cn(
                        "flex h-10 items-center justify-center rounded border text-sm font-semibold transition-all",
                        isCurrent && "ring-2 ring-primary ring-offset-1",
                        answered
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      )}
                      aria-label={`Soal ${i + 1}${answered ? " (terjawab)" : ""}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => submit(false)}
                disabled={submitting}
              >
                {submitting ? "Mengirim..." : "Selesaikan Ujian"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Exam;
