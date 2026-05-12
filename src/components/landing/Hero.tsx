import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroTeam from "@/assets/hero-team.webp";

export const Hero = () => {
  return (
    <section id="beranda" className="relative overflow-hidden" aria-label="Beranda Ruang CASN" style={{ background: "var(--gradient-hero)" }}>
      <div className="container grid gap-8 py-12 md:py-20 lg:grid-cols-2 lg:items-center lg:gap-12">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
          }}
          className="flex flex-col gap-5"
        >
          <motion.span
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Bank Soal Resmi 10+ Tahun Ujian CPNS &amp; PPPK
          </motion.span>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Lulus CPNS &amp; PPPK 2026{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Bukan Lagi Mimpi.
            </span>{" "}
            Ini Senjatanya.
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Tryout berbasis <strong className="text-foreground">soal asli ujian bertahun-tahun</strong> + sistem CAT real-time persis aslinya.
            Faktanya, <strong className="text-primary">73% pengguna Ruang CASN mencapai skor tinggi</strong> dan tembus passing grade di percobaan pertama.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" asChild>
              <a href="#available-paket" aria-label="Lihat paket tryout CPNS PPPK">
                Ambil Paketnya Sekarang <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#fitur" aria-label="Lihat fitur platform Ruang CASN">Lihat Fitur</a>
            </Button>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> 10.000+ Alumni Lulus
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> 5.000+ Soal Asli
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Akurasi Prediksi 92%
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-primary-glow/10 blur-2xl" aria-hidden="true" />
          <img
            src={heroTeam}
            alt="Peserta tryout online CPNS PPPK 2026 menggunakan platform Ruang CASN di laptop"
            className="relative h-auto w-full rounded-2xl"
            loading="eager"
            width="640"
            height="480"
          />
        </motion.div>
      </div>
    </section>
  );
};
