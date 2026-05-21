import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Timer, CheckCircle2, Circle, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  question_text: string;
  options: string[];
  subtest?: string;
  explanation?: string;
  image_url?: string | null;
  svg_content?: string | null;
};

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const getSubtestLabel = (subtest?: string) => {
  const labels: Record<string, string> = {
    twk: "Tes Wawasan Kebangsaan",
    tiu: "Tes Intelegensia Umum",
    tkp: "Tes Karakteristik Pribadi",
    TWK: "Tes Wawasan Kebangsaan",
    TIU: "Tes Intelegensia Umum",
    TKP: "Tes Karakteristik Pribadi",
  };
  return labels[subtest || ""] || "Soal";
};

// Timer color: 7 segments proportional to total duration
// Last 5 min (300s) = always red with pulse
// Remaining 6 segments scaled proportionally
const getTimerStyle = (timeLeft: number, totalDuration: number) => {
  if (timeLeft <= 300) {
    return { bg: "bg-red-600", text: "text-white", pulse: true };
  }
  const above = timeLeft - 300;
  const usable = Math.max(totalDuration - 300, 1);
  const ratio = above / usable; // 1 = full time, 0 = just above 5-min mark

  if (ratio > 5 / 6) return { bg: "bg-blue-700",   text: "text-white", pulse: false };
  if (ratio > 4 / 6) return { bg: "bg-blue-400",    text: "text-white", pulse: false };
  if (ratio > 3 / 6) return { bg: "bg-green-700",   text: "text-white", pulse: false };
  if (ratio > 2 / 6) return { bg: "bg-green-400",   text: "text-white", pulse: false };
  if (ratio > 1 / 6) return { bg: "bg-yellow-400",  text: "text-gray-900", pulse: false };
  return                      { bg: "bg-orange-500", text: "text-white", pulse: false };
};

const PROGRESS_KEY = (id: string) => `exam-progress-${id}`;
const END_KEY      = (id: string) => `exam-end-${id}`;

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
  const totalDurationRef = useRef(0);

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
    localStorage.removeItem(END_KEY(examId!));
    localStorage.removeItem(PROGRESS_KEY(examId!));
    localStorage.setItem(`exam-answers-${examId}`, JSON.stringify(answers));
    toast.success(auto ? `Waktu habis! Skor: ${data}` : `Selesai. Skor: ${data}`);
    navigate(`/exam-results/${examId}`);
  }, [examId, answers, navigate]);

  // Load exam + questions, restore progress
  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("exams").select("title,duration").eq("id", examId!).maybeSingle();
      if (!e) { toast.error("Ujian tidak ditemukan"); navigate("/dashboard"); return; }
      setExam(e);
      totalDurationRef.current = e.duration;

      const key = END_KEY(examId!);
      const stored = localStorage.getItem(key);
      let endAt: number;
      if (stored && Number(stored) > Date.now()) {
        endAt = Number(stored);
        startedAt.current = Date.now() - (e.duration * 1000 - (endAt - Date.now()));
      } else {
        endAt = Date.now() + e.duration * 1000;
        localStorage.setItem(key, String(endAt));
      }
      endAtRef.current = endAt;
      setTimeLeft(Math.max(0, Math.round((endAt - Date.now()) / 1000)));

      const { data: qs } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
      const loaded: Q[] = (qs as any) ?? [];
      setQuestions(loaded);

      // Restore in-progress answers
      const saved = localStorage.getItem(PROGRESS_KEY(examId!));
      if (saved) {
        try {
          const restored: Record<string, string> = JSON.parse(saved);
          setAnswers(restored);
          // Jump to first unanswered question
          const firstUnanswered = loaded.findIndex((q) => !restored[q.id]);
          if (firstUnanswered !== -1) setCurrent(firstUnanswered);
        } catch { /* ignore */ }
      }
    })();
  }, [examId, navigate]);

  // Persist answers whenever they change
  useEffect(() => {
    if (examId && Object.keys(answers).length > 0) {
      localStorage.setItem(PROGRESS_KEY(examId), JSON.stringify(answers));
    }
  }, [answers, examId]);

  // Timer — absolute end time, syncs on tab visibility restore
  useEffect(() => {
    if (!exam) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const t = setInterval(tick, 500);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [exam]);

  useEffect(() => {
    if (exam && timeLeft === 0 && !submittedRef.current && questions.length > 0) submit(true);
  }, [timeLeft, exam, submit, questions.length]);

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => answers[k]).length,
    [answers]
  );

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Memuat ujian...</div>
      </div>
    );
  }

  const q = questions[current];
  const timerStyle = getTimerStyle(timeLeft, totalDurationRef.current || exam.duration);

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Soal {current + 1} dari {questions.length} · Terjawab {answeredCount}/{questions.length}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xl font-bold shadow-md transition-colors duration-700 shrink-0",
            timerStyle.bg, timerStyle.text,
            timerStyle.pulse && "animate-pulse"
          )}>
            <Timer className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <main className="px-4 py-5 md:px-6">
        <Progress value={questions.length ? (answeredCount / questions.length) * 100 : 0} className="mb-5" />

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          {/* Question card */}
          <AnimatePresence mode="wait">
            {q && (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Soal {current + 1} · {getSubtestLabel(q.subtest)}
                        </div>
                        <h2 className="text-base font-semibold leading-snug">{q.question_text}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast.info("Fitur laporkan soal sedang dalam pengembangan")}
                        className="shrink-0 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Laporkan</span>
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {q.svg_content && (
                      <div
                        className="mb-4 overflow-x-auto rounded-lg border bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: q.svg_content }}
                      />
                    )}
                    {q.image_url && !q.svg_content && (
                      <div className="mb-4">
                        <img src={q.image_url} alt="Gambar soal" className="w-full rounded-lg border object-contain" />
                      </div>
                    )}
                    <div className="space-y-2">
                      {q.options.map((opt, idx) => {
                        const selected = answers[q.id] === opt;
                        const label = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                              if (current < questions.length - 1) setCurrent((c) => c + 1);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border hover:bg-accent"
                            )}
                          >
                            <div className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                              selected ? "bg-primary border-primary text-white" : "border-muted-foreground/30 text-muted-foreground"
                            )}>
                              {label}
                            </div>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-6 flex justify-between gap-3">
                      <Button variant="outline" size="lg" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                        ← Sebelumnya
                      </Button>
                      {current < questions.length - 1 ? (
                        <Button size="lg" onClick={() => setCurrent((c) => c + 1)}>Selanjutnya →</Button>
                      ) : (
                        <Button size="lg" onClick={() => submit(false)} disabled={submitting}>
                          {submitting ? "Mengirim..." : "Selesai & Submit"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigator sidebar */}
          <div className="lg:sticky lg:top-[73px] h-fit">
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-semibold">Nomor Soal</h3>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
                  <span><CheckCircle2 className="mr-1 inline h-3 w-3 text-primary" />Terjawab</span>
                  <span><Circle className="mr-1 inline h-3 w-3 text-muted-foreground" />Belum</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((qq, i) => {
                    const answered = !!answers[qq.id];
                    const isCurrent = i === current;
                    return (
                      <button
                        key={qq.id}
                        onClick={() => setCurrent(i)}
                        className={cn(
                          "flex h-9 items-center justify-center rounded border text-sm font-semibold transition-all",
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
                <Button className="w-full" size="lg" onClick={() => submit(false)} disabled={submitting}>
                  {submitting ? "Mengirim..." : "Selesaikan Ujian"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Exam;
