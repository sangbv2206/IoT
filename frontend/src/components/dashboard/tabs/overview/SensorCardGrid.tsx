import React from "react";
import { cn } from "@/lib/utils";
import { Thermometer, Droplets, Sun } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export interface SensorCardData {
  key: "temp" | "humid" | "light";
  label: string;
  value: string;
  rawValue: number;
  max: number;
  unit: string;
  alert: boolean;
  hasRealData: boolean;
}

export function SensorCardGrid({ cards }: { cards: SensorCardData[] }) {
  return (
    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {cards.map((s, idx) => {
        const Icon = s.key === "temp" ? Thermometer : s.key === "humid" ? Droplets : Sun;
        const gradient =
          s.key === "temp"
            ? "from-rose-500 to-orange-400"
            : s.key === "humid"
            ? "from-sky-500 to-cyan-400"
            : "from-amber-400 to-yellow-400";
        const unitColor =
          s.key === "temp" ? "text-rose-500" : s.key === "humid" ? "text-sky-500" : "text-amber-500";
        const isFullWidth = cards.length === 3 && idx === 2;

        return (
          <GlassCard
            key={s.key}
            className={cn(
              "p-3.5 sm:p-4 rounded-3xl border border-white/80 dark:border-white/10 shadow-xs flex flex-col transition-all bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
              s.alert && "ring-2 ring-rose-500/80",
              isFullWidth && "sm:col-span-2"
            )}
          >
            {/* Header: Icon & Badge trạng thái */}
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className={cn("grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br text-white shadow-xs", gradient)}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div
                className={cn(
                  "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  !s.hasRealData
                    ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    : s.alert
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900 animate-pulse"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", !s.hasRealData ? "bg-slate-400" : s.alert ? "bg-rose-500" : "bg-emerald-500")} />
                <span>{!s.hasRealData ? "Chờ" : s.alert ? "Cảnh báo" : "Chuẩn"}</span>
              </div>
            </div>

            <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.label}</h4>

            {/* Giá trị đo chính */}
            <div className="my-2 flex items-baseline">
              <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{s.value}</span>
              <span className={cn("text-sm font-bold ml-1", unitColor)}>{s.unit}</span>
            </div>

            {/* Thanh đo mức độ */}
            <div className="space-y-1 mt-auto">
              <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", gradient)}
                  style={{ width: `${Math.min(Math.max((s.rawValue / s.max) * 100, 4), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0{s.unit}</span>
                <span>{s.max}{s.unit}</span>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

export default SensorCardGrid;
