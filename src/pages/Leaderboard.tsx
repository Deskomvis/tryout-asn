import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ChevronRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

type ExamRow = { id: string; title: string; category: string; subcategory: string | null };
type ScoreRow = { id: string; score: number; user_id: string; exam_id: string; profiles: { username: string | null; full_name: string | null } | null };

type Level = "category" | "subcategory" | "exam" | "board";

const MEDAL = ["🥇", "🥈", "🥉"];

const Leaderboard = () => {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [level, setLevel] = useState<Level>("category");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("exams" as any)
        .select("id,title,category,subcategory")
        .is("parent_exam_id", null)
        .then(({ data }) => setExams((data as ExamRow[]) ?? [])),
      supabase.from("user_scores" as any)
        .select("id,score,user_id,exam_id,profiles(username,full_name)")
        .order("score", { ascending: false })
        .then(({ data }) => setScores((data as ScoreRow[]) ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  // Derived lists
  const categories = useMemo(() => Array.from(new Set(exams.map((e) => e.category).filter(Boolean))).sort(), [exams]);

  const subcategories = useMemo(() =>
    Array.from(new Set(
      exams.filter((e) => e.category?.toLowerCase() === selectedCategory?.toLowerCase())
        .map((e) => e.subcategory).filter(Boolean) as string[]
    )).sort(),
  [exams, selectedCategory]);

  const examsInGroup = useMemo(() =>
    exams.filter(
      (e) =>
        e.category?.toLowerCase() === selectedCategory?.toLowerCase() &&
        (e.subcategory ?? "") === selectedSubcategory
    ),
  [exams, selectedCategory, selectedSubcategory]);

  const boardRows = useMemo(() => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam) return [];
    // Best score per user for this exam
    const best: Record<string, ScoreRow> = {};
    scores
      .filter((s) => s.exam_id === selectedExamId)
      .forEach((s) => {
        if (!best[s.user_id] || s.score > best[s.user_id].score) best[s.user_id] = s;
      });
    return Object.values(best).sort((a, b) => b.score - a.score);
  }, [scores, selectedExamId, exams]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const go = (next: Level, cat?: string, sub?: string, examId?: string) => {
    if (cat !== undefined) setSelectedCategory(cat);
    if (sub !== undefined) setSelectedSubcategory(sub);
    if (examId !== undefined) setSelectedExamId(examId);
    setLevel(next);
  };

  const back = () => {
    if (level === "board") setLevel("exam");
    else if (level === "exam") setLevel("subcategory");
    else if (level === "subcategory") setLevel("category");
  };

  // Breadcrumb
  const breadcrumbs = [
    { label: "Kategori", active: level === "category" },
    ...(selectedCategory ? [{ label: selectedCategory, active: level === "subcategory" }] : []),
    ...(selectedSubcategory ? [{ label: selectedSubcategory, active: level === "exam" }] : []),
    ...(selectedExam ? [{ label: selectedExam.title, active: level === "board" }] : []),
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>

        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span className={b.active ? "font-semibold text-foreground" : ""}>{b.label}</span>
            </span>
          ))}
        </div>

        {/* Back button */}
        {level !== "category" && (
          <button
            type="button"
            onClick={back}
            className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        )}

        {loading ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Memuat data…</CardContent></Card>
        ) : (
          <>
            {/* Level 1: Category */}
            {level === "category" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((cat, i) => (
                  <motion.button
                    key={cat}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => go("subcategory", cat)}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <span className="font-semibold text-foreground">{cat.toUpperCase()}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                ))}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data.</p>}
              </div>
            )}

            {/* Level 2: Subcategory */}
            {level === "subcategory" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {subcategories.map((sub, i) => (
                  <motion.button
                    key={sub}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => go("exam", undefined, sub)}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <span className="font-semibold text-foreground">{sub}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                ))}
                {subcategories.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada subkategori.</p>}
              </div>
            )}

            {/* Level 3: Exam list */}
            {level === "exam" && (
              <div className="grid gap-3">
                {examsInGroup.map((exam, i) => {
                  const cnt = scores.filter((s) => s.exam_id === exam.id).length;
                  return (
                    <motion.button
                      key={exam.id}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => go("board", undefined, undefined, exam.id)}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{exam.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cnt} peserta</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  );
                })}
                {examsInGroup.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada paket di subkategori ini.</p>}
              </div>
            )}

            {/* Level 4: Leaderboard */}
            {level === "board" && (
              <Card>
                <CardContent className="pt-6">
                  {boardRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada peserta yang mengikuti tryout ini.</p>
                  ) : (
                    <ol className="divide-y divide-border">
                      {boardRows.map((r, i) => (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                              {i < 3 ? MEDAL[i] : i + 1}
                            </span>
                            <p className="truncate font-medium">
                              {r.profiles?.username ?? r.profiles?.full_name ?? "Anonim"}
                            </p>
                          </div>
                          <span className={`font-bold ${i < 3 ? "text-primary" : "text-foreground"}`}>{r.score}</span>
                        </motion.li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
