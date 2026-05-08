import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, GraduationCap } from "lucide-react";
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
  original_price?: number | null;
  bundle_size?: number | null;
  cover_image_url?: string | null;
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
  const original = exam.original_price ?? 0;
  const hasDiscount = original > exam.price && exam.price > 0;
  const discountPct = hasDiscount ? Math.round(((original - exam.price) / original) * 100) : 0;
  const bundle = exam.bundle_size ?? 1;

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
      toast.success(isFree ? "Paket diaktifkan." : `Berhasil! Rp ${exam.price.toLocaleString("id-ID")} terpotong.`);
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
      <Card className="h-full overflow-hidden rounded-2xl border-border/60 transition-shadow hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-4">
          {/* Hero block */}
          <div className="mb-4 rounded-xl overflow-hidden bg-secondary/50">
            {exam.cover_image_url ? (
              <img
                src={exam.cover_image_url}
                alt={exam.title}
                className="w-full object-cover"
              />
            ) : (
              <div className="p-4">
                <div className="mx-auto flex max-w-[180px] flex-col items-center rounded-xl bg-card p-4 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <span className="mt-2 text-xs font-bold tracking-wider text-foreground">TRYOUT ASN</span>
                  <span className="mt-3 w-full rounded-full bg-muted px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {exam.subcategory?.split(" ").slice(-1)[0] ?? exam.category ?? "PAKET"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Title — full, no clamp */}
          <h4 className="mb-1 text-base font-bold leading-snug text-foreground">{exam.title}</h4>
          <p className="mb-3 text-xs text-muted-foreground">{bundle} Paket</p>

          {/* Pricing row */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {hasDiscount && (
                <Badge className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold">
                  Diskon {discountPct}%
                </Badge>
              )}
              {hasDiscount && (
                <span className="text-xs text-destructive line-through">
                  Rp{original.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <span className="text-base font-bold text-foreground">
              {isFree ? "Gratis" : `Rp${exam.price.toLocaleString("id-ID")}`}
            </span>
          </div>

          <div className="mt-auto">
            {mode === "play" ? (
              <Button asChild className="w-full rounded-full">
                <Link to={`/exam/${exam.id}`}>Mulai Tryout</Link>
              </Button>
            ) : (
              <Button onClick={handleBuy} disabled={busy} className="w-full gap-2 rounded-full">
                {busy ? "Memproses..." : isFree ? "Aktifkan Gratis" : (
                  <><Wallet className="h-4 w-4" /> Beli Rp {exam.price.toLocaleString("id-ID")}</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
