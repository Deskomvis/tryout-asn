import { Instagram, Twitter, Youtube } from "lucide-react";
import logo from "@/assets/logo-ruangcasn.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background" role="contentinfo">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Ruang CASN" className="h-10 w-auto" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Platform tryout online terlengkap untuk persiapan ujian CPNS &amp; PPPK 2026.
            </p>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              <a href="#" aria-label="Instagram Ruang CASN" className="hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
              <a href="#" aria-label="Twitter Ruang CASN" className="hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="#" aria-label="Youtube Ruang CASN" className="hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>
            </div>
          </div>

          {[
            { title: "Produk", links: [{ label: "Paket Tryout", href: "#available-paket" }, { label: "Bank Soal", href: "#" }, { label: "Leaderboard", href: "/leaderboard" }] },
            { title: "Perusahaan", links: [{ label: "Tentang Kami", href: "#" }, { label: "Blog", href: "#" }, { label: "Kontak", href: "#" }] },
            { title: "Bantuan", links: [{ label: "FAQ", href: "#" }, { label: "Cara Pemesanan", href: "#" }, { label: "Syarat & Ketentuan", href: "#" }] },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.label}><a href={l.href} className="hover:text-foreground transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Ruang CASN. Hak cipta dilindungi undang-undang.</p>
          <p>Platform Tryout CPNS &amp; PPPK Terpercaya Indonesia</p>
        </div>
      </div>
    </footer>
  );
};
