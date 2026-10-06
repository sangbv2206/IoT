import { TrendingUp, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
  ReferenceLine,
} from "recharts";
import { SENSOR_THRESHOLDS } from "@/lib/sensorUtils";
import { RangeType, METRIC_TABS } from "./useSensorsData";

interface SensorTrendChartProps {
  range: RangeType;
  setRange: (r: RangeType) => void;
  selectedMetric: string;
  quickStats: {
    min: string;
    avg: string;
    max: string;
    unit: string;
    diffVal: string;
    isIncrease: boolean;
  };
  chartLoading: boolean;
  aggregatedChartData: any[];
}

const METRIC_COLORS: Record<string, string> = {
  temp: "#f43f5e",
  humid: "#0ea5e9",
  light: "#f59e0b",
};

export function SensorTrendChart({
  range,
  setRange,
  selectedMetric,
  quickStats,
  chartLoading,
  aggregatedChartData,
}: SensorTrendChartProps) {
  const activeColor = METRIC_COLORS[selectedMetric] || "#6366f1";

  return (
    <GlassCard className="p-5 sm:p-6 rounded-3xl border border-white/80 dark:border-white/10 shadow-xs">
      {/* Header & Bộ chọn khoảng thời gian */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Thống kê Xu hướng & Phân tích
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Biến động các chỉ số môi trường theo thời gian thực và lịch sử đo đạc
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-1 text-xs">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 font-bold transition cursor-pointer text-xs",
                range === r
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {r === "today" ? "24 Giờ" : r === "7d" ? "7 Ngày" : "30 Ngày"}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Thẻ Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 block">Thấp nhất (Min)</span>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">
            {quickStats.min} <span className="text-xs font-bold text-slate-400 font-sans">{quickStats.unit}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 block">Trung bình (Avg)</span>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
            {quickStats.avg} <span className="text-xs font-bold text-slate-400 font-sans">{quickStats.unit}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 block">Cao nhất (Max)</span>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {quickStats.max} <span className="text-xs font-bold text-slate-400 font-sans">{quickStats.unit}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 block">Biến thiên</span>
          <div className="flex items-center gap-1 mt-0.5 font-bold text-sm">
            {quickStats.isIncrease ? (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                <ArrowUp className="h-4 w-4" /> +{quickStats.diffVal} {quickStats.unit}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowDown className="h-4 w-4" /> -{quickStats.diffVal} {quickStats.unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Biểu đồ Recharts */}
      {chartLoading && aggregatedChartData.length === 0 ? (
        <div className="h-72 w-full flex items-center justify-center text-sm text-slate-500 animate-pulse">
          Đang tổng hợp dữ liệu thống kê...
        </div>
      ) : aggregatedChartData.length === 0 ? (
        <div className="h-72 w-full flex flex-col items-center justify-center text-sm text-slate-500">
          <Activity className="h-8 w-8 opacity-40 mb-2 text-slate-400" />
          <span>Chưa có dữ liệu thống kê cho khoảng thời gian này</span>
        </div>
      ) : selectedMetric !== "all" ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={activeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200/60 dark:text-slate-700/40" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={
                  selectedMetric === "temp" ? [15, 45] :
                  selectedMetric === "humid" ? [20, 100] : [0, 2000]
                }
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(val: any) => [
                  `${val} ${quickStats.unit}`,
                  METRIC_TABS.find((m) => m.id === selectedMetric)?.label || "Giá trị",
                ]}
              />
              {quickStats.avg !== "--" && (
                <ReferenceLine
                  y={Number(quickStats.avg)}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={{ value: `TB: ${quickStats.avg}`, fill: "#6366f1", fontSize: 10, position: "insideTopRight" }}
                />
              )}
              {selectedMetric === "temp" && (
                <ReferenceLine
                  y={SENSOR_THRESHOLDS.temp}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: `Ngưỡng ${SENSOR_THRESHOLDS.temp}°C`, fill: "#ef4444", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={activeColor}
                strokeWidth={2.5}
                fill="url(#metricGrad)"
                dot={{ r: 2.5, fill: "#fff", strokeWidth: 2 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200/60 dark:text-slate-700/40" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" domain={[0, 2000]} orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar yAxisId="right" dataKey="light" fill="#f59e0b" opacity={0.3} name="Ánh sáng (lx)" radius={[4, 4, 0, 0]} />
              <Area yAxisId="left" type="monotone" dataKey="humid" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorHumid)" connectNulls name="Độ ẩm (%)" />
              <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 1, stroke: "#fff", fill: "#ef4444" }} connectNulls name="Nhiệt độ (°C)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
