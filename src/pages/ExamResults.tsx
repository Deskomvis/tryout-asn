import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock, BookOpen, Lock, ShoppingBag, Medal, Trophy, Award,
  ChevronRight, BookMarked, BarChart2, RotateCcw,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSKDExam, isSKDPassed, getSKDSubtestStatus, SKD_PASSING } from "@/lib/skdScoring";

// ── Types ────────────────────────────────────────────────────────────────────

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
  correct_answer?: string | null;
  option_points?: Record<string, number> | null;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildRanking = (allResults: any[], profileMap: Record<string, string>): RankRow[] =>
  Object.values(
    allResults.reduce((acc: Record<string, any>, r) => {
      if (!acc[r.user_id] || r.total_score > acc[r.user_id].total_score) acc[r.user_id] = r;
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

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} Jam ${m} Menit ${s} Detik`;
  return `${m} Menit ${s} Detik`;
};

// ── RankingTable ──────────────────────────────────────────────────────────────

const RankingTable = ({
  rankings, myUserId, isSkd, label,
}: {
  rankings: RankRow[]; myUserId?: string; isSkd: boolean; label: string;
}) => {
  const myRank = rankings.findIndex((r) => r.user_id === myUserId);
  if (rankings.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data rangking {label}.</p>;
  const medalColor = (rank: number) =>
    rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-600" : "text-muted-foreground";
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
                <tr key={`${row.user_id}-${i}`} className={cn("border-b last:border-0 transition-colors", isMe ? "bg-primary/5 font-semibold" : "hover:bg-muted/30")}>
                  <td className="px-4 py-3">
                    {rank <= 3 ? <Medal className={cn("h-4 w-4", medalColor(rank))} /> : <span className="text-muted-foreground">{rank}</span>}
                  </td>
                  <td className="px-4 py-3">{row.username}{isMe && <span className="ml-2 text-xs text-primary">(Anda)</span>}</td>
                  <td className="px-4 py-3 text-right font-bold">{row.total_score}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{row.twk_score}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{row.tiu_score}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{row.tkp_score}</td>
                  {isSkd && (
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", rowPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {rowPassed ? "LULUS" : "TDK LULUS"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">{Math.floor(row.time_spent / 60)}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── TKP Bar Chart ─────────────────────────────────────────────────────────────

const BAR_COLORS = ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];

const TKPBarChart = ({ questions, userAnswers }: { questions: Question[]; userAnswers: Record<string, string> }) => {
  const data = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    questions.filter((q) => q.subtest === "tkp").forEach((q) => {
      const ans = userAnswers[q.id];
      if (ans && q.option_points) {
        const pts = Math.round(q.option_points[ans] ?? 0);
        if (pts >= 1 && pts <= 5) counts[pts]++;
      }
    });
    return [1, 2, 3, 4, 5].map((pt) => ({ poin: String(pt), jumlah: counts[pt] }));
  }, [questions, userAnswers]);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-semibold text-sm text-foreground">Jumlah Jawaban Setiap Skor Tes Karakteristik Pribadi</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-5">Sistem Penilaian: Skala Poin (1–5)</p>
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="poin" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(val) => [`${val} soal`, "Jumlah"]}
                  labelFormatter={(l) => `Poin ${l}`}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="jumlah" radius={[5, 5, 0, 0]}>
                  {data.map((_, idx) => <Cell key={idx} fill={BAR_COLORS[idx]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 shrink-0 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Keterangan</p>
            {data.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BAR_COLORS[idx] }} />
                <span>{d.poin} = {d.jumlah} Soal</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Subtest Donut Chart ───────────────────────────────────────────────────────

const CUSTOM_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (!value) return null;
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>{value}</text>;
};

const SubtestDonutChart = ({
  title, subtitle, benar, salah,
}: {
  title: string; subtitle: string; benar: number; salah: number;
}) => {
  const data = [
    { name: "Salah", value: salah, color: "#ef4444" },
    { name: "Benar", value: benar, color: "#22c55e" },
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">{subtitle}</p>
        <div className="flex items-center gap-6">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                  dataKey="value" stroke="none" labelLine={false} label={CUSTOM_LABEL}>
                  {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} Soal`, name]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-5 text-xs mt-1">
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400 shrink-0" /><span className="text-muted-foreground">Salah (0 Poin)</span></div>
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-400 shrink-0" /><span className="text-muted-foreground">Benar (5 Poin)</span></div>
            </div>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Keterangan</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full bg-red-400 shrink-0" />
              <span>Salah = <strong>{salah}</strong> Soal</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full bg-green-400 shrink-0" />
              <span>Benar = <strong>{benar}</strong> Soal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Score Card ────────────────────────────────────────────────────────────────

const ScoreCard = ({ label, value, bg, valueColor }: {
  label: string; value: number; bg: string; valueColor: string;
}) => (
  <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl p-5 text-center min-h-[96px]", bg)}>
    <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
    <p className={cn("text-4xl font-extrabold leading-none", valueColor)}>{value}</p>
  </div>
);

// ── Data Tryout Stat ──────────────────────────────────────────────────────────

const TryoutStat = ({ icon: Icon, label, value, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: string; iconBg: string; iconColor: string;
}) => (
  <div className="flex items-center gap-3.5">
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconBg)}>
      <Icon className={cn("h-4.5 w-4.5", iconColor)} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground leading-tight mt-0.5">{value}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState("hasil");
  const confettiFired = useRef(false);

  // ── Computed counts (must be before early return) ──────────────────────────
  const correctCount = useMemo(
    () => questions.filter((q) => q.subtest !== "tkp" && q.correct_answer && userAnswers[q.id] === q.correct_answer).length,
    [questions, userAnswers]
  );
  const wrongCount = useMemo(
    () => questions.filter((q) => q.subtest !== "tkp" && q.correct_answer && userAnswers[q.id] && userAnswers[q.id] !== q.correct_answer).length,
    [questions, userAnswers]
  );

  // ── Per-subtest chart data ─────────────────────────────────────────────────
  const tiuStats = useMemo(() => {
    const qs = questions.filter((q) => q.subtest === "tiu");
    const benar = qs.filter((q) => q.correct_answer && userAnswers[q.id] === q.correct_answer).length;
    const salah = qs.filter((q) => q.correct_answer && userAnswers[q.id] && userAnswers[q.id] !== q.correct_answer).length;
    return { benar, salah };
  }, [questions, userAnswers]);

  const twkStats = useMemo(() => {
    const qs = questions.filter((q) => q.subtest === "twk");
    const benar = qs.filter((q) => q.correct_answer && userAnswers[q.id] === q.correct_answer).length;
    const salah = qs.filter((q) => q.correct_answer && userAnswers[q.id] && userAnswers[q.id] !== q.correct_answer).length;
    return { benar, salah };
  }, [questions, userAnswers]);

  // ── Data fetching ─────────────────────────────────────────────────────────
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

        const { data: questionsData } = await (supabase as any).rpc("get_exam_review", { _exam_id: examId! });
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

        // Rankings
        const { data: examResultsRaw } = await supabase
          .from("exam_results")
          .select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent")
          .eq("exam_id", examId!)
          .order("total_score", { ascending: false });

        const allUserIds = new Set<string>((examResultsRaw ?? []).map((r: any) => r.user_id));

        let catResultsRaw: any[] = [];
        if (examResult.category) {
          const { data: catExams } = await (supabase as any).from("exams").select("id").eq("category", examResult.category).is("parent_exam_id", null);
          const catIds = (catExams ?? []).map((e: any) => e.id);
          if (catIds.length > 0) {
            const { data: catRaw } = await supabase.from("exam_results").select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent").in("exam_id", catIds).order("total_score", { ascending: false });
            catResultsRaw = catRaw ?? [];
            catResultsRaw.forEach((r: any) => allUserIds.add(r.user_id));
          }
        }

        let subCatResultsRaw: any[] = [];
        if (examResult.subcategory) {
          const { data: subExams } = await (supabase as any).from("exams").select("id").eq("subcategory", examResult.subcategory).is("parent_exam_id", null);
          const subIds = (subExams ?? []).map((e: any) => e.id);
          if (subIds.length > 0) {
            const { data: subRaw } = await supabase.from("exam_results").select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent").in("exam_id", subIds).order("total_score", { ascending: false });
            subCatResultsRaw = subRaw ?? [];
            subCatResultsRaw.forEach((r: any) => allUserIds.add(r.user_id));
          }
        }

        const userIdsArr = [...allUserIds];
        const profileMap: Record<string, string> = {};
        if (userIdsArr.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIdsArr);
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

  // Confetti on pass
  useEffect(() => {
    if (!result || confettiFired.current) return;
    const isSkd = isSKDExam(result.subcategory);
    const passed = isSkd
      ? isSKDPassed({ twk: result.twk_score, tiu: result.tiu_score, tkp: result.tkp_score })
      : result.total_score >= (result.passing_score || 0);
    if (!passed) return;
    confettiFired.current = true;
    const fire = (opts: confetti.Options) => confetti({ ...opts, disableForReducedMotion: true });
    fire({ particleCount: 90, spread: 70, origin: { y: 0.5 }, colors: ["#22c55e", "#fbbf24", "#3b82f6", "#a855f7"] });
    setTimeout(() => fire({ particleCount: 50, spread: 110, origin: { x: 0.1, y: 0.45 } }), 350);
    setTimeout(() => fire({ particleCount: 50, spread: 110, origin: { x: 0.9, y: 0.45 } }), 500);
  }, [result]);

  if (loading || !result) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Memuat hasil ujian…
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

  const catLabel = result.category?.toUpperCase() ?? "Kategori";
  const subCatLabel = result.subcategory ?? "Sub-Kategori";

  // ── UpgradeCTA ──────────────────────────────────────────────────────────────
  const UpgradeCTA = () => (
    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-7 w-7 text-amber-600" />
      </div>
      <div>
        <p className="font-semibold">Pembahasan dikunci untuk paket gratis</p>
        <p className="mt-1 text-sm text-muted-foreground">Upgrade ke paket berbayar untuk melihat jawaban benar dan penjelasan lengkap.</p>
      </div>
      <Button asChild className="gap-2 rounded-full">
        <Link to="/beli-paket"><ShoppingBag className="h-4 w-4" /> Lihat Paket Berbayar</Link>
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Skor Hasil Perolehan</h1>
          <Badge variant="outline" className="text-xs">{result.exam_title}</Badge>
        </div>

        {/* ── Pass / Fail Banner ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "w-full rounded-xl py-4 text-center text-base font-bold tracking-wide text-white shadow-sm",
            isPassed ? "bg-green-500" : "bg-red-500"
          )}
        >
          {isPassed ? "🎉 Selamat, Anda Lulus!" : "Maaf, Anda Tidak Lulus"}
        </motion.div>

        {/* ── Score Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <ScoreCard label="Total Skor" value={result.total_score} bg="bg-orange-50 border border-orange-100" valueColor={isPassed ? "text-green-600" : "text-red-600"} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <ScoreCard label="Tes Wawasan Kebangsaan"
              value={result.twk_score}
              bg={isSkd ? (skdSubtestStatus.twk ? "bg-blue-50 border border-blue-100" : "bg-blue-50 border border-red-200") : "bg-blue-50 border border-blue-100"}
              valueColor={isSkd ? (skdSubtestStatus.twk ? "text-blue-700" : "text-red-500") : "text-blue-700"}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ScoreCard label="Tes Intelegensia Umum"
              value={result.tiu_score}
              bg={isSkd ? (skdSubtestStatus.tiu ? "bg-purple-50 border border-purple-100" : "bg-purple-50 border border-red-200") : "bg-purple-50 border border-purple-100"}
              valueColor={isSkd ? (skdSubtestStatus.tiu ? "text-purple-700" : "text-red-500") : "text-purple-700"}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <ScoreCard label="Tes Karakteristik Pribadi"
              value={result.tkp_score}
              bg={isSkd ? (skdSubtestStatus.tkp ? "bg-indigo-50 border border-indigo-100" : "bg-indigo-50 border border-red-200") : "bg-indigo-50 border border-indigo-100"}
              valueColor={isSkd ? (skdSubtestStatus.tkp ? "text-indigo-700" : "text-red-500") : "text-indigo-700"}
            />
          </motion.div>
        </div>

        {/* ── SKD sub-test passing info ─────────────────────────────────────── */}
        {isSkd && (
          <div className="flex flex-wrap gap-2">
            {(["twk", "tiu", "tkp"] as const).map((key) => (
              <span key={key} className={cn(
                "text-xs font-semibold px-3 py-1 rounded-full border",
                skdSubtestStatus[key] ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-200"
              )}>
                {key.toUpperCase()} {skdSubtestStatus[key] ? "✓ Lulus" : `✗ min ${SKD_PASSING[key]}`}
              </span>
            ))}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => navigate("/paket-saya")}
            className="gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
          >
            <RotateCcw className="h-4 w-4" /> Kerjakan Ulang
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => setActiveTab("pembahasan")}>
            <BookMarked className="h-4 w-4" /> Pembahasan
          </Button>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => setActiveTab("rangking")}>
            <BarChart2 className="h-4 w-4" /> Rangking
          </Button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="hasil" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Hasil</TabsTrigger>
            <TabsTrigger value="rangking" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Rangking</TabsTrigger>
            <TabsTrigger value="pembahasan" className="gap-1.5">
              {isFree && <Lock className="h-3.5 w-3.5" />}
              <BookMarked className="h-3.5 w-3.5" />Pembahasan
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB: HASIL ──────────────────────────────────────────────────── */}
          <TabsContent value="hasil" className="mt-5 space-y-5 pb-10">

            {/* Data Tryout */}
            <Card>
              <CardContent className="px-6 py-5">
                <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-muted-foreground">Data Tryout</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <TryoutStat icon={Clock} label="Waktu Pengerjaan" value={formatTime(result.time_spent)} iconBg="bg-blue-100" iconColor="text-blue-600" />
                  <TryoutStat icon={BookOpen} label="Soal Terjawab" value={`${result.answered_count} Soal`} iconBg="bg-green-100" iconColor="text-green-600" />
                  <TryoutStat icon={XCircle} label="Soal Tidak Terjawab" value={`${result.unanswered_count} Soal`} iconBg="bg-yellow-100" iconColor="text-yellow-600" />
                  <TryoutStat icon={CheckCircle2} label="Jawaban Benar (TWK+TIU)" value={`${correctCount} Soal`} iconBg="bg-violet-100" iconColor="text-violet-600" />
                </div>
              </CardContent>
            </Card>

            {/* Charts — TKP full-width, then TIU+TWK side by side */}
            {isSkd && questions.length > 0 && (
              <div className="space-y-4">
                <TKPBarChart questions={questions} userAnswers={userAnswers} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SubtestDonutChart
                    title="Jumlah Jawaban Setiap Skor Tes Intelegensia Umum"
                    subtitle="Sistem Penilaian: Benar/Salah (0 atau 5)"
                    benar={tiuStats.benar}
                    salah={tiuStats.salah}
                  />
                  <SubtestDonutChart
                    title="Jumlah Jawaban Setiap Skor Tes Wawasan Kebangsaan"
                    subtitle="Sistem Penilaian: Benar/Salah (0 atau 5)"
                    benar={twkStats.benar}
                    salah={twkStats.salah}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── TAB: RANGKING ───────────────────────────────────────────────── */}
          <TabsContent value="rangking" className="mt-5 pb-10">
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="exam">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="exam" className="gap-1.5"><Award className="h-3.5 w-3.5" />Ujian Ini</TabsTrigger>
                    {result.subcategory && (
                      <TabsTrigger value="subcat" className="gap-1.5"><Medal className="h-3.5 w-3.5" />{subCatLabel}</TabsTrigger>
                    )}
                    {result.category && (
                      <TabsTrigger value="cat" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />{catLabel}</TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="exam"><RankingTable rankings={examRankings} myUserId={user?.id} isSkd={isSkd} label="ujian ini" /></TabsContent>
                  {result.subcategory && <TabsContent value="subcat"><RankingTable rankings={subCatRankings} myUserId={user?.id} isSkd={isSkd} label={subCatLabel} /></TabsContent>}
                  {result.category && <TabsContent value="cat"><RankingTable rankings={catRankings} myUserId={user?.id} isSkd={isSkd} label={catLabel} /></TabsContent>}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: PEMBAHASAN ─────────────────────────────────────────────── */}
          <TabsContent value="pembahasan" className="mt-5 pb-10">
            {isFree ? (
              <div className="py-4"><UpgradeCTA /></div>
            ) : (
              <div className="space-y-3">
                {questions.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada soal untuk ditampilkan.</p>
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
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold">Soal {idx + 1}</p>
                            {question.subtest && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase font-semibold">
                                {question.subtest}
                              </span>
                            )}
                            {question.subtest === "tkp"
                              ? userAnswer
                                ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">+{question.option_points?.[userAnswer] ?? 0} poin</span>
                                : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Tidak dijawab</span>
                              : userAnswer
                                ? userAnswer === question.correct_answer
                                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Benar</span>
                                  : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Salah</span>
                                : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Tidak dijawab</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{question.question_text.substring(0, 100)}{question.question_text.length > 100 ? "…" : ""}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 ml-4" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-muted/20">
                          <div className="px-6 py-4 space-y-3 border-b">
                            {question.svg_content && <div className="overflow-x-auto rounded-lg border bg-white p-2" dangerouslySetInnerHTML={{ __html: question.svg_content }} />}
                            {question.image_url && !question.svg_content && <img src={question.image_url} alt="Gambar soal" className="max-h-48 rounded border object-contain w-full" />}
                            <p className="text-sm leading-relaxed">{question.question_text}</p>
                          </div>

                          {question.subtest === "tkp" ? (
                            <div className="px-6 py-4 border-b">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Pilihan & Nilai TKP</p>
                              <div className="space-y-2">
                                {question.options.map((option, oi) => {
                                  const isUserAnswer = userAnswer === option;
                                  const pts = question.option_points?.[option] ?? 0;
                                  const label = String.fromCharCode(65 + oi);
                                  const ptColor = pts === 5 ? "text-green-700 bg-green-100 border-green-300" : pts === 4 ? "text-blue-700 bg-blue-50 border-blue-200" : pts === 3 ? "text-yellow-700 bg-yellow-50 border-yellow-200" : pts === 2 ? "text-orange-700 bg-orange-50 border-orange-200" : "text-red-700 bg-red-50 border-red-200";
                                  return (
                                    <div key={option} className={cn("flex items-start gap-3 p-3 rounded-lg border text-sm", isUserAnswer ? "ring-2 ring-primary border-primary/40 bg-primary/5" : "border-border bg-background")}>
                                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold mt-0.5", isUserAnswer ? "bg-primary border-primary text-white" : "border-muted-foreground/30 text-muted-foreground")}>{label}</div>
                                      <span className="flex-1">{option}</span>
                                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold border shrink-0", ptColor)}>{pts} poin</span>
                                      {isUserAnswer && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full shrink-0">Pilihan Anda</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              {userAnswer && (
                                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                                  Anda mendapat <strong>{question.option_points?.[userAnswer] ?? 0} poin</strong> dari soal ini.
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x border-b">
                                <div className="px-6 py-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jawaban Anda</p>
                                  {userAnswer ? (
                                    <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium", userAnswer === question.correct_answer ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300")}>
                                      {userAnswer === question.correct_answer ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                      <span>{userAnswer}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-300 text-sm text-yellow-800">
                                      <AlertCircle className="h-4 w-4 shrink-0" /><span>Tidak dijawab</span>
                                    </div>
                                  )}
                                </div>
                                <div className="px-6 py-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jawaban Benar</p>
                                  <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-green-100 border border-green-300 text-sm font-medium text-green-800">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /><span>{question.correct_answer}</span>
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
                                      <div key={option} className={cn("flex items-start gap-3 p-3 rounded-lg border text-sm", isCorrect ? "border-green-400 bg-green-50" : isUserAnswer ? "border-red-400 bg-red-50" : "border-border bg-background")}>
                                        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold mt-0.5", isCorrect ? "bg-green-500 border-green-500 text-white" : isUserAnswer ? "bg-red-500 border-red-500 text-white" : "border-muted-foreground/30 text-muted-foreground")}>{label}</div>
                                        <span className="flex-1">{option}</span>
                                        {isCorrect && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full shrink-0">Benar</span>}
                                        {isUserAnswer && !isCorrect && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">Jawaban Anda</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}

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
