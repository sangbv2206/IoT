import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Shield, KeyRound, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Cài đặt tài khoản | Smart Home IoT" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ hoten: "", email: "", sodienthoai: "", ngaysinh: "", anhdaidien: "", vaitro: "buyer" });
  const [pwd, setPwd] = useState({ old: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [updatingPwd, setUpdatingPwd] = useState(false);

  const getDicebear = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || "user")}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return navigate({ to: "/login" });
      const u = session.user;
      setUser(u);
      supabase.from("nguoidung").select("*").eq("auth_uid", u.id).maybeSingle().then(({ data }) => {
        setForm({
          hoten: data?.hoten || u.user_metadata?.full_name || u.email?.split("@")[0] || "",
          email: data?.email || u.email || "",
          sodienthoai: data?.sodienthoai || "",
          ngaysinh: data?.ngaysinh || "",
          anhdaidien: data?.anhdaidien || u.user_metadata?.avatar_url || getDicebear(u.email || u.id),
          vaitro: data?.vaitro || "buyer",
        });
        setLoading(false);
      });
    });
  }, [navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("nguoidung").update({
      hoten: form.hoten.trim(),
      sodienthoai: form.sodienthoai.trim(),
      ngaysinh: form.ngaysinh || null,
      anhdaidien: form.anhdaidien,
    }).eq("auth_uid", user.id);
    setSaving(false);
    if (error) toast.error("Lỗi khi lưu thông tin: " + error.message);
    else toast.success("Đã cập nhật thông tin thành công!");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd.old) return toast.error("Vui lòng nhập mật khẩu hiện tại!");
    if (!pwd.new || pwd.new.length < 6) return toast.error("Mật khẩu mới tối thiểu 6 ký tự!");
    if (pwd.new !== pwd.confirm) return toast.error("Mật khẩu xác nhận không khớp!");

    setUpdatingPwd(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwd.old });
    if (signErr) {
      setUpdatingPwd(false);
      return toast.error("Mật khẩu hiện tại không đúng!");
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: pwd.new });
    setUpdatingPwd(false);
    if (updErr) return toast.error("Lỗi khi đổi mật khẩu: " + updErr.message);

    toast.success("Đổi mật khẩu thành công!");
    setPwd({ old: "", new: "", confirm: "" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const isAdmin = form.vaitro === "admin";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-10 text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50 transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Về Bảng điều khiển
          </Link>
          <Badge className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${isAdmin ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
            <Shield className="h-3 w-3 mr-1" /> {isAdmin ? "Quản trị viên" : "Gia chủ"}
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cài Đặt Tài Khoản</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật hồ sơ cá nhân và đổi mật khẩu bảo mật.</p>
        </div>

        {/* Form Hồ Sơ */}
        <GlassCard className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Thông Tin Cá Nhân</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
              <img src={form.anhdaidien || getDicebear(form.email)} alt="Avatar" className="h-14 w-14 rounded-full object-cover border border-indigo-400 shrink-0 bg-white" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Ảnh đại diện</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, anhdaidien: getDicebear(Math.random().toString(36)) }))} className="h-6 text-[11px] px-2 text-indigo-600 cursor-pointer">
                    <Sparkles className="h-3 w-3 mr-1" /> Đổi ảnh ngẫu nhiên
                  </Button>
                </div>
                <Input value={form.anhdaidien} onChange={e => setForm(p => ({ ...p, anhdaidien: e.target.value }))} placeholder="URL ảnh đại diện..." className="h-8 text-xs bg-white dark:bg-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="hoten" className="text-xs font-semibold">Họ và tên *</Label>
                <Input id="hoten" required value={form.hoten} onChange={e => setForm(p => ({ ...p, hoten: e.target.value }))} className="h-8.5 text-xs bg-white dark:bg-slate-900" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold">Email đăng nhập</Label>
                <Input id="email" disabled value={form.email} className="h-8.5 text-xs bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sdt" className="text-xs font-semibold">Số điện thoại</Label>
                <Input id="sdt" value={form.sodienthoai} onChange={e => setForm(p => ({ ...p, sodienthoai: e.target.value }))} placeholder="09xxxxxxxx" className="h-8.5 text-xs bg-white dark:bg-slate-900" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob" className="text-xs font-semibold">Ngày sinh</Label>
                <Input id="dob" type="date" value={form.ngaysinh} onChange={e => setForm(p => ({ ...p, ngaysinh: e.target.value }))} className="h-8.5 text-xs bg-white dark:bg-slate-900" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-8.5 px-4 text-xs cursor-pointer">
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Form Mật Khẩu (Xác thực đầy đủ mật khẩu cũ) */}
        <GlassCard className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bảo Mật & Mật Khẩu</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="old-pwd" className="text-xs font-semibold">Mật khẩu hiện tại</Label>
              <Input id="old-pwd" type="password" required value={pwd.old} onChange={e => setPwd(p => ({ ...p, old: e.target.value }))} placeholder="••••••••" className="h-8.5 text-xs bg-white dark:bg-slate-900" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-pwd" className="text-xs font-semibold">Mật khẩu mới</Label>
                <Input id="new-pwd" type="password" required value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} placeholder="Tối thiểu 6 ký tự" className="h-8.5 text-xs bg-white dark:bg-slate-900" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-pwd" className="text-xs font-semibold">Xác nhận mật khẩu</Label>
                <Input id="confirm-pwd" type="password" required value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Nhập lại" className="h-8.5 text-xs bg-white dark:bg-slate-900" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={updatingPwd} className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold h-8.5 px-4 text-xs cursor-pointer">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {updatingPwd ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
