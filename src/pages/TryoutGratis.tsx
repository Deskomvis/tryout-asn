import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ExamCard } from "@/components/ExamCard";
import { useExams } from "@/hooks/useExams";
import { Card, CardContent } from "@/components/ui/card";

const TryoutGratis = () => {
  const { exams, loading } = useExams();

  const freeExams = useMemo(
    () => exams.filter((e) => (e.price ?? 0) === 0),
    [exams]
  );

  return (
    <AppLayout>
      <PageHeader
        title="Tryout Gratis"
        breadcrumbs={[{ label: "Tryout Gratis" }]}
      />

      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Sparkles className="h-4 w-4 shrink-0 text-green-600" />
          <p>Paket berikut bisa langsung diaktifkan secara gratis tanpa perlu pembelian.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : freeExams.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Belum ada paket gratis tersedia saat ini.
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {freeExams.map((exam, i) => (
              <ExamCard key={exam.id} exam={exam} index={i} mode="buy" />
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default TryoutGratis;
