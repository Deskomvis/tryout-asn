import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp,
  Trophy, Medal, Clock, BookOpen, Lock, ShoppingBag,
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

const ExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [rankings, setRankings] = useState<RankRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
          .select("title, passing_score, price, subcategory")
          .eq("id", examId!)
          .maybeSingle();

        const isFree = (exam?.price ?? 0) === 0;

        // Only load questions for paid exams
        if (!isFree) {
          const { data: questionsData } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
          if (questionsData) setQuestions(questionsData);
        }

        const savedAnswers = localStorage.getItem(`exam-answers-${examId}`);
        if (savedAnswers) {
          try { setUserAnswers(JSON.parse(savedAnswers)); } catch { /* skip */ }
        }

        setResult({
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
          subcategory: (exam as any)?.subcategory ?? null,
        });

        // Only fetch leaderboard for paid exams
        if (!isFree) {
          const { data: allResults } = await supabase
            .from("exam_results")
            .select("user_id, total_score, twk_score, tiu_score, tkp_score, time_spent")
            .eq("exam_id", examId!)
            .order("total_score", { ascending: false });

          if (allResults && allResults.length > 0) {
            const userIds = [...new Set(allResults.map((r: any) => r.user_id))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, username")
              .in("id", userIds);

            const profileMap: Record<string, string> = {};
            (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.username || "Anonim"; });

            const bestPerUser: Record<string, any> = {};
            for (const r of allResults as any[]) {
              if (!bestPerUser[r.user_id] || r.total_score > bestPerUser[r.user_id].total_score) {
                bestPerUser[r.user_id] = r;
              }
            }

            const ranked: RankRow[] = Object.values(bestPerUser)
              .sort((a: any, b: any) => b.total_score - a.total_score || a.time_spent - b.time_spent)
              .map((r: any) => ({
                user_id: r.user_id,
                username: profileMap[r.user_id] || "Anonim",
                total_score: r.total_score || 0,
                twk_score: r.twk_score || 0,
                tiu_score: r.tiu_score || 0,
                tkp_score: r.tkp_score || 0,
                time_spent: r.time_spent || 0,
              }));

            setRankings(ranked);
            const idx = ranked.findIndex((r) => r.user_id === user?.id);
            setMyRank(idx >= 0 ? idx + 1 : null);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Terjadi kesalahan");
        navigate("/paket-saya");
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, navigate, user?.id]);

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} jam ${m} menit ${s} detik`;
    return `${m} menit ${s} detik`;
  };

  const medalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  // CTA card for free exam upgrade prompt
  const UpgradeCTA = ({ context }: { context: "ranking" | "pembahasan" }) => (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-7 w-7 text-amber-600" />
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {context === "ranking" ? "Rangking tidak tersedia untuk paket gratis" : "Pembahasan dikunci untuk paket gratis"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {context === "ranking"
            ? "Upgrade ke paket berbayar untuk melihat posisi kamu di antara peserta lain."
            : "Upgrade ke paket berbayar untuk melihat jawaban benar dan penjelasan lengkap setiap soal."}
        </p>
      </div>
      <Button asChild className="gap-2 rounded-full">
        <Link to="/beli-paket">
          <ShoppingBag className="h-4 w-4" /> Lihat Paket Berbayar
        </Link>
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

        {/* Free exam info banner */}
        {isFree && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-semibold">Paket Gratis — </span>
              Skor ujian ini tidak masuk leaderboard dan pembahasan soal dikunci.
              Beli paket berbayar untuk akses <strong>rangking peserta</strong> dan <strong>pembahasan lengkap</strong>.
            </AlertDescription>
          </Alert>
        )}

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
            {/* Pass/Fail Alert */}
            <Alert
              className={`border-2 ${isPassed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
            >
              {isPassed
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-red-600" />}
              <AlertDescription className={isPassed ? "text-green-800" : "text-red-800"}>
                <span className="font-semibold">
                  {isPassed ? `Selamat! Anda Lulus dengan skor ${result.total_score}` : `Maaf, Anda Tidak Lulus. Skor: ${result.total_score}`}
                </span>
                {isSkd && !isPassed && (
                  <div className="mt-1 text-sm space-y-0.5">
                    {!skdSubtestStatus.twk && <div>• TWK: {result.twk_score} (minimal {SKD_PASSING.twk})</div>}
                    {!skdSubtestStatus.tiu && <div>• TIU: {result.tiu_score} (minimal {SKD_PASSING.tiu})</div>}
                    {!skdSubtestStatus.tkp && <div>• TKP: {result.tkp_score} (minimal {SKD_PASSING.tkp})</div>}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Score Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary">{result.total_score}</div>
                  <p className="mt-2 text-sm text-muted-foreground">Total Skor</p>
                  {isSkd && (
                    <span className={cn("mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold", isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {isPassed ? "LULUS" : "TIDAK LULUS"}
                    </span>
                  )}
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
              <CardContent className="grid gap-6 sm:grid-cols-3">
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
                    <p className="text-sm text-muted-foreground">Soal Terjawab</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {result.answered_count} <span className="text-sm font-normal text-muted-foreground">dari {result.total_questions} soal</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Soal Tidak Terjawab</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {result.unanswered_count} <span className="text-sm font-normal text-muted-foreground">dari {result.total_questions} soal</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ranking — locked for free */}
            {isFree ? (
              <UpgradeCTA context="ranking" />
            ) : rankings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" /> Rangking Peserta
                    </h2>
                    {myRank !== null && (
                      <span className="text-sm font-medium text-primary">Posisi Anda: #{myRank}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
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
                          const isMe = row.user_id === user?.id;
                          const rowPassed = isSkd ? isSKDPassed({ twk: row.twk_score, tiu: row.tiu_score, tkp: row.tkp_score }) : true;
                          return (
                            <tr
                              key={row.user_id}
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
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", rowPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
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
                </CardContent>
              </Card>
            )}

            {/* Action */}
            <div className="flex gap-3 pb-8">
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
              <div className="py-4 pb-8">
                <UpgradeCTA context="pembahasan" />
              </div>
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
                            {question.question_text.substring(0, 100)}
                            {question.question_text.length > 100 ? "..." : ""}
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
                          : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-muted/20">
                          {/* Full question */}
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

                          {/* Jawaban ringkasan */}
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

                          {/* Semua pilihan */}
                          <div className="px-6 py-4 border-b">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Semua Pilihan</p>
                            <div className="space-y-2">
                              {question.options.map((option, idx) => {
                                const isUserAnswer = userAnswer === option;
                                const isCorrect = option === question.correct_answer;
                                const label = String.fromCharCode(65 + idx);
                                return (
                                  <div
                                    key={option}
                                    className={cn(
                                      "flex items-start gap-3 p-3 rounded-lg border text-sm",
                                      isCorrect
                                        ? "border-green-400 bg-green-50"
                                        : isUserAnswer
                                        ? "border-red-400 bg-red-50"
                                        : "border-border bg-background"
                                    )}
                                  >
                                    <div className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors mt-0.5",
                                      isCorrect ? "bg-green-500 border-green-500 text-white" : isUserAnswer ? "bg-red-500 border-red-500 text-white" : "border-muted-foreground/30 text-muted-foreground"
                                    )}>
                                      {label}
                                    </div>
                                    <span className="flex-1">{option}</span>
                                    {isCorrect && (
                                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full shrink-0">Benar</span>
                                    )}
                                    {isUserAnswer && !isCorrect && (
                                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">Jawaban Anda</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Pembahasan */}
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
