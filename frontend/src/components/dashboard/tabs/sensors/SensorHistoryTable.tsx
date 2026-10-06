import React from "react";
import { Filter, Download, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { FormattedHistoryRow } from "./useSensorsData";

interface SensorHistoryTableProps {
  filtered: FormattedHistoryRow[];
  paginatedData: FormattedHistoryRow[];
  loading: boolean;
  deviceFilter: string;
  setDeviceFilter: (id: string) => void;
  nodesList: Array<{ id: string; name: string }>;
  histDateFilter: string;
  setHistDateFilter: (d: string) => void;
  histHourFilter: number;
  setHistHourFilter: (h: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;
  handleExportCSV: () => void;
}

export function SensorHistoryTable({
  filtered,
  paginatedData,
  loading,
  deviceFilter,
  setDeviceFilter,
  nodesList,
  histDateFilter,
  setHistDateFilter,
  histHourFilter,
  setHistHourFilter,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  handleExportCSV,
}: SensorHistoryTableProps) {
  return (
    <GlassCard className="p-0 overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 shadow-xs">
      {/* Header & Bộ lọc bảng */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Lịch sử đo đạc cảm biến</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} bản ghi phù hợp bộ lọc</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <input
              type="date"
              value={histDateFilter}
              onChange={(e) => setHistDateFilter(e.target.value)}
              className="h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
            />
            {histDateFilter && (
              <button
                onClick={() => setHistDateFilter("")}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={histHourFilter}
            onChange={(e) => setHistHourFilter(Number(e.target.value))}
            className="h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2 text-xs text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value={-1}>Tất cả giờ</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-semibold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Xuất CSV
          </Button>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-5 py-3 text-left">STT</th>
              <th className="px-5 py-3 text-left">Thời gian</th>
              <th className="px-5 py-3 text-left">Nhiệt độ (°C)</th>
              <th className="px-5 py-3 text-left">Độ ẩm (%)</th>
              <th className="px-5 py-3 text-left">Ánh sáng (lx)</th>
              <th className="px-5 py-3 text-left">Node gửi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 animate-pulse">
                  Đang tải lịch sử đo đạc...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {deviceFilter !== "all" ? `Chưa có dữ liệu cho Node ${deviceFilter}` : "Chưa có dữ liệu lịch sử"}
                    </p>
                    {deviceFilter !== "all" && (
                      <Button
                        size="sm"
                        onClick={() => setDeviceFilter("all")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs rounded-xl"
                      >
                        Xem tất cả các Node
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((r) => {
                const nodeObj = nodesList.find((n) => n.id === r.device);
                return (
                  <tr key={r.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{r.time}</td>
                    <td className="px-5 py-3 font-bold text-rose-600">{r.temp !== "--" ? `${r.temp}°C` : "--"}</td>
                    <td className="px-5 py-3 font-bold text-sky-600">{r.humid !== "--" ? `${r.humid}%` : "--"}</td>
                    <td className="px-5 py-3 font-bold text-amber-600">{r.light !== "--" ? `${r.light} lx` : "--"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {nodeObj ? `${nodeObj.name} (${r.device})` : r.device}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-800/30 text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-3">
            <span>
              Trang <b>{currentPage}</b> / <b>{totalPages}</b> ({filtered.length} bản ghi)
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" /> Trước
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-xs"
            >
              Sau <ChevronRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
