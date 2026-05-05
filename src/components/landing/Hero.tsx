import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Trophy, Timer, BookOpen } from "lucide-react";

export const Hero = () => {
  return (
    <section id="beranda" className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="container grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Platform Tryout #1 di Indonesia
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Persiapan Ujian Lebih Mudah dengan{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Tryout Online
            </span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Latihan soal real-time, simulasi ujian dengan timer otomatis, dan ranking nasional. Tingkatkan skormu bersama ribuan siswa lainnya.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#paket">
                Mulai Tryout <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#fitur">Lihat Fitur</a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 10.000+ Siswa
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 500+ Soal
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 50+ Paket Tryout
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-primary-glow/10 blur-2xl" />
          <div
            className="relative rounded-2xl border border-border/60 bg-card p-6"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground">Tryout UTBK 2026</p>
                <p className="font-semibold">Tes Potensi Skolastik</p>
              </div>
              <div className="rounded-lg bg-primary px-3 py-1.5 font-mono text-sm font-bold text-primary-foreground">
                01:24:36
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Timer, label: "Timer Otomatis", value: "Sinkron Real-time" },
                { icon: BookOpen, label: "Bank Soal", value: "500+ Pertanyaan" },
                { icon: Trophy, label: "Leaderboard", value: "Peringkat #128" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
