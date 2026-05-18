import { Link, useNavigate } from "react-router-dom";
import { LogOut, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-ruangcasn.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = (
    <>
      <Link to="/dashboard" onClick={() => setOpen(false)} className="text-sm font-medium transition-colors hover:text-primary focus-visible:text-primary">Dashboard</Link>
      <Link to="/leaderboard" onClick={() => setOpen(false)} className="text-sm font-medium transition-colors hover:text-primary focus-visible:text-primary">Leaderboard</Link>
      {isAdmin && (
        <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-1 text-sm font-medium text-primary">
          <Shield className="h-4 w-4" aria-hidden="true" /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Ruang CASN" className="h-12 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigasi utama">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/akun-saya" className="hidden max-w-[180px] truncate text-sm text-muted-foreground hover:text-primary hover:underline lg:inline" title="Pengaturan Akun">{user?.email}</Link>
          <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="mr-1 h-4 w-4" aria-hidden="true" /> Keluar
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-5">
                {navLinks}
                <div className="mt-2 border-t border-border pt-4">
                  <Link to="/akun-saya" onClick={() => setOpen(false)} className="mb-3 block truncate text-xs text-muted-foreground hover:text-primary hover:underline">{user?.email}</Link>
                  <Button variant="outline" size="sm" className="w-full" onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}>
                    <LogOut className="mr-1 h-4 w-4" aria-hidden="true" /> Keluar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
