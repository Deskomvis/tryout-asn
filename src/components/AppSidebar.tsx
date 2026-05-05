import { NavLink, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ShoppingBag, FolderOpen, Monitor, User, LogOut, GraduationCap, Shield } from "lucide-react";
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
  { title: "Pembelian", url: "/pembelian", icon: ShoppingBag },
  { title: "Paket Saya", url: "/paket-saya", icon: FolderOpen },
  { title: "Try Out Akbar", url: "/try-out-akbar", icon: Monitor },
  { title: "Akun Saya", url: "/akun-saya", icon: User },
];

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
            <span className="text-base font-bold text-sidebar-foreground">TryoutPro</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CPNS · PPPK · SEKDIN</span>
          </div>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`
                      }
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
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
