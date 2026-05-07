import { NavLink, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, FolderOpen, LogOut, GraduationCap, Shield } from "lucide-react";
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
  { title: "Beli Paket", url: "/beli-paket", icon: LayoutGrid },
  { title: "Paket Saya", url: "/paket-saya", icon: FolderOpen },
];

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-medium transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md"
      : "bg-sidebar-accent text-sidebar-foreground hover:bg-secondary hover:text-foreground"
  }`;

export const AppSidebar = () => {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <NavLink to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold text-sidebar-foreground">Ruang CASN</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CPNS · PPPK · SEKDIN</span>
          </div>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="pt-6">
        <SidebarGroup className="pb-6">
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
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <NavLink to="/admin" className={itemClass}>
                      <Shield className="h-5 w-5" aria-hidden="true" />
                      <span>Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
