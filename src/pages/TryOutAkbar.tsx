import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar, Clock, Users, ExternalLink, CheckCircle2,
  AlertCircle, PlayCircle, Loader2
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AkbarEvent = {
  id: string;
  title: string;
  description: string | null;
  max_quota: number;
  price: number;
  cta_link: string | null;
  registration_start: string | null;
  registration_end: string | null;
  exam_start: string | null;
  exam_end: string | null;
  exam_id: string | null;
  status: string;
  banner_url: string | null;
};

type Registration = {
  id: string;
  event_id: string;
  payment_status: string;
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<string>("");
  useEffect(() => {
    if (!target) { setRemaining(""); return; }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Dimulai"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${d > 0 ? `${d}h ` : ""}${h}j ${m}m ${s}d`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

const EventCard = ({
  event,
  registrationCount,
  myReg,
  onConfirm,
}: {
  event: AkbarEvent;
  registrationCount: number;
  myReg: Registration | undefined;
  onConfirm: (eventId: string) => void;
}) => {
  const countdown = useCountdown(event.exam_start);
  const now = Date.now();
  const regOpen = event.registration_start && event.registration_end
    ? now >= new Date(event.registration_start).getTime() && now <= new Date(event.registration_end).getTime()
    : false;
  const examStarted = event.exam_start ? now >= new Date(event.exam_start).getTime() : false;
  const examEnded = event.exam_end ? now >= new Date(event.exam_end).getTime() : false;
  const quotaFull = registrationCount >= event.max_quota;

  const statusLabel =
    event.status === "registration_open" ? "Pendaftaran Dibuka"
    : event.status === "ongoing" ? "Simulasi Berlangsung"
    : event.status === "completed" ? "Selesai"
    : "Segera Hadir";

  const statusClass =
    event.status === "registration_open"
      ? "bg-green-500 text-white"
      : event.status === "ongoing"
      ? "bg-blue-500 text-white"
      : event.status === "completed"
      ? "bg-gray-500 text-white"
      : "bg-yellow-400 text-yellow-900";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="overflow-hidden border-primary/20">
        {/* Banner with status badge overlay */}
        {event.banner_url ? (
          <div className="relative w-full overflow-hidden">
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full object-cover max-h-56 md:max-h-72"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Status badge — top-right */}
            <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow ${statusClass}`}>
              {statusLabel}
            </span>
            {/* Title overlay at bottom of banner */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 pt-8">
              <h2 className="text-xl font-bold text-white drop-shadow md:text-2xl">{event.title}</h2>
              {event.description && (
                <p className="mt-0.5 text-sm text-white/80">{event.description}</p>
              )}
            </div>
          </div>
        ) : (
          /* No banner: show title + badge in card header */
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-0 md:px-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">{event.title}</h2>
              {event.description && (
                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        )}

        <CardContent className="space-y-5 p-6 md:p-8">
          <hr className="border-border" />

          {/* Info grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Periode Daftar</p>
                <p className="text-sm font-medium">{fmt(event.registration_start)}</p>
                <p className="text-xs text-muted-foreground">s/d {fmt(event.registration_end)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Waktu Simulasi</p>
                <p className="text-sm font-medium">{fmt(event.exam_start)}</p>
                {!examStarted && countdown && (
                  <p className="text-xs text-primary font-medium">Mulai dalam {countdown}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Kuota</p>
                <p className="text-sm font-medium">
                  {registrationCount.toLocaleString("id-ID")} / {event.max_quota.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground">peserta terdaftar</p>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Price + CTA */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Biaya Pendaftaran</p>
              <p className="text-2xl font-bold text-foreground">
                Rp {event.price.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Registered + confirmed → show exam button when started */}
              {myReg?.payment_status === "confirmed" && examStarted && !examEnded && event.exam_id && (
                <Button asChild className="gap-2 rounded-full">
                  <Link to={`/exam/${event.exam_id}`}>
                    <PlayCircle className="h-4 w-4" /> Mulai Simulasi
                  </Link>
                </Button>
              )}

              {/* Registered (pending or confirmed) — show status badge */}
              {myReg && !(myReg.payment_status === "confirmed" && examStarted && !examEnded && event.exam_id) && (
                <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  myReg.payment_status === "confirmed"
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-yellow-300 bg-yellow-50 text-yellow-800"
                }`}>
                  {myReg.payment_status === "confirmed" ? (
                    <><CheckCircle2 className="h-4 w-4" /> Sudah Terdaftar</>
                  ) : (
                    <><AlertCircle className="h-4 w-4" /> Menunggu Konfirmasi Admin</>
                  )}
                </div>
              )}

              {/* Not registered yet */}
              {!myReg && (
                <>
                  {event.cta_link && regOpen && !quotaFull && (
                    <Button asChild variant="outline" className="gap-2 rounded-full">
                      <a href={event.cta_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> Bayar di Lynk.id
                      </a>
                    </Button>
                  )}
                  {regOpen && !quotaFull && (
                    <Button
                      className="rounded-full"
                      onClick={() => onConfirm(event.id)}
                    >
                      Konfirmasi Pembayaran
                    </Button>
                  )}
                  {quotaFull && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm border-red-300 text-red-700">
                      Kuota Penuh
                    </Badge>
                  )}
                  {!regOpen && !quotaFull && event.status !== "ongoing" && event.status !== "completed" && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm">
                      Pendaftaran Belum Dibuka
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TryOutAkbar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AkbarEvent[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [myRegs, setMyRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: evData } = await (supabase as any)
      .from("tryout_akbar_events")
      .select("*")
      .in("status", ["registration_open", "ongoing", "completed", "upcoming"])
      .order("exam_start");
    setEvents(evData ?? []);

    // Count confirmed registrations per event
    if (evData?.length) {
      const ids = evData.map((e: AkbarEvent) => e.id);
      const { data: counts } = await (supabase as any)
        .from("tryout_akbar_registrations")
        .select("event_id")
        .in("event_id", ids)
        .eq("payment_status", "confirmed");
      const map: Record<string, number> = {};
      (counts ?? []).forEach((r: { event_id: string }) => {
        map[r.event_id] = (map[r.event_id] ?? 0) + 1;
      });
      setRegCounts(map);
    }

    if (user) {
      const { data: myData } = await (supabase as any)
        .from("tryout_akbar_registrations")
        .select("id, event_id, payment_status")
        .eq("user_id", user.id);
      setMyRegs(myData ?? []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (eventId: string) => {
    if (!user) { toast.error("Login terlebih dahulu."); return; }
    setConfirming(eventId);
    const { error } = await (supabase as any)
      .from("tryout_akbar_registrations")
      .insert({ event_id: eventId, user_id: user.id, payment_status: "pending" });
    setConfirming(null);
    if (error) {
      if (error.code === "23505") {
        toast.info("Kamu sudah mengirim konfirmasi sebelumnya. Tunggu verifikasi admin.");
      } else {
        toast.error("Gagal: " + error.message);
      }
    } else {
      toast.success("Konfirmasi terkirim! Admin akan memverifikasi pembayaran kamu.");
      load();
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Tryout Akbar" breadcrumbs={[{ label: "Tryout Akbar" }]} />

      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <strong>Simulasi Nasional Serentak.</strong> Daftar, bayar pendaftaran, lalu klik "Konfirmasi Pembayaran" setelah transfer. Admin akan memverifikasi dan mengaktifkan aksesmu.
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Belum ada event Tryout Akbar yang tersedia. Pantau terus!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                registrationCount={regCounts[ev.id] ?? 0}
                myReg={myRegs.find((r) => r.event_id === ev.id)}
                onConfirm={confirming ? () => {} : handleConfirm}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TryOutAkbar;
