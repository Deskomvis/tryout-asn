import { GraduationCap, Instagram, Twitter, Youtube } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">TryoutPro</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Platform tryout online terlengkap untuk persiapan ujian impianmu.
            </p>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              <a href="#" aria-label="Instagram"><Instagram className="h-5 w-5 hover:text-primary" /></a>
              <a href="#" aria-label="Twitter"><Twitter className="h-5 w-5 hover:text-primary" /></a>
              <a href="#" aria-label="Youtube"><Youtube className="h-5 w-5 hover:text-primary" /></a>
            </div>
          </div>

          {[
            { title: "Produk", links: ["Paket Tryout", "Bank Soal", "Leaderboard", "Mentoring"] },
            { title: "Perusahaan", links: ["Tentang Kami", "Karir", "Blog", "Kontak"] },
            { title: "Bantuan", links: ["FAQ", "Cara Pemesanan", "Syarat & Ketentuan", "Privasi"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold">{col.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TryoutPro. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
