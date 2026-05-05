import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Wallet, MessageCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useBalance, formatPoint } from "@/hooks/useBalance";
import { buildTopupWhatsAppUrl } from "@/lib/config";

type TopupRow = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const QUICK = [10000, 25000, 50000, 100000, 200000, 500000];

const amountSchema = z
  .number({ invalid_type_error: "Nominal harus angka" })
  .int("Nominal harus bilangan bulat")
  .min(5000, "Minimal topup 5.000 point")
  .max(10000000, "Maksimal topup 10.000.000 point");

const Topup = () => {
  const { user } = useAuth();
  const { balance } = useBalance();
  const [amount, setAmount] = useState<number>(50000);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<TopupRow[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("topup_requests")
      .select("id,amount,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setHistory((data as TopupRow[] | null) ?? []);
  };

  useEffect(() => { loadHistory(); }, [user]);

  const submit = async () => {
    const parsed = amountSchema.safeParse(amount);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("topup_requests")
      .insert({ user_id: user.id, amount: parsed.data })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) return toast.error(error?.message ?? "Gagal membuat permintaan");

    const url = buildTopupWhatsAppUrl({
      amount: parsed.data,
      userName: user.user_metadata?.full_name ?? user.email ?? "Pengguna",
      userEmail: user.email ?? "",
      requestId: data.id,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Permintaan dibuat. Lanjutkan pembayaran via WhatsApp admin.");
    loadHistory();
  };

  const StatusIcon = ({ s }: { s: TopupRow["status"] }) =>
    s === "approved" ? <CheckCircle2 className="h-4 w-4" /> :
    s === "rejected" ? <XCircle className="h-4 w-4" /> :
    <Clock className="h-4 w-4" />;

  return (
    <AppLayout>
      <PageHeader title="Topup Saldo Point" breadcrumbs={[{ label: "Topup" }]} />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-accent/40 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Saldo Saat Ini</p>
                  <p className="text-2xl font-bold text-foreground">{formatPoint(balance)}</p>
                  <p className="text-xs text-muted-foreground">1 point = Rp 1</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Nominal Topup (point)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={5000}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Setara Rp {amount.toLocaleString("id-ID")}</p>
              </div>

              <div>
                <Label className="mb-2 block">Pilih Cepat</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {QUICK.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={amount === v ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setAmount(v)}
                    >
                      {(v / 1000).toLocaleString("id-ID")}k
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={submit} disabled={submitting} size="lg" className="w-full gap-2 rounded-full">
                <MessageCircle className="h-4 w-4" />
                {submitting ? "Memproses..." : "Buat Permintaan & Hubungi Admin"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Setelah klik, Anda akan diarahkan ke WhatsApp admin dengan detail permintaan otomatis.
                Saldo akan ditambahkan oleh admin setelah pembayaran dikonfirmasi.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">Cara Topup</h3>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
              <li>Pilih nominal topup.</li>
              <li>Klik tombol <span className="font-semibold text-foreground">Buat Permintaan</span>.</li>
              <li>Lanjutkan chat ke WhatsApp admin & lakukan pembayaran.</li>
              <li>Admin akan menambahkan saldo Anda setelah pembayaran diterima.</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h3 className="mb-3 text-base font-semibold text-foreground">Riwayat Topup</h3>
        <Card>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Belum ada permintaan topup.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-secondary text-left text-foreground">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatPoint(r.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                            className="gap-1"
                          >
                            <StatusIcon s={r.status} />
                            {r.status === "approved" ? "Disetujui" : r.status === "rejected" ? "Ditolak" : "Menunggu"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
};

export default Topup;
