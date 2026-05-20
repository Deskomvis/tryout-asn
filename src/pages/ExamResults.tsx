import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp,
  Trophy, Medal, Clock, BookOpen, Lock, ShoppingBag, Star, XCircle,
  Award, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSKDExam, isSKDPassed, getSKDSubtestStatus, SKD_PASSING } from "@/lib/skdScoring";

interface ExamResult {
  exam_id: string;
  exam_title: string;
  total_score: number;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  time_spent: number;
  answered_count: number;
  unanswered_count: number;
  total_questions: number;
  passing_score?: number;
  price: number;
  category?: string | null;
  subcategory?: string | null;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  subtest?: string;
  explanation?: string;
  correct_answer?: string;
  image_url?: string | null;
  svg_content?: string | null;
}

interface RankRow {
  user_id: string;
  username: string;
  total_score: number;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  time_spent: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const buildRanking = (
  allResults: any[],
  profileMap: Record<string, string>,
): RankRow[] =>
  Object.values(
    allResults.reduce((acc: Record<string, any>, r) => {
      if (!acc[r.user_id] || r.total_score > acc[r.user_id].total_score)
        acc[r.user_id] = r;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b.total_score - a.total_score || a.time_spent - b.time_spent)
    .map((r: any) => ({
      user_id: r.user_id,
      username: profileMap[r.user_id] ?? "Anonim",
      total_score: r.total_score ?? 0,
      twk_score: r.twk_score ?? 0,
      tiu_score: r.tiu_score ?? 0,
      tkp_score: r.tkp_score ?? 0,
      time_spent: r.time_spent ?? 0,
    }));

// ── PassCertificate ───────────────────────────────────────────────────────────
const PassCertificate = ({
  examTitle, totalScore, twkScore, tiuScore, tkpScore, isSkd,
}: {
  examTitle: string; totalScore: number;
  twkScore: number; tiuScore: number; tkpScore: number; isSkd: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85, y: 24 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    className="relative overflow-hidden rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 text-center shadow-xl md:p-10"
  >
    {/* Decorative rings */}
    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[16px] border-yellow-200/50" />
    <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full border-[12px] border-amber-200/50" />

    {/* Badge */}
    <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg">
      <Trophy className="h-12 w-12 text-white drop-shadow" />
      <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow">
        <CheckCircle2 className="h-4 w-4 text-white" />
      </div>
    </div>

    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-600">
      Ruang CASN
    </p>
    <h2 className="text-3xl font-extrabold leading-tight text-amber-900 md:text-4xl">
      Selamat, Anda Lulus!
    </h2>
    <p className="mx-auto mt-2 max-w-xs text-sm text-amber-700">{examTitle}</p>

    {/* Score pills */}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <div className="rounded-xl border border-amber-300 bg-white px-5 py-3 shadow-sm">
        <p className="text-xs text-muted-foreground">Total Skor</p>
        <p className="text-2xl font-extrabold text-amber-700">{totalScore}</p>
      </div>
      {isSkd && (
        <>
          <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">TWK</p>
            <p className="text-xl font-bold text-blue-600">{twkScore}</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">TIU</p>
            <p className="text-xl font-bold text-purple-600">{tiuScore}</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">TKP</p>
            <p className="text-xl font-bold text-orange-500">{tkpScore}</p>
          </div>
        </>
      )}
    </div>

    {/* Stars decoration */}
    <div className="mt-4 flex justify-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  </motion.div>
);

// ── FailBadge ─────────────────────────────────────────────────────────────────
const FailBadge = ({
  totalScore, isSkd, skdSubtestStatus, twkScore, tiuScore, tkpScore,
}: {
  totalScore: number; isSkd: boolean;
  skdSubtestStatus: { twk: boolean; tiu: boolean; tkp: boolean };
  twkScore: number; tiuScore: number; tkpScore: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 p-6 text-center shadow-md md:p-8"
  >
    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-300 bg-red-100">
      <XCircle className="h-10 w-10 text-red-500" />
    </div>
    <h2 className="text-2xl font-extrabold text-red-800 md:text-3xl">Anda Tidak Lulus</h2>
    <p className="mt-2 text-sm text-red-600">Silahkan coba ujian lagi dan tingkatkan persiapanmu!</p>

    <div className="mt-5 flex flex-wrap justify-center gap-3">
      <div className="rounded-xl border border-red-200 bg-white px-5 py-3 shadow-sm">
        <p className="text-xs text-muted-foreground">Total Skor</p>
        <p className="text-2xl font-extrabold text-red-600">{totalScore}</p>
      </div>
      {isSkd && (
        <>
          {(["twk", "tiu", "tkp"] as const).map((key) => (
            <div key={key} className={cn(
              "rounded-xl border bg-white px-4 py-3 shadow-sm",
              skdSubtestStatus[key] ? "border-green-200" : "border-red-200"
            )}>
              <p className="text-xs text-muted-foreground uppercase">{key}</p>
              <p className={cn("text-xl font-bold", skdSubtestStatus[key] ? "text-green-600" : "text-red-500")}>
                {key === "twk" ? twkScore : key === "tiu" ? tiuScore : tkpScore}
              </p>
              <p className={cn("text-[10px] font-semibold", skdSubtestStatus[key] ? "text-green-600" : "text-red-500")}>
                {skdSubtestStatus[key] ? "✓ Lulus" : `min ${SKD_PASSING[key]}`}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  </motion.div>
);

// ── RankingTable ──────────────────────────────────────────────────────────────
const RankingTable = ({
  rankings, myUserId, isSkd, label,
}: {
  rankings: RankRow[]; myUserId?: string; isSkd: boolean; label: string;
}) => {
  const myRank = rankings.findIndex((r) => r.user_id === myUserId);

  if (rankings.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data rangking {label}.</p>;

  const medalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-2">
      {myRank >= 0 && (
        <p className="text-sm font-medium text-primary">Posisi Anda di {label}: #{myRank + 1}</p>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold w-10">#</th>
              <th className="px-4 py-3 text-left font-semibold">Peserta</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-blue-600">TWK</th>
              <th className="px-4 py-3 text-right font-semibold text-purple-600">TIU</th>
              <th className="px-4 py-3 text-right font-semibold text-orange-500">TKP</th>
              {isSkd && <th className="px-4 py-3 text-center font-semibold">Status</th>}
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5 inline" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row, i) => {
              const rank = i + 1;
              const isMe = row.user_id === myUserId;
              const rowPassed = isSkd
                ? isSKDPassed({ twk: row.twk_score, tiu: row.tiu_score, tkp: row.tkp_score })
                : true;
              return (
                <tr
                  key={`${row.user_id}-${i}`}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    isMe ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                  )}
                >
                  <td className="px-4 py-3">
                    {rank <= 3
                      ? <Medal className={cn("h-4 w-4", medalColor(rank))} />
                      : <span className="text-muted-foreground">{rank}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.username}
                    {isMe && <span className="ml-2 text-xs text-primary">(Anda)</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{row.total_score}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{row.twk_score}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{row.tiu_score}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{row.tkp_score}</td>
                  {isSkd && (
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-semibold",
                        rowPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {rowPassed ? "LULUS" : "TDK LULUS"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {Math.floor(row.time_spent / 60)}m
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [examRankings, setExamRankings] = useState<RankRow[]>([]);
  const [catRankings, setCatRankings] = useState<RankRow[]>([]);
  const [subCatRankings, setSubCatRankings] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const confettiFired = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("exam_results")
          .select("*")
          .eq("exam_id", examId!)
          .eq("user_id", user?.id || "")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          toast.error("Hasil ujian tidak ditemukan");
          navigate("/paket-saya");
          return;
        }

        const { data: exam } = await supabase
          .from("exams")
          .select("title, passing_score, price, category, subcategory")
          .eq("id", examId!)
          .maybeSingle();

        // Always load questions (needed for correct/wrong count + pembahasan)
        const { data: questionsData } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
        if (questionsData) setQuestions(questionsData);

        const savedAnswers = localStorage.getItem(`exam-answers-${examId}`);
        if (savedAnswers) {
          try { setUserAnswers(JSON.parse(savedAnswers)); } catch { /* skip */ }
        }

        const examResult: ExamResult = {
          exam_id: data.exam_id,
          exam_title: exam?.title || "Ujian",
          total_score: data.total_score || 0,
          twk_score: data.twk_score || 0,
          tiu_score: data.tiu_score || 0,
          tkp_score: data.tkp_score || 0,
          time_spent: data.time_spent || 0,
          answered_count: data.answered_count || 0,
          unanswered_count: data.unanswered_count || 0,
          total_questions: data.total_questions || 0,
          passing_score: exam?.passing_score || 0,
          price: exam?.price ?? 0,
          category: (exam as any)?.category ?? null,
          subcategory: (exam as any)?.subcategory ?? null,
        };
        setResult(examResult);

        // ── Exam-level ranking ──────────────────────────────────────────────
        const { data: examResultsRaw } = await supabase
          .from("exam_results")
          .select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent")
          .eq("exam_id", examId!)
          .order("total_score", { ascending: false });

        // Collect all user IDs across all scopes
        const allUserIds = new Set<string>((examResultsRaw ?? []).map((r: any) => r.user_id));

        // ── Category-level ranking ──────────────────────────────────────────
        let catResultsRaw: any[] = [];
        if (examResult.category) {
          const { data: catExams } = await (supabase as any)
            .from("exams")
            .select("id")
            .eq("category", examResult.category)
            .is("parent_exam_id", null);
          const catIds = (catExams ?? []).map((e: any) => e.id);
          if (catIds.length > 0) {
            const { data: catRaw } = await supabase
              .from("exam_results")
              .select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent")
              .in("exam_id", catIds)
              .order("total_score", { ascending: false });
            catResultsRaw = catRaw ?? [];
            (catResultsRaw).forEach((r: any) => allUserIds.add(r.user_id));
          }
        }

        // ── Subcategory-level ranking ───────────────────────────────────────
        let subCatResultsRaw: any[] = [];
        if (examResult.subcategory) {
          const { data: subExams } = await (supabase as any)
            .from("exams")
            .select("id")
            .eq("subcategory", examResult.subcategory)
            .is("parent_exam_id", null);
          const subIds = (subExams ?? []).map((e: any) => e.id);
          if (subIds.length > 0) {
            const { data: subRaw } = await supabase
              .from("exam_results")
              .select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent")
              .in("exam_id", subIds)
              .order("total_score", { ascending: false });
            subCatResultsRaw = subRaw ?? [];
            (subCatResultsRaw).forEach((r: any) => allUserIds.add(r.user_id));
          }
        }

        // ── Fetch all profiles at once ──────────────────────────────────────
        const userIdsArr = [...allUserIds];
        const profileMap: Record<string, string> = {};
        if (userIdsArr.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", userIdsArr);
          (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.username || "Anonim"; });
        }

        setExamRankings(buildRanking(examResultsRaw ?? [], profileMap));
        setCatRankings(buildRanking(catResultsRaw, profileMap));
        setSubCatRankings(buildRanking(subCatResultsRaw, profileMap));
      } catch (err) {
        console.error(err);
        toast.error("Terjadi kesalahan");
        navigate("/paket-saya");
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, navigate, user?.id]);

  // Confetti — fire once when passed
  useEffect(() => {
    if (!result || confettiFired.current) return;
    const isSkd = isSKDExam(result.subcategory);
    const passed = isSkd
      ? isSKDPassed({ twk: result.twk_score, tiu: result.tiu_score, tkp: result.tkp_score })
      : result.total_score >= (result.passing_score || 0);
    if (!passed) return;
    confettiFired.current = true;
    const fire = (opts: confetti.Options) => confetti({ ...opts, disableForReducedMotion: true });
    fire({ particleCount: 80, spread: 70, origin: { y: 0.55 }, colors: ["#22c55e", "#fbbf24", "#3b82f6", "#a855f7", "#f97316"] });
    setTimeout(() => fire({ particleCount: 50, spread: 100, origin: { x: 0.1, y: 0.5 } }), 350);
    setTimeout(() => fire({ particleCount: 50, spread: 100, origin: { x: 0.9, y: 0.5 } }), 500);
  }, [result]);

  if (loading || !result) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div>Memuat hasil ujian...</div>
        </div>
      </AppLayout>
    );
  }

  const isFree = result.price === 0;
  const isSkd = isSKDExam(result.subcategory);
  const skdSubtestStatus = getSKDSubtestStatus({ twk: result.twk_score, tiu: result.tiu_score, tkp: result.tkp_score });
  const isPassed = isSkd
    ? isSKDPassed({ twk: result.twk_score, tiu: result.tiu_score, tkp: result.tkp_score })
    : result.total_score >= (result.passing_score || 0);

  // Correct / wrong counts (from localStorage answers + questions)
  const correctCount = useMemo(
    () => questions.filter((q) => q.correct_answer && userAnswers[q.id] === q.correct_answer).length,
    [questions, userAnswers]
  );
  const wrongCount = useMemo(
    () => questions.filter((q) => q.correct_answer && userAnswers[q.id] && userAnswers[q.id] !== q.correct_answer).length,
    [questions, userAnswers]
  );

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} jam ${m} menit ${s} detik`;
    return `${m} menit ${s} detik`;
  };

  const catLabel = result.category?.toUpperCase() ?? "Kategori";
  const subCatLabel = result.subcategory ?? "Sub-Kategori";

  const UpgradeCTA = () => (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-7 w-7 text-amber-600" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Pembahasan dikunci untuk paket gratis</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upgrade ke paket berbayar untuk melihat jawaban benar dan penjelasan lengkap setiap soal.
        </p>
      </div>
      <Button asChild className="gap-2 rounded-full">
        <Link to="/beli-paket"><ShoppingBag className="h-4 w-4" /> Lihat Paket Berbayar</Link>
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{result.exam_title}</h1>
          <p className="mt-1 text-muted-foreground">Hasil Ujian</p>
        </div>

        <Tabs defaultValue="hasil">
          <TabsList className="mb-6">
            <TabsTrigger value="hasil">Hasil</TabsTrigger>
            <TabsTrigger value="pembahasan" className="gap-1.5">
              {isFree && <Lock className="h-3.5 w-3.5" />}
              Pembahasan
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB HASIL ─── */}
          <TabsContent value="hasil" className="space-y-6">

            {/* Pass / Fail hero */}
            {isPassed ? (
              <PassCertificate
                examTitle={result.exam_title}
                totalScore={result.total_score}
                twkScore={result.twk_score}
                tiuScore={result.tiu_score}
                tkpScore={result.tkp_score}
                isSkd={isSkd}
              />
            ) : (
              <FailBadge
                totalScore={result.total_score}
                isSkd={isSkd}
                skdSubtestStatus={skdSubtestStatus}
                twkScore={result.twk_score}
                tiuScore={result.tiu_score}
                tkpScore={result.tkp_score}
              />
            )}

            {/* Score Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary">{result.total_score}</div>
                  <p className="mt-2 text-sm text-muted-foreground">Total Skor</p>
                  <span className={cn(
                    "mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold",
                    isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {isPassed ? "LULUS" : "TIDAK LULUS"}
                  </span>
                </CardContent>
              </Card>
              <Card className={isSkd ? (skdSubtestStatus.twk ? "ring-1 ring-green-400" : "ring-1 ring-red-400") : ""}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{result.twk_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TWK</p>
                  <p className="text-xs text-muted-foreground">Tes Wawasan Kebangsaan</p>
                  {isSkd && (
                    <span className={cn("mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold", skdSubtestStatus.twk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      min {SKD_PASSING.twk} — {skdSubtestStatus.twk ? "Lulus" : "Tidak Lulus"}
                    </span>
                  )}
                </CardContent>
              </Card>
              <Card className={isSkd ? (skdSubtestStatus.tiu ? "ring-1 ring-green-400" : "ring-1 ring-red-400") : ""}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">{result.tiu_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TIU</p>
                  <p className="text-xs text-muted-foreground">Tes Intelegensia Umum</p>
                  {isSkd && (
                    <span className={cn("mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold", skdSubtestStatus.tiu ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      min {SKD_PASSING.tiu} — {skdSubtestStatus.tiu ? "Lulus" : "Tidak Lulus"}
                    </span>
                  )}
                </CardContent>
              </Card>
              <Card className={isSkd ? (skdSubtestStatus.tkp ? "ring-1 ring-green-400" : "ring-1 ring-red-400") : ""}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{result.tkp_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TKP</p>
                  <p className="text-xs text-muted-foreground">Tes Karakteristik Pribadi</p>
                  {isSkd && (
                    <span className={cn("mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold", skdSubtestStatus.tkp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      min {SKD_PASSING.tkp} — {skdSubtestStatus.tkp ? "Lulus" : "Tidak Lulus"}
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Data Tryout */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Data Tryout
                </h2>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selesai dalam</p>
                    <p className="mt-0.5 text-lg font-semibold">{formatTime(result.time_spent)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jawaban Benar</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {correctCount} <span className="text-sm font-normal text-muted-foreground">soal</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jawaban Salah</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {wrongCount} <span className="text-sm font-normal text-muted-foreground">soal</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tidak Dijawab</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {result.unanswered_count} <span className="text-sm font-normal text-muted-foreground">dari {result.total_questions}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Target className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Terjawab</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {result.answered_count} <span className="text-sm font-normal text-muted-foreground">dari {result.total_questions}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ranking — 3 scopes */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" /> Rangking Peserta
                </h2>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="exam">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="exam" className="gap-1.5">
                      <Award className="h-3.5 w-3.5" /> Ujian Ini
                    </TabsTrigger>
                    {result.subcategory && (
                      <TabsTrigger value="subcat" className="gap-1.5">
                        <Medal className="h-3.5 w-3.5" /> {subCatLabel}
                      </TabsTrigger>
                    )}
                    {result.category && (
                      <TabsTrigger value="cat" className="gap-1.5">
                        <Trophy className="h-3.5 w-3.5" /> {catLabel}
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="exam">
                    <RankingTable rankings={examRankings} myUserId={user?.id} isSkd={isSkd} label="ujian ini" />
                  </TabsContent>
                  {result.subcategory && (
                    <TabsContent value="subcat">
                      <RankingTable rankings={subCatRankings} myUserId={user?.id} isSkd={isSkd} label={subCatLabel} />
                    </TabsContent>
                  )}
                  {result.category && (
                    <TabsContent value="cat">
                      <RankingTable rankings={catRankings} myUserId={user?.id} isSkd={isSkd} label={catLabel} />
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pb-8">
              <Button size="lg" onClick={() => navigate("/paket-saya")} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Kerjakan Ulang
              </Button>
              {isFree && (
                <Button size="lg" variant="outline" asChild className="gap-2">
                  <Link to="/beli-paket">
                    <ShoppingBag className="h-4 w-4" /> Beli Paket Berbayar
                  </Link>
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ─── TAB PEMBAHASAN ─── */}
          <TabsContent value="pembahasan">
            {isFree ? (
              <div className="py-4 pb-8"><UpgradeCTA /></div>
            ) : (
              <div className="space-y-3 pb-8">
                {questions.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center">Tidak ada soal untuk ditampilkan.</p>
                )}
                {questions.map((question, idx) => {
                  const isExpanded = expandedQuestions.has(question.id);
                  const userAnswer = userAnswers[question.id];
                  return (
                    <Card key={question.id} className="overflow-hidden">
                      <button
                        onClick={() => {
                          const s = new Set(expandedQuestions);
                          isExpanded ? s.delete(question.id) : s.add(question.id);
                          setExpandedQuestions(s);
                        }}
                        className="w-full px-6 py-4 flex items-start justify-between hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">Soal {idx + 1}</p>
                            {userAnswer
                              ? userAnswer === question.correct_answer
                                ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Benar</span>
                                : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Salah</span>
                              : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Tidak dijawab</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {question.question_text.substring(0, 100)}{question.question_text.length > 100 ? "..." : ""}
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
                          : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-muted/20">
                          <div className="px-6 py-4 space-y-3 border-b">
                            {question.svg_content && (
                              <div className="overflow-x-auto rounded-lg border bg-white p-2"
                                dangerouslySetInnerHTML={{ __html: question.svg_content }} />
                            )}
                            {question.image_url && !question.svg_content && (
                              <img src={question.image_url} alt="Gambar soal" className="max-h-48 rounded border object-contain w-full" />
                            )}
                            <p className="text-sm leading-relaxed">{question.question_text}</p>
                          </div>
                          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x border-b">
                            <div className="px-6 py-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jawaban Anda</p>
                              {userAnswer ? (
                                <div className={cn(
                                  "flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                                  userAnswer === question.correct_answer
                                    ? "bg-green-100 text-green-800 border border-green-300"
                                    : "bg-red-100 text-red-800 border border-red-300"
                                )}>
                                  {userAnswer === question.correct_answer
                                    ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                    : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                  <span>{userAnswer}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-300 text-sm text-yellow-800">
                                  <AlertCircle className="h-4 w-4 shrink-0" />
                                  <span>Tidak dijawab</span>
                                </div>
                              )}
                            </div>
                            <div className="px-6 py-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jawaban Benar</p>
                              <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-green-100 border border-green-300 text-sm font-medium text-green-800">
                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{question.correct_answer}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-6 py-4 border-b">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Semua Pilihan</p>
                            <div className="space-y-2">
                              {question.options.map((option, oi) => {
                                const isUserAnswer = userAnswer === option;
                                const isCorrect = option === question.correct_answer;
                                const label = String.fromCharCode(65 + oi);
                                return (
                                  <div key={option} className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border text-sm",
                                    isCorrect ? "border-green-400 bg-green-50"
                                      : isUserAnswer ? "border-red-400 bg-red-50"
                                      : "border-border bg-background"
                                  )}>
                                    <div className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold mt-0.5",
                                      isCorrect ? "bg-green-500 border-green-500 text-white"
                                        : isUserAnswer ? "bg-red-500 border-red-500 text-white"
                                        : "border-muted-foreground/30 text-muted-foreground"
                                    )}>
                                      {label}
                                    </div>
                                    <span className="flex-1">{option}</span>
                                    {isCorrect && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full shrink-0">Benar</span>}
                                    {isUserAnswer && !isCorrect && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">Jawaban Anda</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {question.explanation ? (
                            <div className="px-6 py-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pembahasan / Alasan</p>
                              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                                <p className="text-sm text-blue-900 leading-relaxed">{question.explanation}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="px-6 py-4">
                              <p className="text-xs text-muted-foreground italic">Tidak ada pembahasan untuk soal ini.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ExamResults;
