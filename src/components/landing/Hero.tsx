import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroTeam from "@/assets/hero-team.webp";

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
          <img
            src={heroTeam}
            alt="Tim siswa Indonesia siap menghadapi tryout online"
            className="relative w-full h-auto"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
};
