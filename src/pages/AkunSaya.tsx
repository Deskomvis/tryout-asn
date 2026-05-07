import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Eye, EyeOff } from "lucide-react";

type Profile = { username: string | null; email: string | null; phone: string | null };
type PasswordForm = { current: string; new: string; confirm: string };

const AkunSaya = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ username: "", email: "", phone: "" });
  const [password, setPassword] = useState<PasswordForm>({ current: "", new: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username,email,phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: profile.username,
      email: profile.email,
      phone: profile.phone,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil diperbarui");
  };

  const changePassword = async () => {
    if (!user || !password.current || !password.new || !password.confirm) {
      return toast.error("Lengkapi semua field password");
    }
    if (password.new !== password.confirm) {
      return toast.error("Password baru tidak cocok");
    }
    if (password.new.length < 6) {
      return toast.error("Password minimal 6 karakter");
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: password.new });
    setChangingPassword(false);

    if (error) return toast.error(error.message);
    toast.success("Password berhasil diubah");
    setPassword({ current: "", new: "", confirm: "" });
  };

  return (
    <AppLayout>
      <PageHeader title="Akun Saya" breadcrumbs={[{ label: "Akun Saya" }]} />
      <div className="space-y-6 max-w-2xl">
        {/* Profil Section */}
        <Card>
          <CardHeader className="border-b"><h2 className="font-semibold">Data Profil</h2></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={profile.username ?? ""} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP</Label>
              <Input id="phone" type="tel" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="rounded-full">{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader className="border-b"><h2 className="font-semibold">Ubah Password</h2></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Password Saat Ini</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? "text" : "password"}
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  placeholder="Masukkan password saat ini"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  placeholder="Masukkan password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  placeholder="Konfirmasi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimal 6 karakter</p>
            </div>
            <Button onClick={changePassword} disabled={changingPassword} className="rounded-full">{changingPassword ? "Mengubah..." : "Ubah Password"}</Button>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="gap-2 rounded-full w-full sm:w-auto"
          onClick={async () => { await signOut(); navigate("/"); }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </AppLayout>
  );
};

export default AkunSaya;
