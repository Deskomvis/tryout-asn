import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardCheck, Package, Wallet, ArrowUpRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Exam = { id: string; title: string; description: string | null; duration: number; total_questions: number; price: number };

const Dashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [scoreCount, setScoreCount] = useState(0);

  useEffect(() => {
    supabase.from("exams").select("*").order("created_at").then(({ data }) => setExams(data ?? []));
    supabase.from("user_scores").select("id", { count: "exact", head: true }).eq("user_id", user!.id)
      .then(({ count }) => setScoreCount(count ?? 0));
  }, [user]);

  const stats = [
    {
      label: "Paket Tersedia",
      value: exams.length,
      icon: ClipboardCheck,
      gradient: "from-rose-500 to-rose-600",
      shadow: "shadow-rose-300/40",
    },
    {
      label: "Paket Saya",
      value: scoreCount,
      icon: Package,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-300/40",
    },
    {
      label: "Komisi Referal",
      value: "Rp0",
      icon: Wallet,
      gradient: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-300/40",
    },
  ];

  return (
    <AppLayout>
      {/* Hero banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary via-primary-glow to-blue-400 p-6 text-primary-foreground shadow-elegant md:p-10"
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <Badge className="mb-3 bg-white/20 text-white hover:bg-white/30">
            <Sparkles className="mr-1 h-3 w-3" /> Dream Come True
          </Badge>
          <h1 className="text-2xl font-bold leading-tight md:text-4xl">TES CPNS · PPPK · TNI–POLRI · SEKDIN · BUMN</h1>
          <p className="mt-2 text-sm text-white/90 md:text-base">Latihan soal terlengkap & HOTS untuk pejuang ASN. Mulai tryout sekarang dan raih skor terbaikmu.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold">
              <Link to="/beli-paket">Beli Paket</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 font-semibold text-white hover:bg-white/20 hover:text-white">
              <Link to="/try-out-akbar">Try Out Akbar</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Section title */}
      <h2 className="mt-8 text-lg font-semibold text-foreground">Home</h2>

      {/* Stat cards */}
      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ y: -4 }}
          >
            <div className={`relative rounded-2xl bg-gradient-to-br ${s.gradient} p-5 text-white shadow-lg ${s.shadow}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold">{s.value}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
                  <s.icon className="h-7 w-7" aria-hidden="true" />
                </div>
              </div>
              <div className={`absolute inset-x-4 -bottom-2 h-3 rounded-b-2xl bg-gradient-to-br ${s.gradient} opacity-60 blur-sm`} aria-hidden="true" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Informasi & Promo */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-base font-semibold text-foreground">Informasi</h3>
          <Card className="overflow-hidden">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-foreground">TRYOUTPRO</p>
                <p className="text-sm text-muted-foreground">Soal Terlengkap dan HOTS — diperbarui secara berkala.</p>
              </div>
              <Badge variant="secondary" className="shrink-0">Baru</Badge>
            </CardContent>
          </Card>
        </section>

        <section>
          <h3 className="mb-3 text-base font-semibold text-foreground">Promo</h3>
          <Card className="overflow-hidden border-primary/30 bg-accent/40">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-foreground">Kode Voucher TPASN</p>
                <p className="text-sm text-muted-foreground">Hemat hingga 30% untuk pembelian paket bundling.</p>
              </div>
              <Badge className="shrink-0 bg-primary">Promo</Badge>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Tryout list */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Tryout Tersedia</h3>
          <Link to="/beli-paket" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Lihat semua <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground">{e.title}</h4>
                    {e.price === 0 ? <Badge variant="secondary">Gratis</Badge> : <Badge>Rp {e.price.toLocaleString("id-ID")}</Badge>}
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{Math.round(e.duration / 60)} menit</span>
                    <span>·</span>
                    <span>{e.total_questions} soal</span>
                  </div>
                  <Button asChild className="w-full rounded-full">
                    <Link to={`/exam/${e.id}`}>Mulai Tryout</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {exams.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tryout.</p>}
        </div>
      </section>
    </AppLayout>
  );
};

export default Dashboard;
