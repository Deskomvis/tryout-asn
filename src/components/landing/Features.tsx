import { Card, CardContent } from "@/components/ui/card";
import { Timer, BookOpen, Trophy, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Timer, title: "Timer Otomatis", desc: "Hitung mundur sinkron dengan server. Status ujian otomatis selesai saat waktu habis." },
  { icon: BookOpen, title: "Bank Soal Lengkap", desc: "Ribuan soal terkurasi dari berbagai kategori ujian dengan pembahasan detail." },
  { icon: Trophy, title: "Leaderboard Real-time", desc: "Lihat peringkatmu secara langsung dan bersaing dengan peserta di seluruh Indonesia." },
  { icon: BarChart3, title: "Statistik Skor Pribadi", desc: "Pantau perkembangan skormu dari waktu ke waktu lewat dashboard analitik." },
];

export const Features = () => {
  return (
    <section id="fitur" className="container py-16 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Semua yang kamu butuhkan</h2>
        <p className="mt-4 text-muted-foreground">Fitur lengkap untuk pengalaman tryout terbaik dan persiapan ujian yang efektif.</p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <Card className="h-full border-border/60 transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary">
                  <f.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
