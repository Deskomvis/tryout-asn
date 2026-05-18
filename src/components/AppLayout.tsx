import { ReactNode } from "react";
import { Bell, UserCircle2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import { useAuth } from "@/hooks/useAuth";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-foreground" />
            </div>
            
            {/* Infinite Loop Running Text */}
            <div className="flex-1 max-w-[150px] xs:max-w-[220px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-[550px] xl:max-w-[700px] overflow-hidden mx-1 sm:mx-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-full px-3.5 select-none cursor-default transition-colors">
              <div className="flex whitespace-nowrap animate-marquee">
                <span className="text-[10px] sm:text-xs font-semibold text-primary tracking-wide pr-4">
                  Platfom Tryout CASN Terbaik No #1 Di Indonesia - Ruang CASN - Tryout CASN - Tryout PPPK - Platfom Tryout CASN Terbaik No #1 Di Indonesia - Ruang CASN - Tryout CASN - Tryout PPPK - &nbsp;
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-primary tracking-wide pr-4">
                  Platfom Tryout CASN Terbaik No #1 Di Indonesia - Ruang CASN - Tryout CASN - Tryout PPPK - Platfom Tryout CASN Terbaik No #1 Di Indonesia - Ruang CASN - Tryout CASN - Tryout PPPK - &nbsp;
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
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
