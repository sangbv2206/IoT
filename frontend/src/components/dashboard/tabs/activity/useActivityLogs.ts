import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface ActivityLog {
  id: number;
  ts: number;
  isoTime: string;
  isAlert: boolean;
  description: string;
  nodeId: string;
  actor: string;
  isMe: boolean;
}

const PAGE_SIZE = 15;

export function useActivityLogs(currentNodeId?: string, currentUserId?: number | null) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nodeFilter, setNodeFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState<"all" | "user_action" | "system_alert">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("nhatkyhoatdong")
        .select("*, ten_nguoi_thaotac, nguoidung:nguoidung(hoten)", { count: "exact" })
        .order("thoigian", { ascending: false });

      if (nodeFilter === "__current__" && currentNodeId) {
        q = q.eq("idnode", currentNodeId);
      } else if (nodeFilter !== "__all__") {
        q = q.eq("idnode", nodeFilter);
      }

      if (typeFilter !== "all") {
        q = q.eq("loai_thongbao", typeFilter);
      }

      if (search.trim()) {
        q = q.ilike("hanhdong", `%${search.trim()}%`);
      }

      const { data, count } = await q.range(from, to);
      if (data) {
        setLogs(
          data.map((r: any) => {
            let desc = r.hanhdong;
            let isAlert = false;
            let parsedActor = null;
            try {
              const d = JSON.parse(r.hanhdong);
              desc = d.description || r.hanhdong;
              isAlert = d.loai_nhatky === "system_alert" || d.loai_thao_tac === "sensor_warning";
              parsedActor = d.user_name;
            } catch {
              const s = String(r.hanhdong).toLowerCase();
              isAlert = s.includes("vượt ngưỡng") || s.includes("cảnh báo") || s.includes("lỗi");
            }
            return {
              id: r.idnhatky,
              ts: Date.parse(r.thoigian) || Date.now(),
              isoTime: r.thoigian,
              isAlert,
              description: desc,
              nodeId: r.idnode || "",
              actor: r.ten_nguoi_thaotac || r.nguoidung?.hoten || parsedActor || (isAlert ? "Hệ thống" : "Người dùng"),
              isMe: Boolean(currentUserId && r.idnguoidung === currentUserId),
            };
          })
        );
        setTotal(count || 0);
      }
    } catch (e) {
      console.error("Lỗi khi tải nhật ký:", e);
    } finally {
      setLoading(false);
    }
  }, [page, nodeFilter, typeFilter, search, currentNodeId, currentUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const sub = supabase
      .channel("activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkyhoatdong" }, () => {
        if (page === 1) fetchLogs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [page, fetchLogs]);

  return {
    logs,
    loading,
    total,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    search,
    setSearch,
    nodeFilter,
    setNodeFilter,
    typeFilter,
    setTypeFilter,
    refresh: fetchLogs,
    PAGE_SIZE,
  };
}
