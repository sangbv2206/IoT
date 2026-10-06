import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useNode } from "@/hooks/use-node-context";
import { cn } from "@/lib/utils";
import { METRIC_TABS, useSensorsData } from "./useSensorsData";
import { SensorTrendChart } from "./SensorTrendChart";
import { SensorHistoryTable } from "./SensorHistoryTable";

export function SensorsTab() {
  const { currentNode, currentNodeId, nodesList } = useNode();

  const {
    range,
    setRange,
    deviceFilter,
    setDeviceFilter,
    selectedMetric,
    setSelectedMetric,
    loading,
    chartLoading,
    aggregatedChartData,
    quickStats,
    histDateFilter,
    setHistDateFilter,
    histHourFilter,
    setHistHourFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filtered,
    paginatedData,
    totalPages,
    handleExportCSV,
  } = useSensorsData({ currentNodeId });

  return (
    <div className="space-y-6 max-w-[1680px] mx-auto pb-10 animate-fade-in">
      {/* 1. Header & Bộ chọn Metric */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Thống kê & Lịch sử Cảm biến
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {deviceFilter === "all"
                ? "Thống kê tổng hợp toàn bộ các Node trong hệ thống"
                : `Đang phân tích dữ liệu từ: ${nodesList.find((n) => n.id === deviceFilter)?.name || deviceFilter}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-1 text-xs">
            {METRIC_TABS.map((m) => {
              const Icon = m.icon;
              const active = selectedMetric === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMetric(m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer text-xs",
                    active
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: active ? m.color : undefined }} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{currentNode?.name || "Tất cả các phòng"}</span>
            {currentNodeId && <span className="text-[10px] font-mono text-slate-400">({currentNodeId})</span>}
          </div>
        </div>
      </GlassCard>

      {/* 2. Biểu đồ Xu hướng & Phân tích */}
      <SensorTrendChart
        range={range}
        setRange={setRange}
        selectedMetric={selectedMetric}
        quickStats={quickStats}
        chartLoading={chartLoading}
        aggregatedChartData={aggregatedChartData}
      />

      {/* 3. Lịch sử đo đạc & Bộ lọc */}
      <SensorHistoryTable
        filtered={filtered}
        paginatedData={paginatedData}
        loading={loading}
        deviceFilter={deviceFilter}
        setDeviceFilter={setDeviceFilter}
        nodesList={nodesList}
        histDateFilter={histDateFilter}
        setHistDateFilter={setHistDateFilter}
        histHourFilter={histHourFilter}
        setHistHourFilter={setHistHourFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
        handleExportCSV={handleExportCSV}
      />
    </div>
  );
}

export default SensorsTab;
