import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Trophy, ArrowUpRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { BannerSlider } from "@/components/BannerSlider";

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

      <div className="mt-3 grid gap-4 grid-cols-1 md:grid-cols-3">
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

    </AppLayout>
  );
};

export default Dashboard;
