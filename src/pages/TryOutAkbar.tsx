import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, FileText, Trophy } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useExams } from "@/hooks/useExams";

const TryOutAkbar = () => {
  const { exams } = useExams();
  const akbar = exams.find((e) => e.title.toLowerCase().includes("akbar")) ?? exams[0];

  return (
    <AppLayout>
      <PageHeader title="Try Out Akbar" breadcrumbs={[{ label: "Try Out Akbar" }]} />

      {!akbar ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada Try Out Akbar yang tersedia.</CardContent></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="overflow-hidden border-primary/30">
            <CardContent className="space-y-5 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">{akbar.title.toUpperCase()}</h2>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{akbar.total_questions} Soal</span>
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{Math.round(akbar.duration / 60)} Menit</span>
              </div>
              <hr className="border-border" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Tanggal Mulai</p>
                    <p className="font-semibold text-foreground">2026-05-01 02:00:00</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Tanggal Selesai</p>
                    <p className="font-semibold text-foreground">2026-07-31 12:00:00</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="rounded-full">
                  <Link to={`/exam/${akbar.id}`}>Mulai Tryout</Link>
                </Button>
                <Button asChild variant="outline" className="gap-2 rounded-full">
                  <Link to="/leaderboard"><Trophy className="h-4 w-4" /> Peringkat</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AppLayout>
  );
};

export default TryOutAkbar;
