import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, LayoutGrid, FolderOpen, LogOut,
  Database, Package, BarChart2, Receipt, Users, Settings, UserCircle, MessageCircle, Send, Gift,
  Sparkles, Dumbbell, CalendarDays, Webhook
} from "lucide-react";
import logo from "@/assets/logo-ruangcasn.png";
import favicon from "@/assets/faveicon-ruangcasn.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tryout Gratis", url: "/tryout-gratis", icon: Sparkles },
  { title: "Beli Tryout Premium", url: "/beli-paket", icon: LayoutGrid },
  { title: "Paket Saya", url: "/paket-saya", icon: FolderOpen },
  { title: "Drilling Soal", url: "/drilling-soal", icon: Dumbbell },
  { title: "Bonus Saya", url: "/bonus-saya", icon: Gift },
  { title: "Tryout Akbar", url: "/try-out-akbar", icon: CalendarDays },
];

const adminItems = [
  { title: "Bank Soal", tab: "bank", icon: Database },
  { title: "Paket Tryout", tab: "exams", icon: Package },
  { title: "Skor User", tab: "scores", icon: BarChart2 },
  { title: "History Transaksi", tab: "topups", icon: Receipt },
  { title: "Semua User", tab: "balances", icon: Users },
  { title: "Tryout Akbar", tab: "akbar", icon: CalendarDays },
  { title: "Webhook & Akses", tab: "webhooks", icon: Webhook },
  { title: "Pengaturan", tab: "settings", icon: Settings },
];

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-medium transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md"
      : "bg-sidebar-accent text-sidebar-foreground hover:bg-secondary hover:text-foreground"
  }`;

const adminItemClass = (isActive: boolean) =>
  `flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-medium transition-colors w-full ${
    isActive
      ? "bg-primary text-primary-foreground shadow-md"
      : "bg-sidebar-accent text-sidebar-foreground hover:bg-secondary hover:text-foreground"
  }`;

export const AppSidebar = () => {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";
  const currentTab = new URLSearchParams(location.search).get("tab") ?? "questions";
  const [waLink, setWaLink] = useState("https://wa.me/...");
  const [teleLink, setTeleLink] = useState("https://t.me/...");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "community_links").maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed?.whatsapp) setWaLink(parsed.whatsapp);
          if (parsed?.telegram) setTeleLink(parsed.telegram);
        } catch (e) { console.error(e); }
      }
    })();
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <NavLink to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <img src={logo} alt="Ruang CASN" className="h-10 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
          <img src={favicon} alt="Ruang CASN" className="h-8 w-8 shrink-0 hidden group-data-[collapsible=icon]:block rounded-lg shadow-sm" />
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="pt-6">
        {/* Main nav */}
        <SidebarGroup className="pb-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className={itemClass}>
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Join Komunitas */}
        <SidebarGroup className="pt-0">
          <div className="mx-3 mb-2 group-data-[collapsible=icon]:hidden">
            <div className="border-t border-sidebar-border mb-3" />
            <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Join Komunitas
            </p>
          </div>
          <div className="mx-3 mb-2 border-t border-sidebar-border hidden group-data-[collapsible=icon]:block" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="WhatsApp Group">
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium bg-green-50/50 text-green-700 hover:bg-green-100 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Grup WhatsApp</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Telegram Group">
                  <a href={teleLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition-colors">
                    <Send className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Grup Telegram</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin nav — only when admin */}
        {isAdmin && (
          <>
            {/* Separator + label */}
            <div className="mx-3 mb-2 group-data-[collapsible=icon]:hidden">
              <div className="border-t border-sidebar-border mb-3" />
              <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Admin
              </p>
            </div>
            {/* Separator icon-only mode */}
            <div className="mx-3 mb-2 border-t border-sidebar-border hidden group-data-[collapsible=icon]:block" />

            <SidebarGroup className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-3">
                  {adminItems.map((item) => {
                    const isActive = isAdminPage && currentTab === item.tab;
                    return (
                      <SidebarMenuItem key={item.tab}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={`/admin?tab=${item.tab}`}
                            className={() => adminItemClass(isActive)}
                          >
                            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <NavLink
          to="/akun-saya"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-sidebar-accent text-sidebar-foreground hover:bg-secondary hover:text-foreground"
            }`
          }
        >
          <UserCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">Akun Saya</span>
        </NavLink>
        <Button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="w-full gap-2 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md hover:opacity-95"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
