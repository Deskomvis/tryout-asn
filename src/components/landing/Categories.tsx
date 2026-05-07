import { Briefcase, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { icon: Briefcase, label: "CPNS" },
  { icon: HeartHandshake, label: "PPPK" },
];

export const Categories = () => {
  return (
    <section id="kategori" className="border-y border-border bg-secondary/40 py-16 md:py-20">
      <div className="container">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Kategori Tryout
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Semua Jenis Ujian.{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Satu Platform.
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pilih kategori sesuai targetmu — soal disusun dari arsip ujian resmi bertahun-tahun.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {categories.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="w-full rounded-lg bg-primary px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

