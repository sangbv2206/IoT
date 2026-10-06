import { Gauge, Check, Info, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SystemSettingsSectionProps {
  tempUnit: "C" | "F";
  onTempUnitChange: (unit: "C" | "F") => void;
  sensorInterval: string;
  onIntervalChange: (val: string) => void;
}

export function SystemSettingsSection({
  tempUnit,
  onTempUnitChange,
  sensorInterval,
  onIntervalChange,
}: SystemSettingsSectionProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tùy chỉnh đo lường & Tần suất dữ liệu */}
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Đo Lường & Dữ Liệu</h3>
            <p className="text-xs text-slate-500">Cấu hình hiển thị số liệu cảm biến và chu kỳ nhận gói tin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Đơn vị nhiệt độ */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Đơn vị hiển thị nhiệt độ
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onTempUnitChange("C")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  tempUnit === "C"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                )}
              >
                {tempUnit === "C" && <Check className="h-3.5 w-3.5" />}
                <span>Độ C (°C)</span>
              </button>

              <button
                type="button"
                onClick={() => onTempUnitChange("F")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  tempUnit === "F"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                )}
              >
                {tempUnit === "F" && <Check className="h-3.5 w-3.5" />}
                <span>Độ F (°F)</span>
              </button>
            </div>
          </div>

          {/* Tần suất nhận dữ liệu cảm biến */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Tần suất làm mới cảm biến
            </label>
            <Select value={sensorInterval} onValueChange={onIntervalChange}>
              <SelectTrigger className="text-xs bg-white dark:bg-slate-800 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 giây (Thời gian thực)</SelectItem>
                <SelectItem value="15">15 giây (Tiêu chuẩn)</SelectItem>
                <SelectItem value="30">30 giây (Tiết kiệm băng thông)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-slate-400 block">
              Chu kỳ cập nhật số liệu cảm biến từ Node ESP32
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Thông tin Hệ thống */}
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Thông Tin Hệ Thống</h3>
            <p className="text-xs text-slate-500">Hệ thống Quản lý Nhà thông minh Smart Home IoT</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-200/40 dark:border-white/5">
            <span className="text-slate-500">Phiên bản phần mềm:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Smart Home IoT v2.5.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-200/40 dark:border-white/5">
            <span className="text-slate-500">Đám mây kết nối:</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Hoạt động trực tuyến ổn định
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Đồ án:</span>
            <span className="text-slate-400 font-medium">PTIT Smart Home IoT Project · 2026</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
