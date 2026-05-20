import logo from "@/assets/logo-ruangcasn.png";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background" role="contentinfo">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Ruang CASN" className="h-12 w-auto" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Platform tryout online terlengkap untuk persiapan ujian CPNS &amp; PPPK 2026.
            </p>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              <a href="https://www.instagram.com/ruang_casn" target="_blank" rel="noopener noreferrer" aria-label="Instagram Ruang CASN" className="hover:text-primary transition-colors"><InstagramIcon /></a>
              <a href="https://www.tiktok.com/@ruang_casn" target="_blank" rel="noopener noreferrer" aria-label="TikTok Ruang CASN" className="hover:text-primary transition-colors"><TikTokIcon /></a>
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
