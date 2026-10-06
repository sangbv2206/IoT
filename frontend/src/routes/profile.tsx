import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Mail, Calendar, Shield, Cpu, LogOut, Settings, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { useNode } from "@/hooks/use-node-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Hồ sơ người dùng | Smart Home IoT" },
      { name: "description", content: "Thông tin tài khoản và thiết bị đang quản lý." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { nodesList } = useNode();
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const [profile, setProfile] = useState<{
    idnguoidung: number;
    hoten: string;
    email: string;
    sodienthoai: string;
    ngaysinh: string;
    anhdaidien: string;
    vaitro: string;
    thoigian: string;
  }>({
    idnguoidung: 1,
    hoten: "",
    email: "",
    sodienthoai: "",
    ngaysinh: "",
    anhdaidien: "",
    vaitro: "buyer",
    thoigian: new Date().toISOString(),
  });

  const loadProfile = async (authUser: any) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await supabase.from("nguoidung").select("*").eq("auth_uid", authUser.id).maybeSingle();
      const displayName = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Người dùng";
      const avatarUrl = authUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email || "user"}`;

      if (data) {
        setProfile({
          idnguoidung: data.idnguoidung,
          hoten: data.hoten || displayName,
          email: data.email || authUser.email || "",
          sodienthoai: data.sodienthoai || "",
          ngaysinh: data.ngaysinh || "",
          anhdaidien: data.anhdaidien || avatarUrl,
          vaitro: data.vaitro || "buyer",
          thoigian: data.thoigian || new Date().toISOString(),
        });
      } else {
        setProfile((prev) => ({ ...prev, hoten: displayName, email: authUser.email, anhdaidien: avatarUrl }));
      }
    } catch (err: any) {
      console.error("Lỗi khi tải hồ sơ:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user);
      else navigate({ to: "/login" });
    });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất thành công!");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Lỗi khi đăng xuất: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-4 sm:p-6 lg:p-10 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Navbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:scale-105 active:scale-95 duration-200">
            <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild className="bg-slate-900 text-white shadow-md hover:bg-slate-800 rounded-full px-5">
              <Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Cài đặt tài khoản</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-slate-200 bg-white/70 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-full px-5 shadow-sm">
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard className="overflow-hidden p-0 relative border-indigo-100/50 shadow-lg animate-fade-in">
          <div className="h-36 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />
          <div className="px-6 pb-6 relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-14 md:-mt-10">
            <div className="relative z-10 shrink-0">
              <div className="h-28 w-28 rounded-full p-1 bg-white shadow-xl">
                <img src={profile.anhdaidien} alt="Avatar" className="h-full w-full object-cover rounded-full" />
              </div>
              <span className="absolute bottom-1 right-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-md" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1 pb-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                <h2 className="text-2xl font-bold text-slate-900">{profile.hoten}</h2>
                <Badge className="mx-auto md:mx-0 w-fit rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-0.5 font-semibold flex items-center gap-1 shadow-sm">
                  <Shield className="h-3.5 w-3.5" /> {profile.vaitro === "admin" ? "Quản trị viên" : "Gia chủ"}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 font-medium">{profile.email}</p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="border-t border-slate-100 bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><Mail className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Email</p>
                <p className="text-xs font-semibold truncate text-slate-800 mt-0.5">{profile.email || "Chưa cập nhật"}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0"><Phone className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Số điện thoại</p>
                <p className="text-xs font-semibold truncate text-slate-800 mt-0.5">{profile.sodienthoai || "Chưa cấu hình"}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Calendar className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Ngày sinh</p>
                <p className="text-xs font-semibold truncate text-slate-800 mt-0.5">{profile.ngaysinh ? new Date(profile.ngaysinh).toLocaleDateString("vi-VN") : "Chưa cấu hình"}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><Calendar className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Ngày tham gia</p>
                <p className="text-xs font-semibold truncate text-slate-800 mt-0.5">{new Date(profile.thoigian).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Nodes & Devices List */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Cpu className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mạng lưới Nodes & Thiết bị</h3>
                <p className="text-xs text-slate-500">Các bo mạch điều khiển IoT thuộc tài khoản của bạn</p>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-200 text-xs font-semibold px-3 py-1">{nodesList.length} phòng / khu vực</Badge>
          </div>

          {nodesList.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Chưa có bo mạch Node nào được liên kết
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {nodesList.map((node) => {
                const isOnline = node.trang_thai === "online";
                return (
                  <div key={node.id} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-2xs">
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-bold text-slate-900 truncate">{node.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{node.id}</div>
                    </div>
                    <Badge className={cn("rounded-full px-2.5 py-0.5 font-bold text-[11px] shrink-0 border", isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-rose-50 text-rose-700 border-rose-200/60")}>
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
