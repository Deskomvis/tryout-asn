import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroTeam from "@/assets/hero-team.webp";

export const Hero = () => {
  return (
    <section id="beranda" className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
          }}
          className="flex flex-col gap-6"
        >
          <motion.span
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Bank Soal Resmi 10+ Tahun Ujian CPNS &amp; PPPK
          </motion.span>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
          >
            Lulus CPNS &amp; PPPK{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Bukan Lagi Mimpi.
            </span>{" "}
            Ini Senjatanya.
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="max-w-xl text-lg text-muted-foreground"
          >
            Tryout berbasis <strong className="text-foreground">soal asli ujian bertahun-tahun</strong> + sistem CAT real-time persis aslinya.
            Faktanya, <strong className="text-primary">73% pengguna Ruang CASN mencapai skor tinggi</strong> dan tembus passing grade di percobaan pertama.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" asChild>
              <a href="#paket">
                Ambil Paketnya Sekarang <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#fitur">Lihat Fitur</a>
            </Button>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> 10.000+ Alumni Lulus
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> 5.000+ Soal Asli
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> Akurasi Prediksi 92%
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-primary-glow/10 blur-2xl" />
          <img
            src={heroTeam}
            alt="Tim profesional Indonesia siap menghadapi tryout online"
            className="relative h-auto w-full"
            loading="eager"
          />
        </motion.div>
      </div>
    </section>
  );
};
