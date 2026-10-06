import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useRelativeTime } from "@/hooks/use-smart-home";
import type { NotificationItem } from "./useNotifications";

export function NotifItem({
  notif,
  isRead,
  onMark,
}: {
  notif: NotificationItem;
  isRead: boolean;
  onMark: () => void;
}) {
  const relTime = useRelativeTime(notif.ts);
  const timeFormatted = new Date(notif.ts).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const isError = notif.level === "error";

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition-all text-sm",
        isRead
          ? "bg-white/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-white/5 opacity-75 hover:opacity-100"
          : isError
          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 font-medium"
          : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 font-medium"
      )}
    >
      {/* Chấm tròn chưa đọc */}
      {!isRead && (
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white mt-0.5",
          isError ? "bg-rose-500" : "bg-amber-500",
          isRead && "opacity-60 grayscale"
        )}
      >
        <AlertTriangle className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "leading-snug",
              isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100 font-semibold"
            )}
          >
            {notif.detail}
          </p>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 border",
              isError
                ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
            )}
          >
            {isError ? "Lỗi" : "Cảnh báo"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{relTime}</span>
          </span>
          <span>·</span>
          <span className="font-mono text-[10px] tabular-nums">{timeFormatted}</span>

          <div className="ml-auto flex items-center gap-2">
            {!isRead && (
              <button
                type="button"
                onClick={onMark}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" /> Đã đọc
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default NotifItem;
