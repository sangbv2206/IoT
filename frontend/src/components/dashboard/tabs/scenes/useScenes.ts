import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { mqttPublish } from "@/lib/mqttClient";

export interface DeviceConfigItem {
  enabled: boolean;
  state: boolean;
  brightness?: number;
  speed?: number;
  position?: number;
}

export interface SmartScene {
  id: string;
  name: string;
  subtitle?: string;
  desc?: string;
  iconName?: string;
  isCustom?: boolean;
  devices: {
    den?: DeviceConfigItem;
    quat?: DeviceConfigItem;
    rem_cua?: DeviceConfigItem;
    tivi?: DeviceConfigItem;
    [key: string]: DeviceConfigItem | undefined;
  };
}

export const DEFAULT_SCENES: SmartScene[] = [
  {
    id: "home",
    name: "Về nhà",
    desc: "Bật đèn 80% · Quạt số 2 · Mở rèm 100%",
    iconName: "Home",
    devices: {
      den: { enabled: true, state: true, brightness: 80 },
      quat: { enabled: true, state: true, speed: 2 },
      rem_cua: { enabled: true, state: true, position: 100 },
      tivi: { enabled: false, state: false },
    },
  },
  {
    id: "leave",
    name: "Rời nhà",
    desc: "Tắt toàn bộ thiết bị · Đóng rèm · Tắt Tivi",
    iconName: "LogOut",
    devices: {
      den: { enabled: true, state: false, brightness: 0 },
      quat: { enabled: true, state: false, speed: 1 },
      rem_cua: { enabled: true, state: true, position: 0 },
      tivi: { enabled: true, state: false },
    },
  },
  {
    id: "movie",
    name: "Xem phim",
    desc: "Đèn dịu 20% · Đóng rèm · Quạt êm · Bật Tivi",
    iconName: "Film",
    devices: {
      den: { enabled: true, state: true, brightness: 20 },
      quat: { enabled: true, state: true, speed: 1 },
      rem_cua: { enabled: true, state: true, position: 0 },
      tivi: { enabled: true, state: true },
    },
  },
  {
    id: "sleep",
    name: "Đi ngủ",
    desc: "Tắt đèn · Đóng rèm · Quạt dịu êm · Tắt Tivi",
    iconName: "Moon",
    devices: {
      den: { enabled: true, state: false, brightness: 0 },
      quat: { enabled: true, state: true, speed: 1 },
      rem_cua: { enabled: true, state: true, position: 0 },
      tivi: { enabled: true, state: false },
    },
  },
];

let _globalActiveSceneId: string | null = null;
const _sceneListeners = new Set<(id: string | null) => void>();

export function setGlobalActiveSceneId(id: string | null) {
  _globalActiveSceneId = id;
  _sceneListeners.forEach((fn) => fn(id));
}

export function useScenes({
  targetNodeId = "living",
  currentUser,
}: {
  targetNodeId?: string;
  currentUser?: any;
}) {
  const [scenes, setScenes] = useState<SmartScene[]>(DEFAULT_SCENES);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(_globalActiveSceneId);
  const [operatingId, setOperatingId] = useState<string | null>(null);

  useEffect(() => {
    const listener = (id: string | null) => setActiveSceneId(id);
    _sceneListeners.add(listener);
    return () => { _sceneListeners.delete(listener); };
  }, []);

  const fetchScenes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("kichban").select("*").order("id_kichban", { ascending: true });
      if (!error && data?.length) {
        setScenes(
          data.map((r) => ({
            id: String(r.id_kichban),
            name: r.ten_kichban,
            desc: r.mo_ta || "",
            iconName: r.icon || "Home",
            isCustom: true,
            devices: (r.cau_hinh_thietbi as any) || {},
          }))
        );
        return;
      }
    } catch {}

    try {
      const saved = localStorage.getItem(`sh_scenes_${currentUser?.idnguoidung || "guest"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setScenes(parsed);
          return;
        }
      }
    } catch {}

    setScenes(DEFAULT_SCENES);
  }, [currentUser?.idnguoidung]);

  useEffect(() => {
    fetchScenes();
    const chanId = `scenes-rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const chan = supabase
      .channel(chanId)
      .on("postgres_changes", { event: "*", schema: "public", table: "kichban" }, () => fetchScenes())
      .subscribe();
    return () => {
      supabase.removeChannel(chan);
    };
  }, [fetchScenes]);

  const saveLocal = (updated: SmartScene[]) => {
    setScenes(updated);
    try {
      localStorage.setItem(`sh_scenes_${currentUser?.idnguoidung || "guest"}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveScene = async (scene: SmartScene) => {
    if (!scene.name.trim()) {
      toast.error("Vui lòng nhập tên kịch bản!");
      return false;
    }

    const exists = scenes.some((s) => s.id === scene.id);
    if (exists) {
      saveLocal(scenes.map((s) => (s.id === scene.id ? scene : s)));
      if (!isNaN(Number(scene.id))) {
        await supabase
          .from("kichban")
          .update({
            ten_kichban: scene.name.trim(),
            mo_ta: scene.desc?.trim() || "",
            icon: scene.iconName,
            cau_hinh_thietbi: scene.devices,
          })
          .eq("id_kichban", Number(scene.id));
      }
      toast.success(`Đã cập nhật "${scene.name}"!`);
    } else {
      let createdScene = scene;
      try {
        const { data } = await supabase
          .from("kichban")
          .insert([
            {
              ten_kichban: scene.name.trim(),
              mo_ta: scene.desc?.trim() || "",
              icon: scene.iconName,
              cau_hinh_thietbi: scene.devices,
              idnguoidung: currentUser?.idnguoidung || null,
              idnode: targetNodeId || null,
            },
          ])
          .select();
        if (data && data[0]?.id_kichban) {
          createdScene = { ...scene, id: String(data[0].id_kichban) };
        }
      } catch {}
      saveLocal([...scenes, createdScene]);
      toast.success(`Đã tạo "${scene.name}"!`);
    }
    return true;
  };

  const handleDeleteScene = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    saveLocal(scenes.filter((s) => s.id !== id));
    if (_globalActiveSceneId === id) setGlobalActiveSceneId(null);
    if (!isNaN(Number(id))) {
      await supabase.from("kichban").delete().eq("id_kichban", Number(id));
    }
    toast.info("Đã xóa kịch bản.");
  };

  const handleToggleScene = async (scene: SmartScene) => {
    if (operatingId) return;
    const isOff = _globalActiveSceneId === scene.id;
    setOperatingId(scene.id);
    try {
      const actions = {
        light: scene.devices.den?.enabled ? { on: !isOff && scene.devices.den.state, brightness: scene.devices.den.brightness } : undefined,
        fan: scene.devices.quat?.enabled ? { on: !isOff && scene.devices.quat.state, speed: scene.devices.quat.speed } : undefined,
        curtain: scene.devices.rem_cua?.enabled ? { position: isOff ? 0 : (scene.devices.rem_cua.position ?? 100) } : undefined,
        tv: scene.devices.tivi?.enabled ? { on: !isOff && scene.devices.tivi.state } : undefined,
      };
      const payload = JSON.stringify({
        scene_id: scene.id,
        scene_name: scene.name,
        node_id: targetNodeId,
        actions,
        is_deactivate: isOff,
        timestamp: Date.now(),
      });
      await mqttPublish(targetNodeId ? `buivansang_iot_pj/${targetNodeId}/scene` : `buivansang_iot_pj/scene`, payload, 1);
      setGlobalActiveSceneId(isOff ? null : scene.id);
      toast.success(isOff ? `Đã tắt "${scene.name}"` : `Đã kích hoạt "${scene.name}"!`);
    } catch {
      toast.error("Lỗi gửi MQTT!");
    } finally {
      setOperatingId(null);
    }
  };

  return { scenes, activeSceneId, operatingId, handleSaveScene, handleDeleteScene, handleToggleScene };
}
