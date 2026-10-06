import { Bell, ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useNotifications } from "./useNotifications";
import { NotifItem } from "./NotifItem";

export interface NotificationsTabProps {
  readAlertIds: number[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: (ids: number[]) => void;
  currentUser: any;
  alerts?: any[];
}

export function NotificationsTab({
  readAlertIds = [],
  onMarkAsRead,
  onMarkAllAsRead,
  currentUser,
}: NotificationsTabProps) {
  const {
    loading,
    filter,
    setFilter,
    page,
    setPage,
    totalPages,
    totalCount,
    notifications,
    PAGE_SIZE,
  } = useNotifications(currentUser, readAlertIds);

  const unreadItems = notifications.filter((n) => !readAlertIds.includes(n.id));

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc & hành động */}
      <GlassCard className="p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Nút lọc nhanh dạng Tabs/Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "unread", label: `Chưa đọc ${unreadItems.length > 0 ? `(${unreadItems.length})` : ""}` },
                { key: "error", label: "Lỗi" },
                { key: "warn", label: "Cảnh báo" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                  filter === f.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {unreadItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAllAsRead(unreadItems.map((n) => n.id))}
                className="text-xs h-8 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Đọc tất cả ({unreadItems.length})
              </Button>
            )}

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Live</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Danh sách thông báo */}
      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Trung tâm thông báo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hiển thị {totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} thông báo
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
            <Bell className="h-10 w-10 opacity-30" />
            <p className="text-sm">Không có thông báo nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2.5">
              {notifications.map((n) => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  isRead={readAlertIds.includes(n.id)}
                  onMark={() => onMarkAsRead(n.id)}
                />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500 tabular-nums">
                  Trang {page} / {totalPages}
                </p>
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

export default NotificationsTab;
