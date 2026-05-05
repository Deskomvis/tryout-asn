import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">TryoutPro</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/dashboard" className="text-sm font-medium hover:text-primary">Dashboard</Link>
          <Link to="/leaderboard" className="text-sm font-medium hover:text-primary">Leaderboard</Link>
          {isAdmin && <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-primary"><Shield className="h-4 w-4" /> Admin</Link>}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="mr-1 h-4 w-4" /> Keluar
          </Button>
        </div>
      </div>
    </header>
  );
};
