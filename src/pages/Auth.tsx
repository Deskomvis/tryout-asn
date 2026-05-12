import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { fbq } from "@/lib/metaPixel";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(30, "Username maksimal 30 karakter")
  .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya huruf, angka, titik, garis bawah");

const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("Email tidak valid").max(255),
  phone: z.string().trim().min(9, "Nomor HP minimal 9 digit").max(15, "Nomor HP maksimal 15 digit").regex(/^[0-9+\-\s]+$/, "Format nomor HP tidak valid"),
  password: z.string().min(6, "Minimal 6 karakter").max(72),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Wajib diisi").max(255),
  password: z.string().min(6, "Minimal 6 karakter").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [signupForm, setSignupForm] = useState({ username: "", email: "", phone: "", password: "" });

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const resolveEmail = async (identifier: string): Promise<string | null> => {
    if (identifier.includes("@")) return identifier;
    const { data, error } = await supabase.rpc("get_email_by_username", { _username: identifier });
    if (error) return null;
    return (data as string) || null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(loginForm);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);
    const email = await resolveEmail(loginForm.identifier);
    if (!email) {
      setLoading(false);
      return toast.error("Username atau email tidak ditemukan");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginForm.password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Berhasil masuk");
    navigate("/dashboard");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(signupForm);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);

    const { data: available, error: checkErr } = await supabase.rpc("is_username_available", {
      _username: signupForm.username,
    });
    if (checkErr) { setLoading(false); return toast.error(checkErr.message); }
    if (!available) { setLoading(false); return toast.error("Username sudah dipakai"); }

    const { error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username: signupForm.username.toLowerCase(), phone: signupForm.phone.trim() },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    fbq.completeRegistration({ content_name: "Ruang CASN", status: true });
    toast.success("Akun dibuat. Silakan masuk.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto flex items-center gap-2">
            <img src="/src/assets/logo-ruangcasn.webp" alt="Logo" className="h-9 w-auto" />
            <span className="text-lg font-bold">Ruang CASN</span>
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Selamat datang</h1>
          <p className="text-sm text-muted-foreground">Masuk atau daftar untuk mulai tryout</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div>
                  <Label>Username atau Email</Label>
                  <Input
                    autoComplete="username"
                    placeholder="username atau email@anda.com"
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "Masuk"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div><Label>Username</Label><Input autoComplete="username" placeholder="contoh: budi_123" value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} required /></div>
                <div><Label>Email</Label><Input type="email" autoComplete="email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required /></div>
                <div><Label>Nomor HP</Label><Input type="tel" autoComplete="tel" placeholder="contoh: 081234567890" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} required /></div>
                <div><Label>Password</Label><Input type="password" autoComplete="new-password" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "Daftar"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
