import { cn } from "@/lib/utils";
import { Search, XCircle, History, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { NodeInfo } from "@/hooks/use-node-context";
import { useActivityLogs } from "./useActivityLogs";
import { ActivityItem } from "./ActivityItem";

export interface ActivityTabProps {
  currentUserId?: number | null;
  currentNodeId?: string;
  currentUserRole?: string;
  nodesList?: NodeInfo[];
}

export function ActivityTab({
  currentUserId,
  currentNodeId,
  nodesList = [],
}: ActivityTabProps) {
  const {
    logs,
    loading,
    total,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    nodeFilter,
    setNodeFilter,
    typeFilter,
    setTypeFilter,
    refresh,
    PAGE_SIZE,
  } = useActivityLogs(currentNodeId, currentUserId);

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc & Tìm kiếm */}
      <GlassCard className="p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc theo Node */}
          <div className="flex items-center gap-2 flex-1 min-w-[170px]">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={nodeFilter}
              onChange={(e) => {
                setNodeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="__all__">Tất cả Node</option>
              {currentNodeId && <option value="__current__">Node hiện tại ({currentNodeId})</option>}
              {nodesList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.id})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Loại */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(["all", "user_action", "system_alert"] as const).map((type) => {
              const label = type === "all" ? "Tất cả" : type === "user_action" ? "Thao tác" : "Cảnh báo";
              const isActive = typeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                    isActive
                      ? type === "system_alert"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[190px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm sự kiện..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Nút Làm mới */}
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading}
            title="Làm mới"
            className="rounded-xl border-slate-200/80 dark:border-white/10 h-9 w-9 shrink-0 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
          </Button>
        </div>
      </GlassCard>

      {/* Danh sách nhật ký */}
      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nhật ký hoạt động</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hiển thị {total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} / {total} sự kiện
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">{search ? "Không tìm thấy sự kiện phù hợp" : "Chưa có nhật ký hoạt động"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2.5">
              {logs.map((log, i) => (
                <ActivityItem key={log.id} log={log} isFirst={page === 1 && i === 0} />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500 tabular-nums">Trang {page} / {totalPages}</p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 px-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 px-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default ActivityTab;
