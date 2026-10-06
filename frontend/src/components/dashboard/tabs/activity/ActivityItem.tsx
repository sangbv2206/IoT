import { cn } from "@/lib/utils";
import { Zap, ShieldAlert, Clock, Home, User } from "lucide-react";
import { useRelativeTime } from "@/hooks/use-smart-home";
import type { ActivityLog } from "./useActivityLogs";

export function ActivityItem({ log, isFirst }: { log: ActivityLog; isFirst: boolean }) {
  const relTime = useRelativeTime(log.ts);
  const timeFormatted = new Date(log.ts).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 rounded-xl p-3 border transition-all text-sm",
        "bg-white/80 dark:bg-slate-900/80 shadow-sm hover:shadow",
        log.isAlert
          ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/20"
          : "border-slate-200/80 dark:border-white/10"
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white",
          log.isAlert
            ? "bg-gradient-to-br from-rose-500 to-pink-600"
            : "bg-gradient-to-br from-indigo-500 to-sky-500"
        )}
      >
        {log.isAlert ? <ShieldAlert className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
        {isFirst && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-slate-800 dark:text-slate-100 leading-snug">
            {log.description}
          </p>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 border",
              log.isAlert
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
            )}
          >
            {log.isAlert ? "Cảnh báo" : "Thao tác"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="tabular-nums">{relTime}</span>
          </span>

          {log.nodeId && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Home className="h-3 w-3 text-slate-400" />
                <span>Node: {log.nodeId}</span>
              </span>
            </>
          )}

          <span>·</span>
          <span
            className={cn(
              "flex items-center gap-1",
              log.isMe ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-300"
            )}
          >
            <User className="h-3 w-3 text-slate-400" />
            <span>{log.isMe ? "Bạn" : log.actor}</span>
          </span>

          <span className="ml-auto font-mono text-[10px] text-slate-400 tabular-nums">
            {timeFormatted}
          </span>
        </div>
      </div>
    </li>
  );
}
