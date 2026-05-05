import { Card, CardContent } from "@/components/ui/card";
import { Timer, BookOpen, Trophy, BarChart3 } from "lucide-react";

const features = [
  { icon: Timer, title: "Timer Otomatis", desc: "Hitung mundur sinkron dengan server. Status ujian otomatis selesai saat waktu habis." },
  { icon: BookOpen, title: "Bank Soal Lengkap", desc: "Ribuan soal terkurasi dari berbagai kategori ujian dengan pembahasan detail." },
  { icon: Trophy, title: "Leaderboard Real-time", desc: "Lihat peringkatmu secara langsung dan bersaing dengan siswa di seluruh Indonesia." },
  { icon: BarChart3, title: "Statistik Skor Pribadi", desc: "Pantau perkembangan skormu dari waktu ke waktu lewat dashboard analitik." },
];

export const Features = () => {
  return (
    <section id="fitur" className="container py-20 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Semua yang kamu butuhkan</h2>
        <p className="mt-4 text-muted-foreground">Fitur lengkap untuk pengalaman tryout terbaik dan persiapan ujian yang efektif.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
