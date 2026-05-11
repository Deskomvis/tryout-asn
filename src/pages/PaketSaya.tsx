import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Purchase = {
  id: string;
  used: boolean;
  used_at: string | null;
  purchased_at: string;
  price_paid: number;
  exams: { id: string; title: string; total_questions: number; duration: number } | null;
};

const PaketSaya = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [rankMap, setRankMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("exam_purchases")
        .select("id,used,used_at,purchased_at,price_paid,exams(id,title,total_questions,duration)")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      const purchases: Purchase[] = (data as any) ?? [];
      setRows(purchases);

      const usedExamIds = [
        ...new Set(purchases.filter((p) => p.used && p.exams?.id).map((p) => p.exams!.id)),
      ];
      if (usedExamIds.length === 0) return;

      // Best score per exam from exam_results
      const { data: results } = await supabase
        .from("exam_results")
        .select("exam_id, total_score")
        .eq("user_id", user.id)
        .in("exam_id", usedExamIds);

      const scores: Record<string, number> = {};
      for (const r of (results ?? []) as any[]) {
        if (scores[r.exam_id] == null || r.total_score > scores[r.exam_id]) {
          scores[r.exam_id] = r.total_score;
        }
      }
      setScoreMap(scores);

      // Rank from user_scores (paid exams only — free exams won't be in user_scores)
      const { data: myBest } = await supabase
        .from("user_scores")
        .select("exam_id, score")
        .eq("user_id", user.id)
        .in("exam_id", usedExamIds);

      const myBestMap: Record<string, number> = {};
      (myBest ?? []).forEach((r: any) => { myBestMap[r.exam_id] = r.score; });

      const ranks: Record<string, number> = {};
      await Promise.all(
        Object.keys(myBestMap).map(async (eid) => {
          const { count } = await supabase
            .from("user_scores")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", eid)
            .gt("score", myBestMap[eid]);
          ranks[eid] = (count ?? 0) + 1;
        })
      );
      setRankMap(ranks);
    })();
  }, [user]);

  const active = rows.filter((r) => !r.used);

  return (
    <AppLayout>
      <PageHeader title="Paket Saya" breadcrumbs={[{ label: "Paket Saya" }]} />

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Aktif (Akses 1x)</h2>
        {active.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada paket aktif. <Link to="/beli-paket" className="font-medium text-primary hover:underline">Beli paket sekarang</Link>.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                <Card className="h-full border-primary/30">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-foreground">{p.exams?.title}</h4>
                      <Badge className="gap-1"><Clock className="h-3 w-3" />Siap</Badge>
                    </div>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {p.exams ? `${Math.round(p.exams.duration / 60)} menit · ${p.exams.total_questions} soal` : ""}
                    </p>
                    <div className="mt-auto space-y-2">
                      <p className="text-xs text-muted-foreground">Akses 1x — saldo terpotong: Rp {p.price_paid.toLocaleString("id-ID")}</p>
                      <Button asChild className="w-full rounded-full">
                        <Link to={`/exam/${p.exams?.id}`}>Mulai Tryout</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-foreground">Riwayat Pembelian</h2>
        {rows.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada transaksi.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-secondary text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">Tanggal Beli</th>
                    <th className="px-4 py-3">Selesai</th>
                    <th className="px-4 py-3 text-right">Skor</th>
                    <th className="px-4 py-3 text-right">Rangking</th>
                    <th className="px-4 py-3">Harga</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((p) => {
                    const examId = p.exams?.id;
                    const score = examId ? scoreMap[examId] : undefined;
                    const rank = examId ? rankMap[examId] : undefined;
                    return (
                      <tr key={p.id} className="hover:bg-secondary/50">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            {p.used && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                            {p.exams?.title ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(p.purchased_at).toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.used_at ? new Date(p.used_at).toLocaleString("id-ID") : "-"}</td>
                        <td className="px-4 py-3 text-right">
                          {p.used && score != null
                            ? <span className="font-bold text-primary">{score}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.used && rank != null
                            ? <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                <Trophy className="h-3.5 w-3.5" />#{rank}
                              </span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">Rp {p.price_paid.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3">
                          {p.used ? <Badge variant="secondary">Selesai</Badge> : <Badge>Aktif</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        )}
      </section>
    </AppLayout>
  );
};

export default PaketSaya;
