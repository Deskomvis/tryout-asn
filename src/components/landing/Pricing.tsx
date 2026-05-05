import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_WA = "6281234567890";

const packages = [
  {
    name: "Tryout CAT",
    price: "99.000",
    desc: "Simulasi ujian persis aslinya berbasis CAT.",
    features: [
      "Latihan Soal CAT",
      "Hasil dan Pembahasan Lengkap",
      "Berlatih Manajemen Waktu",
      "Akses Belajar Fleksibel",
      "Tampilan Simpel & Mudah Digunakan",
      "Akses Smartphone, Laptop & Komputer",
      "Full Akses 6 Bulan",
    ],
    popular: true,
  },
  {
    name: "Ebook Soal PDF",
    price: "129.000",
    desc: "Bank soal lengkap dalam format PDF, bisa dicetak.",
    features: [
      "Latihan Soal CAT",
      "Hasil dan Pembahasan",
      "Akses Smartphone, Laptop & Komputer",
      "Full Akses 6 Bulan",
      "PDF Bisa di Print",
      "Soal UPDATE dan HOTS",
      "Bisa di Download",
    ],
    popular: false,
  },
];

const buyLink = (pkg: string) =>
  `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
    `Halo Admin, saya ingin memesan layanan ${pkg}.`
  )}`;

export const Pricing = () => {
  return (
    <section id="paket" className="bg-secondary/40 py-20 md:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Pilih Paket Terbaik
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Pilih Paket Terbaik Untuk Anda
          </h2>
          <p className="mt-4 text-muted-foreground">
            Kami menyediakan pilihan paket layanan yang dapat Anda sesuaikan dengan kebutuhan Anda.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {packages.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card
                className={`relative flex h-full flex-col border-border/60 transition-shadow hover:shadow-xl ${
                  p.popular ? "border-primary shadow-xl" : ""
                }`}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Paling Populer</Badge>
                )}
                <CardHeader className="pb-4">
                  <span className="w-fit rounded-lg bg-accent px-4 py-2 text-base font-bold text-accent-foreground">
                    {p.name}
                  </span>
                  <p className="pt-2 text-sm text-muted-foreground">{p.desc}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mb-4 text-center">
                    <span className="text-sm text-muted-foreground">Mulai </span>
                    <span className="text-3xl font-bold tracking-tight">Rp{p.price}</span>
                  </div>
                  <Button asChild className="w-full" size="lg">
                    <a href={buyLink(p.name)} target="_blank" rel="noopener noreferrer">
                      Pesan Layanan
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
