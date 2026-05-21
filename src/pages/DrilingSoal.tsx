import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, RefreshCw, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PlatinumExam = { id: string; title: string };

type Question = {
  id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  subtest: string;
  explanation: string | null;
};

const SUBTESTS = [
  { value: "all", label: "Semua Subtes" },
  { value: "twk", label: "TWK" },
  { value: "tiu", label: "TIU" },
  { value: "tkp", label: "TKP" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DrilingSoal = () => {
  const { user } = useAuth();
  const [platinumExams, setPlatinumExams] = useState<PlatinumExam[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);

  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [selectedSubtest, setSelectedSubtest] = useState<string>("all");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffled, setShuffled] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);

  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check platinum access
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("exam_purchases")
        .select("exam_id, exams!inner(id, title)")
        .eq("user_id", user.id)
        .ilike("exams.title", "%platinum%");
      const exams: PlatinumExam[] = (data ?? []).map((row: any) => ({
        id: row.exams.id,
        title: row.exams.title,
      }));
      setPlatinumExams(exams);
      setLoadingAccess(false);
    })();
  }, [user]);

  // Load questions when filters change
  useEffect(() => {
    if (platinumExams.length === 0) return;
    setLoadingQ(true);

    const examIds =
      selectedExamId === "all"
        ? platinumExams.map((e) => e.id)
        : [selectedExamId];

    (async () => {
      // Questions are linked to exams via junction table (exam_id on questions is NULL)
      const { data: assignments } = await supabase
        .from("exam_question_assignments" as any)
        .select("question_id")
        .in("exam_id", examIds);

      const questionIds = (assignments ?? []).map((a: any) => a.question_id);
      if (questionIds.length === 0) {
        setQuestions([]);
        setShuffled([]);
        setIdx(0);
        setChosen(null);
        setShowFeedback(false);
        setLoadingQ(false);
        return;
      }

      let query = (supabase as any)
        .from("questions")
        .select("id,question_text,options,correct_answer,subtest,explanation")
        .in("id", questionIds);
      if (selectedSubtest !== "all") query = query.eq("subtest", selectedSubtest);

      const { data } = await query;
      const qs: Question[] = data ?? [];
      setQuestions(qs);
      setShuffled(shuffle(qs));
      setIdx(0);
      setChosen(null);
      setShowFeedback(false);
      setLoadingQ(false);
    })();
  }, [platinumExams, selectedExamId, selectedSubtest]);

  const current = shuffled[idx];

  const handleAnswer = (key: string) => {
    if (showFeedback) return;
    setChosen(key);
    setShowFeedback(true);
  };

  const handleNext = useCallback(() => {
    setChosen(null);
    setShowFeedback(false);
    setIdx((prev) => (prev + 1) % shuffled.length);
  }, [shuffled.length]);

  const handleRestart = () => {
    setShuffled(shuffle(questions));
    setIdx(0);
    setChosen(null);
    setShowFeedback(false);
  };

  const optionKeys = current ? Object.keys(current.options).sort() : [];

  if (loadingAccess) {
    return (
      <AppLayout>
        <PageHeader title="Drilling Soal" breadcrumbs={[{ label: "Drilling Soal" }]} />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </AppLayout>
    );
  }

  if (platinumExams.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Drilling Soal" breadcrumbs={[{ label: "Drilling Soal" }]} />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Lock className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-900">Fitur Eksklusif Paket Platinum</p>
              <p className="mt-1 text-sm text-amber-700">
                Drilling Soal hanya tersedia bagi member yang memiliki Paket Platinum.
                Upgrade sekarang untuk akses latihan soal tak terbatas.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link to="/beli-paket">Lihat Paket Platinum</Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Drilling Soal" breadcrumbs={[{ label: "Drilling Soal" }]} />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pilih paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Paket Platinum</SelectItem>
              {platinumExams.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubtest} onValueChange={setSelectedSubtest}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Pilih subtes" />
            </SelectTrigger>
            <SelectContent>
              {SUBTESTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={handleRestart}>
            <RefreshCw className="h-3.5 w-3.5" /> Acak Ulang
          </Button>
        </div>

        {loadingQ ? (
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        ) : shuffled.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Tidak ada soal ditemukan untuk filter yang dipilih.
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${idx}-${selectedExamId}-${selectedSubtest}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="space-y-5 p-5 md:p-7">
                  {/* Progress */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Soal {idx + 1} dari {shuffled.length}</span>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {current.subtest?.toUpperCase() ?? "—"}
                    </Badge>
                  </div>

                  {/* Question */}
                  <p className="text-base font-medium leading-relaxed text-foreground">
                    {current.question_text}
                  </p>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {optionKeys.map((key) => {
                      const isCorrect = key === current.correct_answer;
                      const isChosen = key === chosen;
                      let variant: "default" | "outline" = "outline";
                      let extraClass = "hover:bg-muted/60 cursor-pointer";

                      if (showFeedback) {
                        if (isCorrect) extraClass = "border-green-500 bg-green-50 text-green-800 cursor-default";
                        else if (isChosen) extraClass = "border-red-400 bg-red-50 text-red-800 cursor-default";
                        else extraClass = "opacity-50 cursor-default";
                      }

                      return (
                        <button
                          key={key}
                          onClick={() => handleAnswer(key)}
                          disabled={showFeedback}
                          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${extraClass}`}
                        >
                          <span className="shrink-0 font-bold uppercase">{key}.</span>
                          <span className="flex-1">{current.options[key]}</span>
                          {showFeedback && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                          {showFeedback && isChosen && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback + explanation */}
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        chosen === current.correct_answer
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {chosen === current.correct_answer ? (
                          <><CheckCircle2 className="h-4 w-4" /> Jawaban Benar!</>
                        ) : (
                          <><XCircle className="h-4 w-4" /> Salah. Jawaban benar: <strong className="uppercase">{current.correct_answer}</strong></>
                        )}
                      </div>

                      {current.explanation && (
                        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Pembahasan: </span>
                          {current.explanation}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button onClick={handleNext} className="gap-1.5 rounded-full">
                          {idx + 1 < shuffled.length ? "Soal Berikutnya" : "Ulang dari Awal"}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
};

export default DrilingSoal;
