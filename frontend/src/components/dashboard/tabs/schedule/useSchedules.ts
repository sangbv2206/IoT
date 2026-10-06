import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface ScheduleRule {
  id: number;
  id_thietbi: number;
  deviceName?: string;
  action: "on" | "off";
  time: string;
  days: number[];
  enabled: boolean;
  node: string;
}

export interface ScheduleDraft {
  id?: number | null;
  device_id: number | null;
  action: "on" | "off";
  time: string;
  days: number[];
  enabled: boolean;
}

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function useSchedules() {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("lichhengio")
        .select("*, thietbi(*)")
        .order("idid", { ascending: true });

      if (!error && data) {
        setRules(
          data.map((item) => ({
            id: Number(item.idid),
            id_thietbi: item.id_thietbi,
            deviceName: item.thietbi?.ten_hienthi || item.thietbi?.loai_thietbi || "Thiết bị",
            action: item.hanhdong,
            time: item.thoigian ? item.thoigian.substring(0, 5) : "00:00",
            days: item.thu || [],
            enabled: item.kichhoat ?? true,
            node: item.thietbi?.idnode || "living",
          }))
        );
      }
    } catch (err: any) {
      console.error("Lỗi tải lịch hẹn:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    const chanId = `schedule-rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ch = supabase
      .channel(chanId)
      .on("postgres_changes", { event: "*", schema: "public", table: "lichhengio" }, fetchSchedules)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchSchedules]);

  const saveSchedule = async (draft: ScheduleDraft) => {
    if (!draft.device_id) {
      toast.error("Vui lòng chọn thiết bị!");
      return false;
    }
    const formattedTime = draft.time.length === 5 ? `${draft.time}:00` : draft.time;
    try {
      if (draft.id) {
        await supabase
          .from("lichhengio")
          .update({
            id_thietbi: draft.device_id,
            hanhdong: draft.action,
            thoigian: formattedTime,
            thu: draft.days,
            kichhoat: draft.enabled,
          })
          .eq("idid", draft.id);
        toast.success("Đã cập nhật lịch hẹn!");
      } else {
        await supabase.from("lichhengio").insert([
          {
            id_thietbi: draft.device_id,
            hanhdong: draft.action,
            thoigian: formattedTime,
            thu: draft.days,
            kichhoat: draft.enabled,
          },
        ]);
        toast.success("Đã tạo lịch hẹn mới!");
      }
      fetchSchedules();
      return true;
    } catch (err: any) {
      toast.error("Lỗi khi lưu lịch hẹn!");
      return false;
    }
  };

  const removeSchedule = async (id: number) => {
    try {
      await supabase.from("lichhengio").delete().eq("idid", id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Đã xóa lịch hẹn");
    } catch {
      toast.error("Lỗi khi xóa lịch!");
    }
  };

  const toggleSchedule = async (id: number, enabled: boolean) => {
    try {
      await supabase.from("lichhengio").update({ kichhoat: enabled }).eq("idid", id);
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    } catch {
      toast.error("Lỗi cập nhật trạng thái!");
    }
  };

  return { rules, loading, saveSchedule, removeSchedule, toggleSchedule };
}
