import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { initMqttClient, onMqttStatus, mqttPublish, getDeviceMqttTopic, publishDeviceProperty } from "@/lib/mqttClient";
import { useNode } from "@/hooks/use-node-context";
import { BUYER_TABS } from "@/components/dashboard/shared/constants";
import type { TabKey, Alert, DeviceData, DynamicSensors } from "@/components/dashboard/shared/types";
import { isRecordForNode, extractDynamicSensors, normalizeSensorHistory, parseSensorMetric } from "@/lib/sensorUtils";
export function useDashboard() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const { currentNode: node, currentNodeId: nodeId, setCurrentNodeId: setNodeId, nodesList } = useNode();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ hoten: string; email: string; idnguoidung?: number; vaitro?: string } | null>(null);
  const currentUserId = currentUser?.idnguoidung ? Number(currentUser.idnguoidung) : null;
  const title = BUYER_TABS.find((t) => t.key === tab)?.label || "Smart Home";
  const [nodeDevices, setNodeDevices] = useState<DeviceData[]>([]);
  const [sensors, setSensors] = useState<DynamicSensors>({});
  const legacySensors = useMemo(() => ({
    temp: sensors.nhiet_do?.value ?? null,
    humid: sensors.do_am?.value ?? null,
    light: sensors.anh_sang?.value ?? null,
  }), [sensors]);
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [lastLivingTime, setLastLivingTime] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, number>>({ temp: 30, humid: 75, light: 200 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<number[]>([]);
  const [bellPing, setBellPing] = useState(false);
  const [supabaseOnline, setSupabaseOnline] = useState(true);
  const [mqttOnline, setMqttOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.idnguoidung) return;
    try {
      const stored = window.localStorage.getItem(`sh-read-alerts-${currentUser.idnguoidung}`);
      if (stored) setReadAlertIds(JSON.parse(stored));
    } catch {}
  }, [currentUser?.idnguoidung]);
  const saveReadAlerts = (ids: number[]) => {
    setReadAlertIds(ids);
    if (typeof window !== "undefined" && currentUser?.idnguoidung) {
      window.localStorage.setItem(`sh-read-alerts-${currentUser.idnguoidung}`, JSON.stringify(ids));
    }
  };
  const markAsRead = (id: number) => {
    if (!readAlertIds.includes(id)) {
      saveReadAlerts([...readAlertIds, id]);
      if (id > 0) supabase.from("nhatkyhoatdong").update({ da_doc: true }).eq("idnhatky", id).then();
    }
  };
  const markAllAsRead = (ids: number[]) => {
    const updated = Array.from(new Set([...readAlertIds, ...ids]));
    saveReadAlerts(updated);
    const validIds = ids.filter((i) => i > 0);
    if (validIds.length > 0) supabase.from("nhatkyhoatdong").update({ da_doc: true }).in("idnhatky", validIds).then();
  };
  const fetchNodeDevices = useCallback(async (targetId: string) => {
    if (!targetId || targetId === "all") return;
    try {
      const { data, error } = await supabase.from("thietbi").select("*").eq("idnode", targetId).order("id_thietbi");
      if (!error && data) setNodeDevices(data as DeviceData[]);
      else if (!error) setNodeDevices([]);
    } catch (err) {
      console.error("Lỗi tải thiết bị phòng:", err);
    }
  }, []);
  const refreshSnapshot = useCallback(async () => {
    try {
      const [{ data: sensorRows }, { data: ruleRows }] = await Promise.all([
        supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(40),
        supabase.from("luat").select("*"),
      ]);
      if (sensorRows?.length) {
        const forCurrent = sensorRows.filter((r) => isRecordForNode(r, node));
        setSensors(forCurrent.length ? extractDynamicSensors(forCurrent, node) : {});
        setSensorHistory(forCurrent.length ? normalizeSensorHistory(forCurrent).slice(0, 30) : []);
        if (forCurrent[0]?.thoigian) setLastLivingTime(new Date(forCurrent[0].thoigian));
      }
      if (ruleRows?.length) {
        const next: Record<string, number> = {};
        ruleRows.forEach((r: any) => {
          if (r.ten_thong_so === "nhiet_do") next.temp = Number(r.nguong);
          if (r.ten_thong_so === "do_am") next.humid = Number(r.nguong);
          if (r.ten_thong_so === "anh_sang") next.light = Number(r.nguong);
        });
        setThresholds((prev) => ({ ...prev, ...next }));
      }
    } catch (e) {
      console.error("Lỗi refresh snapshot:", e);
    }
  }, [node]);
  useEffect(() => {
    void fetchNodeDevices(nodeId);
    void refreshSnapshot();
  }, [nodeId, fetchNodeDevices, refreshSnapshot]);
  // Khởi tạo Auth session & Realtime listeners
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from("nguoidung").select("*").eq("auth_uid", session.user.id).maybeSingle();
          const u = profile || { hoten: session.user.email?.split("@")[0] || "Người dùng", email: session.user.email || "", vaitro: "buyer" };
          setCurrentUser(u);
          // Tải danh sách cảnh báo từ nhật ký hoạt động
          const { data: logs } = await supabase.from("nhatkyhoatdong").select("*")
            .in("loai_thongbao", ["system_alert", "admin_notification"])
            .order("thoigian", { ascending: false }).limit(20);
          if (logs) {
            setAlerts(logs.map((l: any) => ({
              id: Number(l.idnhatky),
              ts: Date.parse(l.thoigian),
              title: l.hanhdong.includes("vượt ngưỡng") ? "Cảnh báo vượt ngưỡng" : "Thông báo hệ thống",
              detail: l.hanhdong,
              level: l.hanhdong.includes("Lỗi") ? "error" : "warn",
            })));
          }
        }
      } catch (err: any) {
        setConnectionError(`Lỗi kết nối cơ sở dữ liệu: ${err.message}`);
      } finally {
        setSessionLoading(false);
      }
    };
    void initAuth();
    // Kênh Realtime chung lắng nghe thay đổi thiết bị và cảm biến
    const realtimeChan = supabase.channel("dashboard-realtime-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "thietbi" }, (payload) => {
        const nextDev = payload.new as DeviceData;
        if (payload.eventType === "DELETE") {
          setNodeDevices((prev) => prev.filter((d) => d.id_thietbi !== (payload.old as any)?.id_thietbi));
        } else if (nextDev && nextDev.idnode === nodeId) {
          setNodeDevices((prev) => {
            const idx = prev.findIndex((d) => d.id_thietbi === nextDev.id_thietbi);
            if (idx >= 0) { const clone = [...prev]; clone[idx] = nextDev; return clone; }
            return [...prev, nextDev].sort((a, b) => a.id_thietbi - b.id_thietbi);
          });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dulieucambien" }, (payload) => {
        const record = payload.new;
        if (record && isRecordForNode(record, node)) {
          const m = parseSensorMetric(record);
          if (m) setSensors((prev) => ({ ...prev, [m.key]: { value: m.value, unit: m.unit, thoigian: record.thoigian } }));
          setSensorHistory((prev) => normalizeSensorHistory([record, ...prev]).slice(0, 30));
          setLastLivingTime(new Date(record.thoigian || Date.now()));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(realtimeChan);
    };
  }, [nodeId, node]);
  // Kết nối MQTT
  useEffect(() => {
    void initMqttClient();
    const unsub = onMqttStatus((st) => setMqttOnline(st === "online"));
    return () => unsub();
  }, []);
  // Ping kiểm tra Supabase mỗi 20s
  useEffect(() => {
    const timer = setInterval(async () => {
      const { error } = await supabase.from("thietbi").select("id_thietbi").limit(1);
      setSupabaseOnline(!error);
    }, 20000);
    return () => clearInterval(timer);
  }, []);
  // Ghi nhật ký hoạt động
  const logActivity = async (hanhdong: string, deviceId?: number) => {
    if (!currentUserId) return;
    try {
      await supabase.from("nhatkyhoatdong").insert([{
        id_thietbi: deviceId ?? null,
        idnguoidung: currentUserId,
        idnode: nodeId,
        loai_thongbao: "user_action",
        hanhdong,
      }]);
    } catch {}
  };
  const debounceTimers = useRef<Record<number, any>>({});
  const handleNodeDeviceConfigChange = useCallback((device: DeviceData, newConfig: Record<string, any>, isImmediate = false) => {
    const merged = { ...(device.cau_hinh || {}), ...newConfig };
    setNodeDevices((prev) => prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, cau_hinh: merged, tu_dong: false } : d));
    if (device.tu_dong) {
      const topic = getDeviceMqttTopic(device.loai_thietbi, device.idnode || nodeId);
      if (topic) mqttPublish(topic.auto, "OFF", 1).catch(() => {});
    }
    if (newConfig.speed !== undefined) publishDeviceProperty("quat", "speed", newConfig.speed, device.idnode || nodeId);
    if (newConfig.brightness !== undefined) publishDeviceProperty("den", "brightness", newConfig.brightness, device.idnode || nodeId);
    if (newConfig.position !== undefined) publishDeviceProperty("rem_cua", "position", newConfig.position, device.idnode || nodeId);
    const persist = async () => {
      await supabase.from("thietbi").update({ cau_hinh: merged, tu_dong: false, thoigian_capnhat: new Date().toISOString() }).eq("id_thietbi", device.id_thietbi);
    };
    if (debounceTimers.current[device.id_thietbi]) clearTimeout(debounceTimers.current[device.id_thietbi]);
    if (isImmediate) void persist();
    else debounceTimers.current[device.id_thietbi] = setTimeout(persist, 300);
  }, [nodeId]);
  const handleNodeDeviceToggle = async (device: DeviceData, on: boolean) => {
    const prevOn = device.trangthai;
    const name = device.ten_hienthi || device.loai_thietbi;
    setNodeDevices((prev) => prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, trangthai: on ? 1 : 0, tu_dong: false } : d));
    try {
      const topic = getDeviceMqttTopic(device.loai_thietbi, device.idnode || nodeId);
      if (topic) {
        mqttPublish(topic.auto, "OFF", 1).catch(() => {});
        mqttPublish(topic.ctrl, on ? "ON" : "OFF", 1).catch(() => {});
      }
      await supabase.from("thietbi").update({ trangthai: on ? 1 : 0, tu_dong: false }).eq("id_thietbi", device.id_thietbi);
      await logActivity(`${on ? "Bật" : "Tắt"} ${name} thủ công`, device.id_thietbi);
      toast.success(`Đã ${on ? "BẬT" : "TẮT"} ${name}`);
    } catch (err: any) {
      setNodeDevices((prev) => prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, trangthai: prevOn } : d));
      toast.error(`Lỗi điều khiển: ${err.message}`);
    }
  };
  // Đổi chế độ Tự động / Thủ công
  const handleNodeDeviceModeChange = async (device: DeviceData, mode: "auto" | "manual") => {
    const isAuto = mode === "auto";
    const name = device.ten_hienthi || device.loai_thietbi;
    setNodeDevices((prev) => prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, tu_dong: isAuto } : d));
    try {
      const topic = getDeviceMqttTopic(device.loai_thietbi, device.idnode || nodeId);
      if (topic) mqttPublish(topic.auto, isAuto ? "ON" : "OFF", 1).catch(() => {});
      await supabase.from("thietbi").update({ tu_dong: isAuto }).eq("id_thietbi", device.id_thietbi);
      await logActivity(`Chuyển ${name} sang chế độ ${isAuto ? "Tự động" : "Thủ công"}`, device.id_thietbi);
      toast.success(`Đã chuyển ${name} sang ${isAuto ? "Tự động" : "Thủ công"}`);
    } catch (err: any) {
      setNodeDevices((prev) => prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, tu_dong: !isAuto } : d));
      toast.error(`Lỗi chuyển chế độ: ${err.message}`);
    }
  };
  // Phím tắt Ctrl/Cmd + K mở Command Palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return {
    tab, setTab, node, nodeId, setNodeId, nodesList, currentUser, currentUserId, title,
    nodeDevices, legacySensors, sensorHistory, alerts, readAlertIds, markAsRead, markAllAsRead,
    bellPing, setBellPing, sessionLoading, mobileSidebarOpen, setMobileSidebarOpen, paletteOpen,
    setPaletteOpen, thresholds, lastSensorTime: lastLivingTime, supabaseOnline, mqttOnline,
    connectionError, setConnectionError, handleNodeDeviceToggle, handleNodeDeviceModeChange,
    handleNodeDeviceConfigChange,
  };
}