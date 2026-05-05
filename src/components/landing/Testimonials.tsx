import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  {
    name: "Rina Marlina",
    role: "Lulus CPNS Kemenkeu 2025",
    quote: "Soal-soalnya 80% mirip ujian asli. Saya tembus passing grade di percobaan pertama. Investasi terbaik tahun ini!",
    initials: "RM",
  },
  {
    name: "Ahmad Fauzi",
    role: "Lulus PPPK Guru 2025",
    quote: "Latihan CAT-nya bikin saya nggak grogi pas ujian beneran. Bank soalnya update terus. Worth every rupiah.",
    initials: "AF",
  },
  {
    name: "Siti Nurhaliza",
    role: "Lulus BUMN Pertamina 2025",
    quote: "Pembahasannya super detail. Dari yang awalnya pesimis berkali-kali gagal, sekarang sudah jadi pegawai BUMN.",
    initials: "SN",
  },
];

export const Testimonials = () => {
  return (
    <section id="testimoni" className="container py-16 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Dipercaya Ribuan Orang</h2>
        <p className="mt-4 text-muted-foreground">Cerita nyata alumni yang berhasil lulus ujian impian mereka.</p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full border-border/60 transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-3 flex gap-0.5 text-primary" aria-label="5 dari 5 bintang">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">{t.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

