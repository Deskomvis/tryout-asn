import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, LayoutGrid, FolderOpen, LogOut, GraduationCap,
  Database, Package, BarChart2, Receipt, Users, Settings,
} from "lucide-react";
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

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Beli Paket Tryout", url: "/beli-paket", icon: LayoutGrid },
  { title: "Paket Saya", url: "/paket-saya", icon: FolderOpen },
];

const adminItems = [
  { title: "Bank Soal", tab: "bank", icon: Database },
  { title: "Paket Tryout", tab: "exams", icon: Package },
  { title: "Skor User", tab: "scores", icon: BarChart2 },
  { title: "History Transaksi", tab: "topups", icon: Receipt },
  { title: "Semua User", tab: "balances", icon: Users },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <NavLink to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-base font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Ruang CASN</span>
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
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
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
