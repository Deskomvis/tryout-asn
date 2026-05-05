import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, ShieldCheck, Stethoscope, GraduationCap, Wrench, School, FileText, Building2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ExamCard } from "@/components/ExamCard";
import { Card, CardContent } from "@/components/ui/card";
import { useExams } from "@/hooks/useExams";

const categories = [
  { id: "koperasi", label: "Koperasi Desa/Kelurahan Merah Putih", icon: Building2 },
  { id: "skb", label: "PAKET SKB CPNS", icon: ShieldCheck },
  { id: "skd", label: "PAKET SKD (TWK,TIU,TKP)", icon: FileText },
  { id: "guru", label: "PPPK GURU/DOSEN", icon: GraduationCap },
  { id: "kesehatan", label: "PPPK KESEHATAN", icon: Stethoscope },
  { id: "teknis", label: "PPPK TEKNIS", icon: Wrench },
  { id: "sekdin", label: "SEKOLAH KEDINASAN", icon: School },
  { id: "all", label: "Semua Paket", icon: LayoutGrid },
];

const BeliPaket = () => {
  const { exams } = useExams();
  const [active, setActive] = useState<string>("all");

  const filtered = useMemo(() => exams, [exams]);

  return (
    <AppLayout>
      <PageHeader
        title="Pilih Kategori"
        breadcrumbs={[{ label: "Beli Paket" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileHover={{ y: -2 }}
            className={`group relative flex items-center gap-4 rounded-xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active === c.id
                ? "border-primary bg-accent shadow-md"
                : "border-border bg-card hover:border-primary/40 hover:shadow-md"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground sm:text-base">{c.label}</span>
          </motion.button>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Paket Tersedia</h2>
        {filtered.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada paket pada kategori ini.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e, i) => <ExamCard key={e.id} exam={e} index={i} mode="buy" />)}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default BeliPaket;
