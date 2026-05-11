import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Trophy, Medal, Clock, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
          .select("title, passing_score")
          .eq("id", examId!)
          .maybeSingle();

        const { data: questionsData } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
        if (questionsData) setQuestions(questionsData);

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
        });

        // Fetch leaderboard — all exam_results for this exam
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

          // Keep best score per user
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

  const isPassed = result.total_score >= (result.passing_score || 0);

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
            <TabsTrigger value="pembahasan">Pembahasan</TabsTrigger>
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
              <AlertDescription className={`font-semibold ${isPassed ? "text-green-800" : "text-red-800"}`}>
                {isPassed
                  ? `Selamat! Anda Lulus dengan skor ${result.total_score}`
                  : `Maaf, Anda Tidak Lulus. Skor: ${result.total_score} (Minimal: ${result.passing_score || 0})`}
              </AlertDescription>
            </Alert>

            {/* Score Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary">{result.total_score}</div>
                  <p className="mt-2 text-sm text-muted-foreground">Total Skor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{result.twk_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TWK</p>
                  <p className="text-xs text-muted-foreground">Tes Wawasan Kebangsaan</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">{result.tiu_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TIU</p>
                  <p className="text-xs text-muted-foreground">Tes Intelegensia Umum</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{result.tkp_score}</div>
                  <p className="mt-2 text-xs text-muted-foreground">TKP</p>
                  <p className="text-xs text-muted-foreground">Tes Karakteristik Pribadi</p>
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
                <div>
                  <p className="text-sm text-muted-foreground">Waktu Pengerjaan</p>
                  <p className="mt-1 text-lg font-semibold">{formatTime(result.time_spent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Soal Terjawab</p>
                  <p className="mt-1 text-lg font-semibold">{result.answered_count}/{result.total_questions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Soal Tidak Terjawab</p>
                  <p className="mt-1 text-lg font-semibold">{result.unanswered_count}/{result.total_questions}</p>
                </div>
              </CardContent>
            </Card>

            {/* Ranking */}
            {rankings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" /> Rangking Peserta
                    </h2>
                    {myRank !== null && (
                      <span className="text-sm font-medium text-primary">
                        Posisi Anda: #{myRank}
                      </span>
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
                          <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 inline" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((row, i) => {
                          const rank = i + 1;
                          const isMe = row.user_id === user?.id;
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
              <Button
                size="lg"
                onClick={() => navigate("/paket-saya")}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Kerjakan Ulang
              </Button>
            </div>
          </TabsContent>

          {/* ─── TAB PEMBAHASAN ─── */}
          <TabsContent value="pembahasan">
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
                      <div className="border-t px-6 py-4 space-y-4 bg-muted/30">
                        {question.svg_content && (
                          <div className="overflow-x-auto rounded-lg border bg-white p-2"
                            dangerouslySetInnerHTML={{ __html: question.svg_content }} />
                        )}
                        {question.image_url && !question.svg_content && (
                          <img src={question.image_url} alt="Gambar soal" className="max-h-48 rounded border object-contain w-full" />
                        )}

                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">Pertanyaan:</p>
                          <p className="mt-2">{question.question_text}</p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-muted-foreground mb-2">Pilihan Jawaban:</p>
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <div
                                key={option}
                                className={cn(
                                  "p-3 rounded border text-sm",
                                  userAnswer === option && option === question.correct_answer
                                    ? "border-green-500 bg-green-50"
                                    : userAnswer === option
                                    ? "border-blue-500 bg-blue-50"
                                    : option === question.correct_answer
                                    ? "border-green-500 bg-green-50"
                                    : "border-border"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold">•</span>
                                  <span>{option}</span>
                                  {userAnswer === option && userAnswer !== question.correct_answer && (
                                    <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded whitespace-nowrap">Jawaban Anda</span>
                                  )}
                                  {option === question.correct_answer && (
                                    <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded whitespace-nowrap">Jawaban Benar</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {question.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Penjelasan:</p>
                            <p className="text-sm text-blue-800">{question.explanation}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          {userAnswer
                            ? userAnswer === question.correct_answer
                              ? <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-green-700">Jawaban Anda benar!</span></>
                              : <><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-red-700">Jawaban Anda salah</span></>
                            : <><AlertCircle className="h-4 w-4 text-yellow-600" /><span className="text-yellow-700">Soal tidak dijawab</span></>}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ExamResults;
