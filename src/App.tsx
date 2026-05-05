import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Exam from "./pages/Exam.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Admin from "./pages/Admin.tsx";
import BeliPaket from "./pages/BeliPaket.tsx";
import Pembelian from "./pages/Pembelian.tsx";
import PaketSaya from "./pages/PaketSaya.tsx";
import TryOutAkbar from "./pages/TryOutAkbar.tsx";
import AkunSaya from "./pages/AkunSaya.tsx";
import Topup from "./pages/Topup.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/beli-paket" element={<ProtectedRoute><BeliPaket /></ProtectedRoute>} />
            <Route path="/pembelian" element={<ProtectedRoute><Pembelian /></ProtectedRoute>} />
            <Route path="/paket-saya" element={<ProtectedRoute><PaketSaya /></ProtectedRoute>} />
            <Route path="/try-out-akbar" element={<ProtectedRoute><TryOutAkbar /></ProtectedRoute>} />
            <Route path="/akun-saya" element={<ProtectedRoute><AkunSaya /></ProtectedRoute>} />
            <Route path="/exam/:examId" element={<ProtectedRoute><Exam /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
