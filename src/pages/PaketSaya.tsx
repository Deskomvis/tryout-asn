import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Trophy,
  Gift,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PurchaseExam = {
  id: string;
  title: string;
  total_questions: number;
  duration: number;
  parent_exam_id?: string | null;
  bonus_title?: string | null;
  bonus_description?: string | null;
  bonus_link?: string | null;
};

type Purchase = {
  id: string;
  used: boolean;
  used_at: string | null;
  purchased_at: string;
  price_paid: number;
  exams: PurchaseExam | null;
};

type ActiveStandalone = {
  type: "standalone";
  purchase: Purchase;
};

type ActiveBundle = {
  type: "bundle";
  parent: Purchase;
  children: Purchase[];
};

type ActiveGroup = ActiveStandalone | ActiveBundle;

const getBundleKey = (purchase: Purchase) => purchase.exams?.parent_exam_id ?? purchase.exams?.id ?? purchase.id;

const getBundleLabel = (purchase: Purchase) => {
  const title = purchase.exams?.title ?? "";
  return title.replace(/\s*-\s*Paket\s+[A-Z]$/i, "").trim() || title;
};

const getChildLetter = (title?: string | null) => {
  const match = title?.match(/-\s*Paket\s+([A-Z])$/i);
  return match?.[1]?.toUpperCase() ?? "";
};

const PaketSaya = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [rankMap, setRankMap] = useState<Record<string, number>>({});
  const [expandedBundleIds, setExpandedBundleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("exam_purchases")
        .select("id,used,used_at,purchased_at,price_paid,exams(id,title,total_questions,duration,parent_exam_id,bonus_title,bonus_description,bonus_link)")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      const purchases: Purchase[] = (data as any) ?? [];
      setRows(purchases);

      const usedExamIds = [
        ...new Set(purchases.filter((p) => p.used && p.exams?.id).map((p) => p.exams!.id)),
      ];
      if (usedExamIds.length === 0) return;

      const { data: results } = await supabase
        .from("exam_results")
        .select("exam_id, total_score")
        .eq("user_id", user.id)
        .in("exam_id", usedExamIds);

      const scores: Record<string, number> = {};
      for (const r of (results ?? []) as any[]) {
        if (scores[r.exam_id] == null || r.total_score > scores[r.exam_id]) {
          scores[r.exam_id] = r.total_score;
        }
      }
      setScoreMap(scores);

      const { data: myBest } = await supabase
        .from("user_scores")
        .select("exam_id, score")
        .eq("user_id", user.id)
        .in("exam_id", usedExamIds);

      const myBestMap: Record<string, number> = {};
      (myBest ?? []).forEach((r: any) => { myBestMap[r.exam_id] = r.score; });

      const ranks: Record<string, number> = {};
      await Promise.all(
        Object.keys(myBestMap).map(async (eid) => {
          const { count } = await supabase
            .from("user_scores")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", eid)
            .gt("score", myBestMap[eid]);
          ranks[eid] = (count ?? 0) + 1;
        }),
      );
      setRankMap(ranks);
    })();
  }, [user]);

  const activeGroups = useMemo<ActiveGroup[]>(() => {
    const activeRows = rows.filter((r) => !r.used && r.exams);
    const parentMap = new Map<string, Purchase>();
    const childMap = new Map<string, Purchase[]>();
    const standalone: Purchase[] = [];

    for (const purchase of activeRows) {
      const exam = purchase.exams;
      if (!exam) continue;
      if (exam.parent_exam_id) {
        const bucket = childMap.get(exam.parent_exam_id) ?? [];
        bucket.push(purchase);
        childMap.set(exam.parent_exam_id, bucket);
      } else if ((rows.some((row) => row.exams?.parent_exam_id === exam.id))) {
        parentMap.set(exam.id, purchase);
      } else {
        standalone.push(purchase);
      }
    }

    const bundles: ActiveBundle[] = Array.from(parentMap.entries())
      .map(([parentId, parent]) => ({
        type: "bundle" as const,
        parent,
        children: (childMap.get(parentId) ?? []).sort((a, b) => {
          const letterA = getChildLetter(a.exams?.title);
          const letterB = getChildLetter(b.exams?.title);
          return letterA.localeCompare(letterB);
        }),
      }))
      .filter((group) => group.children.length > 0);

    const childOnlyBundles: ActiveBundle[] = Array.from(childMap.entries())
      .filter(([parentId]) => !parentMap.has(parentId))
      .map(([, children]) => ({
        type: "bundle" as const,
        parent: children[0],
        children: [...children].sort((a, b) => {
          const letterA = getChildLetter(a.exams?.title);
          const letterB = getChildLetter(b.exams?.title);
          return letterA.localeCompare(letterB);
        }),
      }));

    const standaloneGroups: ActiveStandalone[] = standalone.map((purchase) => ({
      type: "standalone" as const,
      purchase,
    }));

    return [...bundles, ...childOnlyBundles, ...standaloneGroups].sort((a, b) => {
      const dateA = a.type === "bundle" ? a.parent.purchased_at : a.purchase.purchased_at;
      const dateB = b.type === "bundle" ? b.parent.purchased_at : b.purchase.purchased_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [rows]);

  const historyRows = useMemo(() => {
    const bundleHistoryMap = new Map<string, Purchase>();
    const standaloneHistory: Purchase[] = [];

    for (const purchase of rows) {
      const exam = purchase.exams;
      if (!exam) continue;

      if (exam.parent_exam_id) continue;

      if (rows.some((row) => row.exams?.parent_exam_id === exam.id)) {
        if (!bundleHistoryMap.has(exam.id)) bundleHistoryMap.set(exam.id, purchase);
      } else {
        standaloneHistory.push(purchase);
      }
    }

    return [...bundleHistoryMap.values(), ...standaloneHistory].sort(
      (a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime(),
    );
  }, [rows]);

  const toggleBundle = (bundleId: string) => {
    setExpandedBundleIds((prev) => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  return (
    <AppLayout>
      <PageHeader title="Paket Saya" breadcrumbs={[{ label: "Paket Saya" }]} />

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Aktif (Akses 1x)</h2>
        {activeGroups.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada paket aktif. <Link to="/beli-paket" className="font-medium text-primary hover:underline">Beli paket sekarang</Link>.
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {activeGroups.map((group, i) => {
              if (group.type === "standalone") {
                const p = group.purchase;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                    <Card className="border-primary/30">
                      <CardContent className="flex flex-col gap-4 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{p.exams?.title}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {p.exams ? `${Math.round(p.exams.duration / 60)} menit · ${p.exams.total_questions} soal` : ""}
                            </p>
                          </div>
                          <Badge className="gap-1"><Clock className="h-3 w-3" />Siap</Badge>
                        </div>
                        {p.exams?.bonus_link && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-start gap-2">
                              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-amber-900">
                                  {p.exams.bonus_title?.trim() || "Bonus pembelian"}
                                </p>
                                {p.exams.bonus_description && (
                                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800">{p.exams.bonus_description}</p>
                                )}
                                <a
                                  href={p.exams.bonus_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                                >
                                  Buka bonus <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-auto space-y-2">
                          <p className="text-xs text-muted-foreground">Akses 1x — saldo terpotong: Rp {p.price_paid.toLocaleString("id-ID")}</p>
                          <Button asChild className="w-full rounded-full">
                            <Link to={`/exam/${p.exams?.id}`}>Mulai Tryout</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              }

              const bundleId = group.parent.exams?.id ?? group.parent.id;
              const expanded = expandedBundleIds.has(bundleId);
              const bundleTitle = getBundleLabel(group.parent);
              const parentExam = group.parent.exams;

              return (
                <motion.div key={bundleId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                  <Card className="border-primary/30">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Package2 className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-foreground">{bundleTitle}</h4>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {group.children.length} paket aktif siap dikerjakan
                            </p>
                          </div>
                          <Badge className="gap-1"><Clock className="h-3 w-3" />Siap</Badge>
                        </div>

                        {parentExam?.bonus_link && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-start gap-2">
                              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-amber-900">
                                  {parentExam.bonus_title?.trim() || "Bonus pembelian"}
                                </p>
                                {parentExam.bonus_description && (
                                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800">{parentExam.bonus_description}</p>
                                )}
                                <a
                                  href={parentExam.bonus_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                                >
                                  Buka bonus <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Pembelian paket: Rp {group.parent.price_paid.toLocaleString("id-ID")}
                          </p>
                          <Button variant="outline" className="gap-2 rounded-full" onClick={() => toggleBundle(bundleId)}>
                            {expanded ? "Sembunyikan isi paket" : "Lihat isi paket"}
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>

                        {expanded && (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {group.children.map((child) => {
                              const childLetter = getChildLetter(child.exams?.title) || "Paket";
                              return (
                                <div
                                  key={child.id}
                                  className="rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-accent/30"
                                >
                                  <div className="mb-3 flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Paket {childLetter}</p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {child.exams ? `${Math.round(child.exams.duration / 60)} menit · ${child.exams.total_questions} soal` : ""}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px]">Siap</Badge>
                                  </div>
                                  <Button asChild className="w-full rounded-full">
                                    <Link to={`/exam/${child.exams?.id}`}>Kerjakan Paket {childLetter}</Link>
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-foreground">Riwayat Pembelian</h2>
        {historyRows.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada transaksi.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-secondary text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">Tanggal Beli</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyRows.map((p) => {
                    const bundleTitle = getBundleLabel(p);
                    return (
                      <tr key={p.id} className="hover:bg-secondary/50">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            {p.used && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                            {bundleTitle || p.exams?.title || "-"}
                          </span>
                          {p.exams?.bonus_link && (
                            <div className="mt-1">
                              <a
                                href={p.exams.bonus_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
                              >
                                <Gift className="h-3 w-3" />
                                {p.exams.bonus_title?.trim() || "Buka bonus"}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(p.purchased_at).toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right">Rp {p.price_paid.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3">
                          {p.used ? <Badge variant="secondary">Selesai</Badge> : <Badge>Aktif</Badge>}
                        </td>
                      </tr>
                    );
                  })}
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
