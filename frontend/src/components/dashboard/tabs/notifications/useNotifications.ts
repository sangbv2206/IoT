import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type NotifLevel = "error" | "warn" | "info";

export interface NotificationItem {
  id: number;
  ts: number;
  detail: string;
  level: NotifLevel;
  isoTime: string;
  isBroadcast: boolean;
}

const PAGE_SIZE = 15;

export function useNotifications(currentUser: any, readAlertIds: number[] = []) {
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "error" | "warn">("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("nhatkyhoatdong")
        .select("*", { count: "exact" })
        .in("loai_thongbao", ["system_alert", "admin_notification"])
        .order("thoigian", { ascending: false });

      if (currentUser?.idnguoidung) {
        query = query.or(`idnguoidung.eq.${currentUser.idnguoidung},idnguoidung.is.null`);
      }

      const { data, count, error } = await query.range(from, to);
      if (!error && data) {
        setRawLogs(data);
        setTotalCount(count || 0);
      }
    } catch (e) {
      console.error("Lỗi khi tải thông báo:", e);
    } finally {
      setLoading(false);
    }
  }, [page, currentUser?.idnguoidung]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        (payload) => {
          const rec = payload.new as any;
          if (rec.loai_thongbao === "system_alert" || rec.loai_thongbao === "admin_notification") {
            if (page === 1) fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, fetchNotifications]);

  const mapped = useMemo<NotificationItem[]>(() => {
    return rawLogs.map((l) => {
      let detail = l.hanhdong || "";
      let level: NotifLevel = "info";

      try {
        const parsed = JSON.parse(detail);
        detail = parsed.description || parsed.message || detail;
      } catch {
        // Plain text
      }

      const lower = detail.toLowerCase();
      if (lower.includes("lỗi") || lower.includes("mất kết nối") || lower.includes("hỏng")) {
        level = "error";
      } else if (lower.includes("vượt ngưỡng") || lower.includes("cảnh báo")) {
        level = "warn";
      }

      return {
        id: Number(l.idnhatky),
        ts: Date.parse(l.thoigian) || Date.now(),
        detail,
        level,
        isoTime: l.thoigian,
        isBroadcast: l.idnguoidung === null && l.idnode === null,
      };
    });
  }, [rawLogs]);

  const filtered = useMemo(() => {
    if (filter === "unread") return mapped.filter((n) => !readAlertIds.includes(n.id));
    if (filter === "error") return mapped.filter((n) => n.level === "error");
    if (filter === "warn") return mapped.filter((n) => n.level === "warn");
    return mapped;
  }, [mapped, filter, readAlertIds]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    loading,
    filter,
    setFilter,
    page,
    setPage,
    totalPages,
    totalCount,
    notifications: filtered,
    refresh: fetchNotifications,
    PAGE_SIZE,
  };
}
