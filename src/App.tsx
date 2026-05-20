import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Exam from "./pages/Exam.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Admin from "./pages/Admin.tsx";
import BeliPaket from "./pages/BeliPaket.tsx";
import TryoutGratis from "./pages/TryoutGratis.tsx";
import DrilingSoal from "./pages/DrilingSoal.tsx";
import TryOutAkbar from "./pages/TryOutAkbar.tsx";
import PaketSaya from "./pages/PaketSaya.tsx";
import BonusSaya from "./pages/BonusSaya.tsx";
import AkunSaya from "./pages/AkunSaya.tsx";
import Topup from "./pages/Topup.tsx";
import ExamResults from "./pages/ExamResults.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MetaPixelProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/beli-paket" element={<ProtectedRoute><BeliPaket /></ProtectedRoute>} />
            <Route path="/tryout-gratis" element={<ProtectedRoute><TryoutGratis /></ProtectedRoute>} />
            <Route path="/drilling-soal" element={<ProtectedRoute><DrilingSoal /></ProtectedRoute>} />
            <Route path="/try-out-akbar" element={<ProtectedRoute><TryOutAkbar /></ProtectedRoute>} />
            <Route path="/paket-saya" element={<ProtectedRoute><PaketSaya /></ProtectedRoute>} />
            <Route path="/bonus-saya" element={<ProtectedRoute><BonusSaya /></ProtectedRoute>} />
            <Route path="/akun-saya" element={<ProtectedRoute><AkunSaya /></ProtectedRoute>} />
            <Route path="/topup" element={<ProtectedRoute><Topup /></ProtectedRoute>} />
            <Route path="/exam/:examId" element={<ProtectedRoute><Exam /></ProtectedRoute>} />
            <Route path="/exam-results/:examId" element={<ProtectedRoute><ExamResults /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MetaPixelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
