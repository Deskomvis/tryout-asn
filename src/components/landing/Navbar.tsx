import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GraduationCap, Menu } from "lucide-react";

const links = [
  { href: "#beranda", label: "Beranda" },
  { href: "#fitur", label: "Fitur" },
  { href: "#available-paket", label: "Paket" },
  { href: "#testimoni", label: "Testimoni" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="container flex h-16 items-center justify-between" aria-label="Menu utama Ruang CASN">
        <a href="/" className="flex items-center gap-2" aria-label="Ruang CASN - Halaman Utama">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight">Ruang CASN</span>
        </a>

        <div className="hidden items-center gap-8 md:flex" role="menubar">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" role="menuitem">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild><a href="/auth" aria-label="Masuk ke akun Ruang CASN">Masuk</a></Button>
          <Button asChild><a href="/auth" aria-label="Daftar akun gratis Ruang CASN">Daftar Gratis</a></Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu navigasi">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="mt-8 flex flex-col gap-4" aria-label="Menu mobile">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-base font-medium transition-colors hover:text-primary">
                  {l.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" asChild><a href="/auth">Masuk</a></Button>
                <Button asChild><a href="/auth">Daftar Gratis</a></Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};
