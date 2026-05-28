import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, UserX, Key, FileX,
  Webhook, Gift, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WebhookLog = {
  id: string;
  received_at: string;
  status: string;
  http_status: number;
  lynk_uuid: string | null;
  buyer_email: string | null;
  user_id: string | null;
  exam_id: string | null;
  amount: number | null;
  error: string | null;
  raw_payload: any;
  resolved: boolean;
  resolved_at: string | null;
  resolved_note: string | null;
};

type ExamOption = { id: string; title: string; price: number };

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  success:            { bg: "bg-green-100",   text: "text-green-800",   icon: CheckCircle2, label: "Sukses" },
  already_granted:    { bg: "bg-blue-100",    text: "text-blue-800",    icon: CheckCircle2, label: "Sudah Punya Akses" },
  user_not_found:     { bg: "bg-orange-100",  text: "text-orange-800",  icon: UserX,        label: "User Belum Daftar" },
  unknown_uuid:       { bg: "bg-yellow-100",  text: "text-yellow-800",  icon: FileX,        label: "Paket Tidak Dikenali" },
  invalid_signature:  { bg: "bg-red-100",     text: "text-red-800",     icon: Key,          label: "Signature Invalid" },
  invalid_payload:    { bg: "bg-red-100",     text: "text-red-800",     icon: AlertTriangle, label: "Payload Invalid" },
  ignored_event:      { bg: "bg-gray-100",    text: "text-gray-700",    icon: XCircle,      label: "Event Diabaikan" },
  ignored_action:     { bg: "bg-gray-100",    text: "text-gray-700",    icon: XCircle,      label: "Aksi Bukan Sukses" },
  error:              { bg: "bg-red-100",     text: "text-red-800",     icon: AlertTriangle, label: "Error" },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const WebhookLogsPanel = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Manual grant form state
  const [grantEmail, setGrantEmail] = useState("");
  const [grantExamId, setGrantExamId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [granting, setGranting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lynk_webhook_logs")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Gagal memuat log: " + error.message);
    setLogs((data ?? []) as WebhookLog[]);

    const { data: exData } = await supabase
      .from("exams")
      .select("id,title,price")
      .is("parent_exam_id" as any, null)
      .order("price", { ascending: false });
    setExams(((exData ?? []) as any[]).map((e) => ({ id: e.id, title: e.title, price: e.price ?? 0 })));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === "all" ? logs : logs.filter((l) => l.status === statusFilter);

  const toggle = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const handleGrant = async (emailOverride?: string, examOverride?: string, amountOverride?: number | null, logId?: string) => {
    const email = (emailOverride ?? grantEmail).trim();
    const examId = examOverride ?? grantExamId;
    const amount = amountOverride !== undefined ? amountOverride : (grantAmount ? Number(grantAmount) : null);

    if (!email || !examId) {
      toast.error("Email dan paket wajib diisi");
      return;
    }

    setGranting(true);
    const { data, error } = await (supabase as any).rpc("admin_grant_exam_access", {
      _email: email, _exam_id: examId, _amount: amount,
    });
    setGranting(false);

    if (error) { toast.error("Gagal: " + error.message); return; }
    if (!data?.success) { toast.error(data?.message ?? "Gagal grant akses"); return; }

    const grantedCount = (data.granted_exam_ids ?? []).length;
    const skippedCount = (data.already_had_access ?? []).length;
    toast.success(`Akses diberikan: ${grantedCount} paket baru, ${skippedCount} sudah punya akses.`);

    if (logId) {
      await (supabase as any).rpc("admin_resolve_webhook_log", {
        _log_id: logId, _note: `Granted manually to ${email}`,
      });
    }

    if (!emailOverride) {
      setGrantEmail(""); setGrantExamId(""); setGrantAmount("");
    }
    load();
  };

  const handleResolve = async (logId: string) => {
    const { error } = await (supabase as any).rpc("admin_resolve_webhook_log", {
      _log_id: logId, _note: "Marked resolved by admin",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Log ditandai selesai");
    load();
  };

  const counts = logs.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unresolvedFailures = logs.filter(
    (l) => !l.resolved && ["user_not_found", "unknown_uuid", "invalid_signature", "invalid_payload", "error"].includes(l.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Webhook</p>
            <p className="mt-1 text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sukses</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{(counts.success ?? 0) + (counts.already_granted ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Perlu Tindakan</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{unresolvedFailures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">User Belum Daftar</p>
            <p className="mt-1 text-2xl font-bold text-yellow-700">{counts.user_not_found ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Grant */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Grant Akses Manual</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Gunakan ini ketika user sudah bayar tapi akses belum muncul (mis. email Lynk berbeda dengan email pendaftaran, atau user daftar setelah bayar). Sistem akan membuat purchase row untuk paket + semua paket anak (bundle).
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs">Email User (terdaftar)</Label>
              <Input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Paket</Label>
              <Select value={grantExamId} onValueChange={setGrantExamId}>
                <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title} {e.price > 0 ? `· Rp${e.price.toLocaleString("id-ID")}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nominal (opsional)</Label>
              <Input value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} type="number" placeholder="0" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => handleGrant()} disabled={granting} className="rounded-full gap-2">
                <Gift className="h-4 w-4" /> Grant Akses
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook logs */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Riwayat Webhook Lynk</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(STATUS_STYLE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} ({counts[k] ?? 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={load} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {logs.length === 0
                ? "Belum ada webhook tercatat. Setiap kali Lynk mengirim notifikasi pembayaran, akan masuk di sini."
                : "Tidak ada log untuk filter ini."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold">Waktu</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Email Pembeli</th>
                    <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                    <th className="px-3 py-2 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const style = STATUS_STYLE[log.status] ?? STATUS_STYLE.error;
                    const Icon = style.icon;
                    const isExpanded = expanded.has(log.id);
                    const canRetry = ["user_not_found", "unknown_uuid", "error"].includes(log.status) && !log.resolved && log.buyer_email;
                    return (
                      <>
                        <tr key={log.id} className={cn("border-b last:border-0", log.resolved && "opacity-60")}>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmt(log.received_at)}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", style.bg, style.text)}>
                              <Icon className="h-3 w-3" /> {style.label}
                            </span>
                            {log.resolved && <span className="ml-2 text-[10px] text-green-600 font-semibold">✓ resolved</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">{log.buyer_email ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            {log.amount ? `Rp ${log.amount.toLocaleString("id-ID")}` : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              {canRetry && log.exam_id && (
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                                  onClick={() => handleGrant(log.buyer_email!, log.exam_id!, log.amount ?? null, log.id)}>
                                  <Gift className="h-3 w-3" /> Grant
                                </Button>
                              )}
                              {!log.resolved && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => handleResolve(log.id)}>
                                  Tandai Selesai
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(log.id)}>
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b last:border-0 bg-muted/20">
                            <td colSpan={5} className="px-4 py-3 space-y-2">
                              <div className="grid gap-2 text-xs sm:grid-cols-2">
                                <div><span className="font-semibold">HTTP:</span> {log.http_status}</div>
                                <div><span className="font-semibold">Lynk UUID:</span> <span className="font-mono">{log.lynk_uuid ?? "—"}</span></div>
                                <div className="sm:col-span-2"><span className="font-semibold">Exam ID:</span> <span className="font-mono">{log.exam_id ?? "—"}</span></div>
                                {log.error && (
                                  <div className="sm:col-span-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-red-800">
                                    <span className="font-semibold">Error:</span> {log.error}
                                  </div>
                                )}
                                {log.resolved_note && (
                                  <div className="sm:col-span-2 rounded bg-green-50 border border-green-200 px-3 py-2 text-green-800">
                                    <span className="font-semibold">Catatan resolve:</span> {log.resolved_note}
                                  </div>
                                )}
                              </div>
                              <details className="text-xs">
                                <summary className="cursor-pointer font-semibold text-muted-foreground">Raw payload</summary>
                                <pre className="mt-2 max-h-64 overflow-auto rounded bg-background border p-2 font-mono text-[10px]">
                                  {JSON.stringify(log.raw_payload, null, 2)}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
