import { Check, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  "1 Paket Tryout 110 soal (TWK, TIU, TKP) SKD CPNS Kisi-kisi 2026",
  "Passing Grade 311, Tryout Sesuai Aturan Baru",
  "Tampilan mirip CAT asli BKN",
  "Soal HOTS terbaru",
  "Pembahasan Tryout",
  "Materi belajar Eksklusif",
  "Video Pembelajaran",
  "Ebook Pembelajaran",
  "Statistik perkembangan nilai",
  "Pengerjaan Soal Berulang",
  "Drilling Soal",
];

const plans = [
  {
    name: "Paket Gratis",
    price: "Rp 0",
    priceNote: "Selamanya gratis",
    highlight: false,
    badge: null,
    cta: "Mulai Gratis",
    ctaLink: "/beli-paket?category=CPNS",
    included: [true, true, true, false, false, false, false, false, false, false, false],
    featureLabels: [
      "1 Paket Tryout 110 soal (TWK, TIU, TKP) SKD CPNS Kisi-kisi 2026",
      "Passing Grade 311, Tryout Sesuai Aturan Baru",
      "Tampilan mirip CAT asli BKN",
      "Soal HOTS terbaru",
      "Pembahasan Tryout",
      "Materi belajar Eksklusif",
      "Video Pembelajaran",
      "Ebook Pembelajaran",
      "Statistik perkembangan nilai",
      "Pengerjaan Soal Berulang",
      "Drilling Soal",
    ],
  },
  {
    name: "Paket Premium",
    price: "Rp 75.000",
    priceNote: "10 paket tryout · 1.100 soal",
    highlight: true,
    badge: "Terpopuler",
    cta: "Pilih Premium",
    ctaLink: "/beli-paket?category=CPNS",
    included: [true, true, true, true, true, true, true, true, true, true, false],
    featureLabels: [
      "10 Paket Tryout 110 soal/paket · total 1.100 soal (TWK, TIU, TKP) SKD CPNS Kisi-kisi 2026",
      "Passing Grade 311, Tryout Sesuai Aturan Baru",
      "Tampilan mirip CAT asli BKN",
      "Soal HOTS terbaru",
      "Pembahasan Tryout",
      "Materi belajar Eksklusif",
      "Video Pembelajaran",
      "Ebook Pembelajaran",
      "Statistik perkembangan nilai",
      "Pengerjaan Soal Berulang",
      "Drilling Soal",
    ],
  },
  {
    name: "Paket Platinum",
    price: "Rp 125.000",
    priceNote: "20 paket tryout · 2.200 soal",
    highlight: false,
    badge: "Terlengkap",
    cta: "Pilih Platinum",
    ctaLink: "/beli-paket?category=CPNS",
    included: [true, true, true, true, true, true, true, true, true, true, true],
    featureLabels: [
      "20 Paket Tryout 110 soal/paket · total 2.200 soal (TWK, TIU, TKP) SKD CPNS Kisi-kisi 2026",
      "Passing Grade 311, Tryout Sesuai Aturan Baru",
      "Tampilan mirip CAT asli BKN",
      "Soal HOTS terbaru",
      "Pembahasan Tryout",
      "Materi belajar Eksklusif",
      "Video Pembelajaran",
      "Ebook Pembelajaran",
      "Statistik perkembangan nilai",
      "Pengerjaan Soal Berulang",
      "Drilling Soal",
    ],
  },
];

export const PricingSection = () => {
  return (
    <section id="harga" className="py-20 bg-background">
      <div className="container px-4 md:px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground tracking-wide uppercase">
            Harga Paket
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Pilih Paket{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              SKD CPNS
            </span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-muted-foreground">
            Mulai gratis, upgrade kapan saja. Semua paket menggunakan sistem CAT mirip ujian BKN asli.
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`relative flex flex-col rounded-3xl border p-7 shadow-sm transition-shadow hover:shadow-lg ${
                plan.highlight
                  ? "border-primary bg-primary text-primary-foreground shadow-primary/20 shadow-xl scale-[1.03]"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest shadow ${
                    plan.highlight
                      ? "bg-white text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Zap className="h-2.5 w-2.5" />
                  {plan.badge}
                </span>
              )}

              {/* Plan name & price */}
              <div className="mb-6">
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.name}
                </p>
                <p className="text-3xl font-black">{plan.price}</p>
                <p className={`mt-1 text-xs ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.priceNote}
                </p>
              </div>

              {/* Feature list */}
              <ul className="mb-8 space-y-3 flex-1">
                {plan.featureLabels.map((label, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 text-sm">
                    {plan.included[fi] ? (
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-white" : "text-primary"}`}
                      />
                    ) : (
                      <X
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground/40"}`}
                      />
                    )}
                    <span
                      className={
                        plan.included[fi]
                          ? plan.highlight ? "text-primary-foreground" : "text-foreground"
                          : plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground/50"
                      }
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                to={plan.ctaLink}
                className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
                  plan.highlight
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
