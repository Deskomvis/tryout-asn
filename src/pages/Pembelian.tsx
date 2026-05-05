import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  purchased_at: string;
  used: boolean;
  price_paid: number;
  exams: { title: string } | null;
};

const Pembelian = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("exam_purchases")
      .select("id, purchased_at, used, price_paid, exams(title)")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })
      .then(({ data }) => setRows((data as any) ?? []));
  }, [user]);

  return (
    <AppLayout>
      <PageHeader title="Riwayat Pembelian" breadcrumbs={[{ label: "Pembelian" }]} />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Belum ada transaksi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-secondary text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Harga</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/50">
                      <td className="px-4 py-3 font-medium text-foreground">{r.exams?.title ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.purchased_at).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">Rp {r.price_paid.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        {r.used ? <Badge variant="secondary">Selesai</Badge> : <Badge>Aktif</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Pembelian;
