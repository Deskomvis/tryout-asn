import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

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
    <section id="testimoni" className="container py-20 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Dipercaya Ribuan Orang</h2>
        <p className="mt-4 text-muted-foreground">Cerita nyata alumni yang berhasil lulus ujian impian mereka.</p>
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
