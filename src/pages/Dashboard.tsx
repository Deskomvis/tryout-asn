import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Trophy, ArrowUpRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { BannerSlider } from "@/components/BannerSlider";

type LeaderRow = {
  id: string;
  score: number;
  user_id: string;
  profiles: { full_name: string | null } | null;
  exams: { title: string } | null;
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
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

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
      .select("id, score, user_id, profiles(full_name), exams(title)")
      .order("score", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const rows = (data as any) ?? [];
        setLeaders(rows);
        setLeaderCount(rows.length);
      });
  }, []);

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
            <Trophy className="h-4 w-4 text-primary" /> Ranking Tryout
          </h3>
          <Link to="/leaderboard" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Lihat semua <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {leaders.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Belum ada riwayat tryout selesai.</p>
            ) : (
              <ol className="divide-y divide-border">
                {leaders.map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{r.profiles?.full_name ?? "Anonim"}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.exams?.title}</p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
};

export default Dashboard;
