import React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, Sun, Fan, Blinds, Tv, Activity, Sparkles } from "lucide-react";
import { DeviceData } from "../../shared/types";

interface DeviceGridProps {
  devices: DeviceData[];
  onSelectDevice: (device: DeviceData) => void;
  onToggle: (device: DeviceData, on: boolean) => void;
  onModeChange?: (device: DeviceData, mode: "auto" | "manual") => void;
}

function getDeviceMeta(dev: DeviceData) {
  const loai = dev.loai_thietbi;
  const isOn = dev.trangthai === 1;

  if (loai === "den") {
    const bri = dev.cau_hinh?.brightness ?? 80;
    return {
      Icon: Sun,
      color: "from-amber-400 to-orange-500",
      glow: "rgba(251,191,36,0.3)",
      statusText: isOn ? `Bật · ${bri}%` : "Đang tắt",
    };
  }
  if (loai === "quat") {
    const spd = dev.cau_hinh?.speed ?? 2;
    return {
      Icon: Fan,
      color: "from-sky-400 to-cyan-500",
      glow: "rgba(56,189,248,0.3)",
      statusText: isOn ? `Bật · Số ${spd}` : "Đang tắt",
    };
  }
  if (loai === "rem_cua") {
    const pos = dev.cau_hinh?.position ?? 75;
    return {
      Icon: Blinds,
      color: "from-indigo-500 to-blue-600",
      glow: "rgba(99,102,241,0.3)",
      statusText: isOn ? (pos === 100 ? "Mở 100%" : pos === 0 ? "Đóng kín" : `Mở ${pos}%`) : "Đang tắt",
    };
  }
  if (loai === "tivi") {
    return {
      Icon: Tv,
      color: "from-purple-500 to-indigo-600",
      glow: "rgba(168,85,247,0.3)",
      statusText: isOn ? "Đang bật" : "Đang tắt",
    };
  }
  return {
    Icon: Activity,
    color: "from-slate-400 to-slate-500",
    glow: "rgba(148,163,184,0.2)",
    statusText: isOn ? "Đang bật" : "Đang tắt",
  };
}

export function DeviceGrid({ devices, onSelectDevice, onToggle, onModeChange }: DeviceGridProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
      {devices.map((dev) => {
        const isOn = dev.trangthai === 1;
        const isAuto = Boolean(dev.tu_dong);
        const meta = getDeviceMeta(dev);
        const Icon = meta.Icon;

        return (
          <div
            key={dev.id_thietbi}
            onClick={() => onSelectDevice(dev)}
            className={cn(
              "group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[115px]",
              "hover:shadow-md hover:-translate-y-0.5",
              isOn
                ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs"
                : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/80 opacity-85 hover:opacity-100"
            )}
          >
            {/* Hàng trên: Icon + Chế độ Auto + Switch */}
            <div className="flex items-start justify-between gap-2 relative z-10">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAuto && onModeChange) onModeChange(dev, "manual");
                  onToggle(dev, !isOn);
                }}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl transition-all shadow-xs",
                  isOn
                    ? cn("bg-gradient-to-br text-white shadow-sm", meta.color)
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                )}
              >
                <Icon className={cn("h-5 w-5", isOn && dev.loai_thietbi === "quat" && "animate-spin")} />
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                {onModeChange && dev.loai_thietbi !== "tivi" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeChange(dev, isAuto ? "manual" : "auto");
                    }}
                    title={isAuto ? "Đang bật Tự động theo cảm biến. Nhấn để chuyển Thủ công" : "Nhấn để bật chế độ Tự động theo cảm biến"}
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer border flex items-center gap-1",
                      isAuto
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs"
                        : "opacity-0 group-hover:opacity-80 bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:text-emerald-600 hover:border-emerald-500/30"
                    )}
                  >
                    <Sparkles className={cn("h-2.5 w-2.5", isAuto ? "text-emerald-500 animate-pulse" : "text-slate-400")} />
                    <span>{isAuto ? "Tự động" : "Auto"}</span>
                  </button>
                )}

                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(val) => {
                      if (isAuto && onModeChange) onModeChange(dev, "manual");
                      onToggle(dev, val);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Hàng dưới: Tên + Trạng thái */}
            <div className="relative z-10 mt-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {dev.ten_hienthi || "Thiết bị"}
                </h4>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span
                  className={cn(
                    "text-[11px] font-medium truncate",
                    isOn ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {meta.statusText}
                </span>

                {dev.dia_chi_hw && (
                  <span className="text-[9px] text-slate-400 font-mono shrink-0">
                    {dev.dia_chi_hw}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DeviceGrid;
