import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroTeam from "@/assets/hero-team.webp";

export const Hero = () => {
  return (
    <section id="beranda" className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="container grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            🔥 Bank Soal Resmi 10+ Tahun Ujian CPNS & PPPK
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Lulus CPNS & PPPK{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Bukan Lagi Mimpi.
            </span>{" "}
            Ini Senjatanya.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Tryout berbasis <strong className="text-foreground">soal asli ujian bertahun-tahun</strong> + sistem CAT real-time persis aslinya.
            Faktanya, <strong className="text-primary">73% pengguna TryoutPro mencapai skor tinggi</strong> dan tembus passing grade di percobaan pertama.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#paket">
                Ambil Paketnya Sekarang <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#fitur">Lihat Fitur</a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 10.000+ Alumni Lulus
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 5.000+ Soal Asli
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Akurasi Prediksi 92%
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
