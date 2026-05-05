import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ExamCard } from "@/components/ExamCard";
import type { ExamLite } from "@/components/ExamCard";
import { Card, CardContent } from "@/components/ui/card";

const PaketSaya = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamLite[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_scores")
      .select("exams(id,title,description,duration,total_questions,price)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const list = (data ?? [])
          .map((r: any) => r.exams)
          .filter(Boolean);
        // dedupe by id
        const map = new Map<string, ExamLite>();
        list.forEach((e: ExamLite) => map.set(e.id, e));
        setExams([...map.values()]);
      });
  }, [user]);

  return (
    <AppLayout>
      <PageHeader title="Paket Saya" breadcrumbs={[{ label: "Paket Saya" }]} />
      {exams.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada paket. Beli paket untuk mulai mengerjakan tryout.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e, i) => <ExamCard key={e.id} exam={e} index={i} ctaLabel="Kerjakan Lagi" />)}
        </div>
      )}
    </AppLayout>
  );
};

export default PaketSaya;
