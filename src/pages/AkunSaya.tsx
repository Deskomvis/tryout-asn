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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogOut, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";

type Profile = { username: string; phone: string };

const PasswordInput = ({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const AkunSaya = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile>({ username: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username,phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({ username: data.username ?? "", phone: data.phone ?? "" });
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: profile.username, phone: profile.phone })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profil diperbarui");
  };

  const changeEmail = async () => {
    if (!newEmail.trim()) return toast.error("Masukkan email baru");
    if (newEmail === user?.email) return toast.error("Email sama dengan email saat ini");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error("Format email tidak valid");

    setSendingEmail(true);
    // supabase.auth.updateUser sends a confirmation link to the new address
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSendingEmail(false);

    if (error) return toast.error(error.message);

    // Sync to profiles table so it's visible immediately
    if (user) await supabase.from("profiles").update({ email: newEmail }).eq("id", user.id);

    setEmailSent(true);
    toast.success("Email konfirmasi dikirim ke " + newEmail);
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword)
      return toast.error("Lengkapi semua field password");
    if (newPassword !== confirmPassword)
      return toast.error("Password baru tidak cocok");
    if (newPassword.length < 6)
      return toast.error("Password minimal 6 karakter");
    if (currentPassword === newPassword)
      return toast.error("Password baru harus berbeda dari password lama");

    setChangingPassword(true);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      setChangingPassword(false);
      return toast.error("Password saat ini salah");
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) return toast.error(error.message);

    toast.success("Password berhasil diubah");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AppLayout>
      <PageHeader title="Akun Saya" breadcrumbs={[{ label: "Akun Saya" }]} />
      <div className="space-y-6 max-w-2xl">

        {/* Data Profil */}
        <Card>
          <CardHeader className="border-b pb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Data Profil
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="rounded-full">
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </CardContent>
        </Card>

        {/* Ubah Email */}
        <Card>
          <CardHeader className="border-b pb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Ubah Email
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Email saat ini</Label>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
            {emailSent ? (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Link konfirmasi dikirim ke <strong>{newEmail}</strong>.
                  Cek inbox dan klik link untuk mengaktifkan email baru.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email baru</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="emailbaru@contoh.com"
                  />
                </div>
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Setelah klik "Kirim Konfirmasi", buka inbox email baru dan klik link
                    konfirmasi untuk menyelesaikan perubahan.
                  </AlertDescription>
                </Alert>
                <Button onClick={changeEmail} disabled={sendingEmail} className="rounded-full">
                  {sendingEmail ? "Mengirim..." : "Kirim Konfirmasi"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ubah Password */}
        <Card>
          <CardHeader className="border-b pb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Ubah Password
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <PasswordInput
              id="current-password"
              label="Password saat ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Masukkan password saat ini"
            />
            <PasswordInput
              id="new-password"
              label="Password baru"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Minimal 6 karakter"
            />
            <PasswordInput
              id="confirm-password"
              label="Konfirmasi password baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Ulangi password baru"
            />
            <Button onClick={changePassword} disabled={changingPassword} className="rounded-full">
              {changingPassword ? "Memverifikasi..." : "Ubah Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="gap-2 rounded-full w-full sm:w-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={async () => { await signOut(); navigate("/"); }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </AppLayout>
  );
};

export default AkunSaya;
