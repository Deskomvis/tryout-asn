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
import { AlertCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
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
}

const ExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch exam result
        const { data, error } = await supabase
          .from("exam_results")
          .select("*")
          .eq("exam_id", examId!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          toast.error("Gagal memuat hasil ujian");
          navigate("/paket-saya");
          return;
        }

        if (!data) {
          toast.error("Hasil ujian tidak ditemukan");
          navigate("/paket-saya");
          return;
        }

        const { data: exam } = await supabase
          .from("exams")
          .select("title, passing_score")
          .eq("id", examId!)
          .maybeSingle();

        // Fetch exam questions with explanations
        const { data: questionsData } = await supabase.rpc("get_exam_questions", { _exam_id: examId! });
        if (questionsData) {
          setQuestions(questionsData);
        }

        // Fetch user scores to get answers
        const { data: scoreData } = await supabase
          .from("user_scores")
          .select("score_breakdown")
          .eq("exam_id", examId!)
          .eq("user_id", user?.id || "")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Try to get answers from localStorage if available
        const savedAnswers = localStorage.getItem(`exam-answers-${examId}`);
        if (savedAnswers) {
          try {
            setUserAnswers(JSON.parse(savedAnswers));
          } catch {
            // Continue without answers
          }
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
    if (h > 0)
      return `${h} jam ${m} menit ${s} detik`;
    return `${m} menit ${s} detik`;
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{result.exam_title}</h1>
          <p className="mt-2 text-muted-foreground">Hasil Ujian</p>
        </div>

        {/* Pass/Fail Alert */}
        <Alert
          className={`mb-8 border-2 ${
            isPassed
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          {isPassed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <AlertDescription
            className={`font-semibold ${
              isPassed ? "text-green-800" : "text-red-800"
            }`}
          >
            {isPassed
              ? `Selamat! Anda Lulus dengan skor ${result.total_score}`
              : `Maaf, Anda Tidak Lulus. Skor: ${result.total_score} (Minimal: ${result.passing_score || 0})`}
          </AlertDescription>
        </Alert>

        {/* Score Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-4xl font-bold text-primary">
                {result.total_score}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Total Skor</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {result.twk_score}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">TWK</p>
              <p className="text-xs text-muted-foreground">
                Tes Wawasan Kebangsaan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {result.tiu_score}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">TIU</p>
              <p className="text-xs text-muted-foreground">
                Tes Intelegensia Umum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {result.tkp_score}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">TKP</p>
              <p className="text-xs text-muted-foreground">
                Tes Karakteristik Pribadi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() => navigate(`/exam/${examId}`)}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Kerjakan Ulang
          </Button>
          <Button size="lg" variant="outline">
            Pembahasan
          </Button>
        </div>

        {/* Exam Data */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Data Tryout</h2>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Waktu Pengerjaan</p>
              <p className="mt-1 text-lg font-semibold">
                {formatTime(result.time_spent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Soal Terjawab</p>
              <p className="mt-1 text-lg font-semibold">
                {result.answered_count}/{result.total_questions}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Soal Tidak Terjawab</p>
              <p className="mt-1 text-lg font-semibold">
                {result.unanswered_count}/{result.total_questions}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pembahasan / Review */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Pembahasan Soal</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tekan soal untuk melihat jawaban dan penjelasan lengkap
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions.map((question, idx) => {
                const isExpanded = expandedQuestions.has(question.id);
                const userAnswer = userAnswers[question.id];

                return (
                  <Card key={question.id} className="overflow-hidden">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedQuestions);
                        if (isExpanded) {
                          newExpanded.delete(question.id);
                        } else {
                          newExpanded.add(question.id);
                        }
                        setExpandedQuestions(newExpanded);
                      }}
                      className="w-full px-6 py-4 flex items-start justify-between hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">Soal {idx + 1}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.question_text.substring(0, 100)}
                          {question.question_text.length > 100 ? "..." : ""}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t px-6 py-4 space-y-4 bg-muted/30">
                        {/* Pertanyaan Lengkap */}
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">Pertanyaan:</p>
                          <p className="mt-2">{question.question_text}</p>
                        </div>

                        {/* Pilihan Jawaban */}
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground mb-2">
                            Pilihan Jawaban:
                          </p>
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <div
                                key={option}
                                className={cn(
                                  "p-3 rounded border text-sm",
                                  userAnswer === option
                                    ? "border-blue-500 bg-blue-50"
                                    : option === question.correct_answer
                                    ? "border-green-500 bg-green-50"
                                    : "border-border"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold">•</span>
                                  <span>{option}</span>
                                  {userAnswer === option && (
                                    <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                      Jawaban Anda
                                    </span>
                                  )}
                                  {option === question.correct_answer && (
                                    <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded">
                                      Jawaban Benar
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Penjelasan */}
                        {question.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Penjelasan:</p>
                            <p className="text-sm text-blue-800">{question.explanation}</p>
                          </div>
                        )}

                        {/* Status Jawaban */}
                        {userAnswer ? (
                          userAnswer === question.correct_answer ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Jawaban Anda benar!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-700 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span>Jawaban Anda salah</span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-700 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Soal tidak dijawab</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ExamResults;
