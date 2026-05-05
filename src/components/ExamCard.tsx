import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ExamLite = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  total_questions: number;
  price: number;
};

export const ExamCard = ({
  exam,
  index = 0,
  ctaLabel = "Mulai Tryout",
  ctaTo,
}: {
  exam: ExamLite;
  index?: number;
  ctaLabel?: string;
  ctaTo?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.35, delay: index * 0.05 }}
    whileHover={{ y: -3 }}
  >
    <Card className="h-full transition-shadow hover:shadow-lg">
      <CardContent className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground">{exam.title}</h4>
          {exam.price === 0 ? (
            <Badge variant="secondary">Gratis</Badge>
          ) : (
            <Badge>Rp {exam.price.toLocaleString("id-ID")}</Badge>
          )}
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{Math.round(exam.duration / 60)} menit</span>
          <span>·</span>
          <span>{exam.total_questions} soal</span>
        </div>
        <Button asChild className="w-full rounded-full">
          <Link to={ctaTo ?? `/exam/${exam.id}`}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);
