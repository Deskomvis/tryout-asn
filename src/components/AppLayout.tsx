import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, UserCircle2, Wallet, Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBalance, formatPoint } from "@/hooks/useBalance";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { balance } = useBalance();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="text-foreground" />
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/topup"
                className="flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Saldo ${balance} point. Klik untuk topup`}
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{formatPoint(balance)}</span>
                <span className="sm:hidden">{balance.toLocaleString("id-ID")}</span>
              </Link>
              <Button asChild size="sm" variant="outline" className="hidden gap-1 rounded-full sm:inline-flex">
                <Link to="/topup"><Plus className="h-3.5 w-3.5" /> Topup</Link>
              </Button>
              <button aria-label="Notifikasi" className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Bell className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-2 py-1 md:flex">
                <UserCircle2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <span className="max-w-[160px] truncate text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
        <WhatsAppButton />
      </div>
    </SidebarProvider>
  );
};
