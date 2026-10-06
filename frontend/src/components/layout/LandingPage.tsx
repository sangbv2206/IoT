import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Cpu,
  ArrowRight,
  Thermometer,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage({ dark = false, toggleDark: _toggleDark }: { dark?: boolean; toggleDark?: () => void } = {}) {
  const bg = "linear-gradient(135deg, #f6f7fb 0%, #eef1f8 100%)";

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6 md:p-10 text-slate-800 bg-slate-50"
      style={{ background: bg }}
    >
      {/* Header */}
      <header className="flex justify-between items-center max-w-7xl w-full mx-auto mb-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Smart Home IoT</span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center my-auto">
        <div className="space-y-6 text-left">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
            dark ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-600"
          )}>
            ● Giải pháp điều khiển thế hệ mới
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
            Giám sát & Điều khiển <br/>
            <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
              Smart Home IoT
            </span>
          </h1>
          <p className={cn("text-base md:text-lg max-w-lg", dark ? "text-slate-400" : "text-slate-600")}>
            Hệ thống quản lý nhà thông minh tối ưu sử dụng chip điều khiển ESP32-S3, truyền thông điệp thời gian thực MQTT và đồng bộ cơ sở dữ liệu Supabase.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 h-11 px-6 rounded-2xl cursor-pointer">
              <Link to="/login">
                Đăng nhập hệ thống <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className={cn("h-11 px-6 rounded-2xl border-white/60 bg-white/40 backdrop-blur hover:bg-white/80 cursor-pointer", dark ? "text-white border-white/10 bg-white/5 hover:bg-white/10" : "text-slate-800")}>
              <Link to="/register">
                Tạo tài khoản mới
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Giám sát Cảm biến", desc: "Đọc nhiệt độ, độ ẩm và cường độ ánh sáng thời gian thực.", icon: Thermometer, color: "text-rose-500 bg-rose-500/10" },
            { title: "Điều khiển Thiết bị", desc: "Bật/tắt Quạt, Đèn, Rèm cửa ở 2 chế độ Tự động và Thủ công.", icon: Cpu, color: "text-indigo-500 bg-indigo-500/10" },
            { title: "Lịch trình Hẹn giờ", desc: "Cài đặt lịch bật/tắt thiết bị tự động theo giờ trong ngày.", icon: Clock, color: "text-emerald-500 bg-emerald-500/10" },
            { title: "Cảnh báo & Nhật ký", desc: "Ghi chép lịch sử vận hành, báo động ngay lập tức khi vượt ngưỡng.", icon: ShieldAlert, color: "text-amber-500 bg-amber-500/10" }
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={cn(
                  "p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.02]",
                  dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/60"
                )}
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl mb-3", f.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className={cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto border-t border-slate-200/50 dark:border-white/10 pt-6 mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
        © 2026 Smart Home IoT Project · Phát triển bởi <span className="font-semibold text-slate-700 dark:text-slate-200">Bùi Văn Sang</span>
      </footer>
    </div>
  );
}
