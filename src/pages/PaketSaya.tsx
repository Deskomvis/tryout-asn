import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";
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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("exam_purchases")
      .select("id,used,used_at,purchased_at,price_paid,exams(id,title,total_questions,duration)")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })
      .then(({ data }) => setRows((data as any) ?? []));
  }, [user]);

  const active = rows.filter((r) => !r.used);
  const finished = rows.filter((r) => r.used);

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
        <h2 className="mb-3 text-base font-semibold text-foreground">Riwayat Selesai</h2>
        {finished.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada paket yang dikerjakan.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-secondary text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">Selesai</th>
                    <th className="px-4 py-3">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {finished.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" /> {p.exams?.title ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.used_at ? new Date(p.used_at).toLocaleString("id-ID") : "-"}</td>
                      <td className="px-4 py-3">Rp {p.price_paid.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
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
