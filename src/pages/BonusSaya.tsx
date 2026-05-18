import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, FileText, Video, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface BonusItem {
  title: string;
  description: string;
  link: string;
  sourceExam: string;
}

interface ParsedLink {
  label: string;
  url: string;
}

export default function BonusSaya() {
  const [loading, setLoading] = useState(true);
  const [bonuses, setBonuses] = useState<BonusItem[]>([]);

  useEffect(() => {
    const fetchBonuses = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's purchased exams
        const { data: purchases, error } = await supabase
          .from("exam_purchases")
          .select(`
            exams (
              id,
              title,
              parent_exam_id,
              bonus_title,
              bonus_description,
              bonus_link
            )
          `);

        if (error) throw error;

        const directExams = (purchases
          ?.map(p => p.exams)
          .filter(Boolean) || []) as any[];

        const parentIds = directExams
          .map(e => e.parent_exam_id)
          .filter(Boolean) as string[];

        // Fetch parent exams to check if there are bonuses at the bundle level
        let parentExamsMap: Record<string, any> = {};
        if (parentIds.length > 0) {
          const { data: parents } = await supabase
            .from("exams")
            .select("id, title, bonus_title, bonus_description, bonus_link")
            .in("id", parentIds);
          if (parents) {
            parents.forEach(p => {
              parentExamsMap[p.id] = p;
            });
          }
        }

        // Aggregate and deduplicate unique bonuses
        const uniqueBonusesMap: Record<string, BonusItem> = {};

        directExams.forEach(exam => {
          // Direct bonus check
          if (exam.bonus_link && exam.bonus_link.trim() !== "") {
            const key = `${exam.bonus_link.trim()}_${(exam.bonus_title || "").trim()}`;
            uniqueBonusesMap[key] = {
              title: exam.bonus_title?.trim() || "Bonus Pembelian",
              description: exam.bonus_description?.trim() || "Akses materi premium hasil pembelian Anda.",
              link: exam.bonus_link,
              sourceExam: exam.title,
            };
          }
          // Parent/Bundle bonus check
          if (exam.parent_exam_id && parentExamsMap[exam.parent_exam_id]) {
            const parent = parentExamsMap[exam.parent_exam_id];
            if (parent.bonus_link && parent.bonus_link.trim() !== "") {
              const key = `${parent.bonus_link.trim()}_${(parent.bonus_title || "").trim()}`;
              uniqueBonusesMap[key] = {
                title: parent.bonus_title?.trim() || "Bonus Pembelian",
                description: parent.bonus_description?.trim() || "Akses materi premium hasil pembelian Anda.",
                link: parent.bonus_link,
                sourceExam: parent.title,
              };
            }
          }
        });

        setBonuses(Object.values(uniqueBonusesMap));
      } catch (err) {
        console.error("Error fetching bonuses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBonuses();
  }, []);

  const parseBonusLinks = (bonusLinkStr: string | null | undefined): ParsedLink[] => {
    if (!bonusLinkStr) return [];
    const trimmed = bonusLinkStr.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            if (typeof item === 'string') {
              return { label: 'Akses Materi', url: item };
            }
            return {
              label: item.label || 'Akses Link',
              url: item.url || '#'
            };
          });
        } else if (parsed && typeof parsed === 'object') {
          return [{
            label: parsed.label || 'Akses Link',
            url: parsed.url || '#'
          }];
        }
      } catch (e) {
        // Parse error fallback
      }
    }
    // Single URL legacy string fallback
    return [{ label: 'Buka Link Bonus', url: trimmed }];
  };

  const getLinkIcon = (label: string) => {
    const low = label.toLowerCase();
    if (low.includes("video") || low.includes("nonton") || low.includes("youtube") || low.includes("mp4") || low.includes("pembelajaran") || low.includes("rekaman")) {
      return Video;
    }
    if (low.includes("pdf") || low.includes("materi") || low.includes("ebook") || low.includes("buku") || low.includes("dokumen") || low.includes("drive") || low.includes("soal")) {
      return FileText;
    }
    return ExternalLink;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/95 to-primary-glow/90 p-6 text-primary-foreground shadow-lg md:p-8">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-15">
            <Gift className="h-64 w-64" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Gift className="h-3.5 w-3.5" /> Bonus Eksklusif Untuk Anda
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bonus &amp; Materi Tambahan Saya</h1>
            <p className="text-sm text-primary-foreground/90 leading-relaxed md:text-base">
              Akses semua materi pembelajaran, video kupas tuntas, ebook materi SKD, dan file Google Drive bonus eksklusif yang Anda dapatkan dari pembelian paket tryout.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat data bonus Anda...</p>
          </div>
        ) : bonuses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {bonuses.map((bonus, idx) => {
              const links = parseBonusLinks(bonus.link);
              return (
                <Card key={idx} className="relative overflow-hidden border-border/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                  <div className="absolute -right-4 -top-4 text-primary/5">
                    <Gift className="h-24 w-24" />
                  </div>
                  
                  <CardHeader className="pb-3 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                        <Gift className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-primary/5 text-primary border border-primary/15">
                        Dapat Bonus
                      </Badge>
                    </div>
                    <div className="space-y-1 mt-3">
                      <h3 className="font-semibold text-base leading-snug text-foreground">{bonus.title}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Diperoleh dari: <span className="font-medium text-foreground">{bonus.sourceExam}</span>
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0 relative z-10">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {bonus.description}
                    </p>

                    <div className="pt-4 border-t border-border/60">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Tautan Bonus Google Drive ({links.length}):
                      </p>
                      <div className="grid gap-2">
                        {links.map((lnk, lIdx) => {
                          const IconComp = getLinkIcon(lnk.label);
                          return (
                            <a
                              key={lIdx}
                              href={lnk.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 rounded-lg border border-primary/10 bg-primary/[0.02] hover:bg-primary/[0.06] hover:border-primary/20 p-2.5 text-xs text-primary font-medium transition-all group shadow-sm hover:shadow"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <IconComp className="h-4 w-4 shrink-0 text-primary/80 group-hover:scale-110 transition-transform" />
                                <span className="truncate pr-2">{lnk.label}</span>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed py-12 text-center flex flex-col items-center justify-center p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-5 text-primary animate-pulse">
              <Gift className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-base font-semibold">Belum Ada Bonus</h3>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
              Anda belum memiliki bonus aktif. Silakan beli paket tryout premium kami yang dilengkapi dengan bonus materi eksklusif dan video pembelajaran!
            </p>
            <Link to="/beli-paket" className="mt-5">
              <Button size="sm" className="gap-2 rounded-full shadow-md">
                Beli Paket Tryout <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
