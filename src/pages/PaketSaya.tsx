import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight, Eye, Gift, ExternalLink,
  FileText, Timer, Brain, Users, Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isSKDExam, isSKDPassed, SKD_QUESTIONS } from "@/lib/skdScoring";

type PurchasedExam = {
  examId: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  price: number;
  subcategory: string | null;
  passingScore: number | null;
  bonusLink?: string | null;
  bonusTitle?: string | null;
  bonusDescription?: string | null;
  hasActivePurchase: boolean;
};

type Attempt = {
  id: string;
  examId: string;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  totalScore: number;
  createdAt: string;
};

const StatCard = ({
  icon: Icon, label, value, unit, bg, iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  unit?: string;
  bg: string;
  iconColor: string;
}) => (
  <div className={cn("flex flex-col items-center gap-2 rounded-2xl p-4 text-center", bg)}>
    <Icon className={cn("h-5 w-5", iconColor)} />
    <p className="text-[11px] font-medium leading-tight text-muted-foreground">{label}</p>
    <p className="text-2xl font-extrabold text-foreground leading-none">
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
    </p>
  </div>
);

const PaketSaya = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<PurchasedExam[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, Attempt[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: purchases } = await supabase
        .from("exam_purchases")
        .select("id,used,exams(id,title,total_questions,duration,price,subcategory,passing_score,bonus_link,bonus_title,bonus_description)")
        .eq("user_id", user.id);

      if (!purchases?.length) { setLoading(false); return; }

      const examMap = new Map<string, PurchasedExam>();
      for (const p of purchases as any[]) {
        const e = p.exams;
        if (!e) continue;
        if (!examMap.has(e.id)) {
          examMap.set(e.id, {
            examId: e.id,
            title: e.title ?? "",
            totalQuestions: e.total_questions ?? 0,
            durationMinutes: Math.round((e.duration ?? 0) / 60),
            price: e.price ?? 0,
            subcategory: e.subcategory ?? null,
            passingScore: e.passing_score ?? null,
            bonusLink: e.bonus_link,
            bonusTitle: e.bonus_title,
            bonusDescription: e.bonus_description,
            hasActivePurchase: !p.used,
          });
        } else if (!p.used) {
          examMap.get(e.id)!.hasActivePurchase = true;
        }
      }

      const examList = Array.from(examMap.values());
      setExams(examList);

      const examIds = examList.map((x) => x.examId);
      const { data: results } = await supabase
        .from("exam_results")
        .select("id,exam_id,twk_score,tiu_score,tkp_score,total_score,created_at")
        .eq("user_id", user.id)
        .in("exam_id", examIds)
        .order("created_at", { ascending: true });

      const map: Record<string, Attempt[]> = {};
      for (const r of (results ?? []) as any[]) {
        if (!map[r.exam_id]) map[r.exam_id] = [];
        map[r.exam_id].push({
          id: r.id,
          examId: r.exam_id,
          twkScore: r.twk_score ?? 0,
          tiuScore: r.tiu_score ?? 0,
          tkpScore: r.tkp_score ?? 0,
          totalScore: r.total_score ?? 0,
          createdAt: r.created_at,
        });
      }
      setAttemptsMap(map);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Paket Saya" breadcrumbs={[{ label: "Paket Saya" }]} />
        <div className="py-16 text-center text-sm text-muted-foreground">Memuat paket…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Paket Saya" breadcrumbs={[{ label: "Paket Saya" }]} />

      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada paket.{" "}
            <Link to="/beli-paket" className="font-medium text-primary hover:underline">
              Beli paket sekarang
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {exams.map((exam, i) => {
            const isSkd = isSKDExam(exam.subcategory);
            const attempts = attemptsMap[exam.examId] ?? [];

            return (
              <motion.div
                key={exam.examId}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Card className="overflow-hidden border-border shadow-sm">
                  <CardContent className="p-6">
                    {/* ── Header ── */}
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-foreground leading-tight">{exam.title}</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 font-semibold",
                          exam.price === 0
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-primary/30 bg-primary/5 text-primary",
                        )}
                      >
                        {exam.price === 0 ? "Gratis" : `Rp ${exam.price.toLocaleString("id-ID")}`}
                      </Badge>
                    </div>

                    {/* ── Stat cards ── */}
                    <div className={cn(
                      "mb-5 grid gap-3",
                      isSkd ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2"
                    )}>
                      <StatCard
                        icon={FileText}
                        label="Jumlah Soal"
                        value={exam.totalQuestions}
                        unit="Soal"
                        bg="bg-blue-50 border border-blue-100"
                        iconColor="text-blue-500"
                      />
                      <StatCard
                        icon={Timer}
                        label="Waktu Pengerjaan"
                        value={exam.durationMinutes}
                        unit="Menit"
                        bg="bg-violet-50 border border-violet-100"
                        iconColor="text-violet-500"
                      />
                      {isSkd && (
                        <>
                          <StatCard
                            icon={Brain}
                            label="Soal Tes Intelegensia Umum"
                            value={SKD_QUESTIONS.tiu}
                            unit="Soal"
                            bg="bg-red-50 border border-red-100"
                            iconColor="text-red-400"
                          />
                          <StatCard
                            icon={Users}
                            label="Soal Tes Karakteristik Pribadi"
                            value={SKD_QUESTIONS.tkp}
                            unit="Soal"
                            bg="bg-orange-50 border border-orange-100"
                            iconColor="text-orange-400"
                          />
                          <StatCard
                            icon={Landmark}
                            label="Soal Tes Wawasan Kebangsaan"
                            value={SKD_QUESTIONS.twk}
                            unit="Soal"
                            bg="bg-green-50 border border-green-100"
                            iconColor="text-green-500"
                          />
                        </>
                      )}
                    </div>

                    {/* ── Bonus ── */}
                    {exam.bonusLink && (
                      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-900">
                            {exam.bonusTitle?.trim() || "Bonus pembelian"}
                          </p>
                          {exam.bonusDescription && (
                            <p className="mt-0.5 text-[11px] text-amber-800">{exam.bonusDescription}</p>
                          )}
                          <a
                            href={exam.bonusLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                          >
                            Buka bonus <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div className="flex flex-wrap items-center gap-3">
                      {exam.hasActivePurchase ? (
                        <Button
                          asChild
                          className="rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                        >
                          <Link to={`/exam/${exam.examId}`}>
                            Kerjakan <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="outline" className="rounded-full gap-2">
                          <Link to="/beli-paket">Beli Lagi</Link>
                        </Button>
                      )}
                      {attempts.length > 0 && (
                        <Button asChild variant="ghost" size="sm" className="rounded-full gap-1.5 text-muted-foreground">
                          <Link to={`/exam-results/${exam.examId}`}>
                            <Eye className="h-4 w-4" /> Lihat Hasil Terakhir
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  {/* ── Riwayat Tryout ── */}
                  {attempts.length > 0 && (
                    <div className="border-t bg-muted/20 px-6 py-5">
                      <h4 className="mb-3 text-sm font-semibold text-foreground">
                        Riwayat Tryout {exam.title}
                      </h4>
                      <div className="overflow-x-auto rounded-xl border bg-background">
                        <table className="w-full min-w-[540px] text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-10">No</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Percobaan</th>
                              {isSkd && (
                                <>
                                  <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-purple-600">Tes Intelegensia Umum</th>
                                  <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-orange-500">Tes Karakteristik Pribadi</th>
                                  <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-blue-600">Tes Wawasan Kebangsaan</th>
                                </>
                              )}
                              <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                              <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Total</th>
                              <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attempts.map((attempt, idx) => {
                              const passed = isSkd
                                ? isSKDPassed({ twk: attempt.twkScore, tiu: attempt.tiuScore, tkp: attempt.tkpScore })
                                : attempt.totalScore >= (exam.passingScore ?? 0);
                              return (
                                <tr
                                  key={attempt.id}
                                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                >
                                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium">Percobaan {idx + 1}</td>
                                  {isSkd && (
                                    <>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-semibold text-purple-600">{attempt.tiuScore}</span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-semibold text-orange-500">{attempt.tkpScore}</span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-semibold text-blue-600">{attempt.twkScore}</span>
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={cn(
                                        "inline-block rounded-full px-3 py-0.5 text-xs font-bold",
                                        passed
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700",
                                      )}
                                    >
                                      {passed ? "LULUS" : "TIDAK LULUS"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold text-foreground">
                                    {attempt.totalScore}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
                                      <Link to={`/exam-results/${attempt.examId}`} title="Lihat hasil">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      </Link>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default PaketSaya;
