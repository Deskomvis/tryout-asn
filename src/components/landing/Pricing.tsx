import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const ADMIN_WA = "6281234567890";

const packages = [
  {
    name: "Paket Basic",
    price: "49.000",
    desc: "Cocok untuk pemula yang ingin mencoba.",
    features: ["5 Tryout Lengkap", "Durasi 90 menit / tryout", "Pembahasan Tertulis", "Akses 30 hari"],
    popular: false,
  },
  {
    name: "Paket Premium",
    price: "99.000",
    desc: "Pilihan terbaik untuk persiapan serius.",
    features: ["15 Tryout Lengkap", "Video Pembahasan", "Akses Leaderboard", "Statistik Skor Detail", "Akses 90 hari"],
    popular: true,
  },
  {
    name: "Paket Ultimate",
    price: "199.000",
    desc: "Untuk yang menargetkan skor tertinggi.",
    features: ["Tryout Unlimited", "Sesi Mentoring 1-on-1", "Garansi Skor Naik", "Prioritas Support", "Akses 1 tahun"],
    popular: false,
  },
];

const buyLink = (pkg: string) =>
  `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
    `Halo Admin, saya ingin membeli paket ${pkg} dengan email [User Email].`
  )}`;

export const Pricing = () => {
  return (
    <section id="paket" className="bg-secondary/40 py-20 md:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Pilih Paket Tryout-mu</h2>
          <p className="mt-4 text-muted-foreground">Harga transparan, tanpa biaya tersembunyi. Bayar sekali, akses penuh.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((p) => (
            <Card
              key={p.name}
              className={`relative flex flex-col border-border/60 ${
                p.popular ? "border-primary shadow-xl lg:scale-105" : ""
              }`}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Paling Populer</Badge>
              )}
              <CardHeader className="pb-4">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-medium text-muted-foreground">Rp</span>
                  <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={p.popular ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  <a href={buyLink(p.name)} target="_blank" rel="noopener noreferrer">
                    Beli Paket
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
