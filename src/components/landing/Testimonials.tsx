import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const items = [
  { name: "Aulia Rahmawati", role: "Siswa SMA, lolos UI", quote: "Latihan soalnya mirip banget dengan ujian asli. Skor UTBK saya naik 120 poin!", initials: "AR" },
  { name: "Budi Santoso", role: "Mahasiswa, lolos CPNS", quote: "Leaderboard-nya bikin saya semangat belajar setiap hari. Pembahasannya juga jelas.", initials: "BS" },
  { name: "Citra Lestari", role: "Siswa SMA, lolos ITB", quote: "Dashboard statistiknya membantu saya tahu materi mana yang masih lemah. Recommended!", initials: "CL" },
];

export const Testimonials = () => {
  return (
    <section id="testimoni" className="container py-20 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Dipercaya ribuan siswa</h2>
        <p className="mt-4 text-muted-foreground">Cerita nyata dari mereka yang sudah lolos ujian impian.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <Card key={t.name} className="border-border/60">
            <CardContent className="pt-6">
              <div className="mb-3 flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
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
        ))}
      </div>
    </section>
  );
};
