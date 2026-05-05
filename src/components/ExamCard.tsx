import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { purchaseExam } from "@/lib/payments";
import { useBalance } from "@/hooks/useBalance";

export type ExamLite = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  total_questions: number;
  price: number;
  category?: string | null;
  subcategory?: string | null;
};

type Mode = "buy" | "play";

export const ExamCard = ({
  exam,
  index = 0,
  mode = "buy",
  onPurchased,
}: {
  exam: ExamLite;
  index?: number;
  mode?: Mode;
  onPurchased?: () => void;
}) => {
  const navigate = useNavigate();
  const { balance, refresh } = useBalance();
  const [busy, setBusy] = useState(false);
  const isFree = exam.price === 0;

  const handleBuy = async () => {
    if (!isFree && balance < exam.price) {
      toast.error("Saldo tidak cukup. Silakan topup terlebih dahulu.");
      navigate("/topup");
      return;
    }
    setBusy(true);
    try {
      await purchaseExam(exam.id);
      await refresh();
      toast.success(isFree ? "Paket diaktifkan." : `Berhasil! ${exam.price.toLocaleString("id-ID")} pts terpotong.`);
      onPurchased?.();
      navigate("/paket-saya");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h4 className="font-semibold text-foreground">{exam.title}</h4>
            {isFree ? (
              <Badge variant="secondary">Gratis</Badge>
            ) : (
              <Badge className="gap-1"><Wallet className="h-3 w-3" />{exam.price.toLocaleString("id-ID")} pts</Badge>
            )}
          </div>
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
          <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{Math.round(exam.duration / 60)} menit</span>
            <span>·</span>
            <span>{exam.total_questions} soal</span>
          </div>
          <div className="mt-auto">
            {mode === "play" ? (
              <Button asChild className="w-full rounded-full">
                <Link to={`/exam/${exam.id}`}>Mulai Tryout</Link>
              </Button>
            ) : (
              <Button onClick={handleBuy} disabled={busy} className="w-full rounded-full">
                {busy ? "Memproses..." : isFree ? "Aktifkan Gratis" : `Beli ${exam.price.toLocaleString("id-ID")} pts`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
