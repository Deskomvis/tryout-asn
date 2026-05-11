import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Trophy, ArrowUpRight, ShoppingBag, History, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { BannerSlider } from "@/components/BannerSlider";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  exam_id: string;
  total_score: number;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  time_spent: number;
  created_at: string;
  exams: { title: string } | null;
  rank?: number;
};

const stats = [
  {
    label: "Paket Saya",
    icon: Package,
    gradient: "from-blue-500 to-indigo-600",
    to: "/paket-saya",
    linkText: "Lihat paket saya",
  },
  {
    label: "Leaderboard",
    icon: Trophy,
    gradient: "from-amber-500 to-orange-600",
    to: "/leaderboard",
    linkText: "Lihat ranking",
  },
  {
    label: "Beli Paket Tryout",
    icon: ShoppingBag,
    gradient: "from-emerald-500 to-teal-600",
    to: "/beli-paket",
    linkText: "Beli paket tryout",
    staticValue: null,
  },
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const [paketCount, setPaketCount] = useState(0);
  const [leaderCount, setLeaderCount] = useState(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("exam_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setPaketCount(count ?? 0));
  }, [user]);

  useEffect(() => {
    supabase
      .from("user_scores")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setLeaderCount(count ?? 0));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: histData } = await supabase
        .from("exam_results")
        .select("id, exam_id, total_score, twk_score, tiu_score, tkp_score, time_spent, created_at, exams(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const rows: HistoryRow[] = (histData as any) ?? [];
      if (rows.length === 0) { setHistory([]); return; }

      const examIds = [...new Set(rows.map((r) => r.exam_id))];

      const { data: myBest } = await supabase
        .from("user_scores")
        .select("exam_id, score")
        .eq("user_id", user.id)
        .in("exam_id", examIds);

      const myBestMap: Record<string, number> = {};
      (myBest ?? []).forEach((r: any) => { myBestMap[r.exam_id] = r.score; });

      const rankMap: Record<string, number | null> = {};
      await Promise.all(
        examIds.map(async (eid) => {
          const myScore = myBestMap[eid];
          if (myScore == null) { rankMap[eid] = null; return; }
          const { count } = await supabase
            .from("user_scores")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", eid)
            .gt("score", myScore);
          rankMap[eid] = (count ?? 0) + 1;
        })
      );

      setHistory(rows.map((r) => ({ ...r, rank: rankMap[r.exam_id] ?? undefined })));
    })();
  }, [user]);

  const values: Record<string, number | null> = {
    "Paket Saya": paketCount,
    "Leaderboard": leaderCount,
    "Beli Paket Tryout": null,
  };

  return (
    <AppLayout>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <BannerSlider />
      </motion.section>

      <h2 className="mt-8 text-lg font-semibold text-foreground">Home</h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => {
          const val = values[s.label];
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Link to={s.to} className="block">
                <div className={`relative rounded-2xl bg-gradient-to-br ${s.gradient} p-5 text-white shadow-lg`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">{s.label}</p>
                      {val !== null ? (
                        <p className="mt-1 text-3xl font-bold">{val}</p>
                      ) : (
                        <p className="mt-1 text-3xl font-bold">→</p>
                      )}
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
                      <s.icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/90">
                    {s.linkText} <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <History className="h-4 w-4 text-primary" /> History Tryout
          </h3>
          <Link to="/paket-saya" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Lihat semua <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Belum ada riwayat tryout selesai.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold">Ujian</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-blue-600">TWK</th>
                      <th className="px-4 py-3 text-right font-semibold text-purple-600">TIU</th>
                      <th className="px-4 py-3 text-right font-semibold text-orange-500">TKP</th>
                      <th className="px-4 py-3 text-right font-semibold">Rangking</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-medium">{r.exams?.title ?? "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{r.total_score}</td>
                        <td className="px-4 py-3 text-right text-blue-600">{r.twk_score}</td>
                        <td className="px-4 py-3 text-right text-purple-600">{r.tiu_score}</td>
                        <td className="px-4 py-3 text-right text-orange-500">{r.tkp_score}</td>
                        <td className="px-4 py-3 text-right">
                          {r.rank != null
                            ? <span className={cn("font-semibold", r.rank <= 3 && "text-amber-600")}>#{r.rank}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
};

export default Dashboard;
