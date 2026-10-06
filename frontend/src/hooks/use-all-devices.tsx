import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { DeviceData } from "@/components/dashboard/shared/types";
import { toast } from "sonner";

interface AllDevicesContextValue {
  devices: DeviceData[];
  loading: boolean;
  refreshDevices: () => Promise<void>;
  updateDeviceName: (
    deviceId: number,
    newName: string,
    oldName?: string,
    currentUserId?: number | null,
    currentNodeId?: string | null
  ) => Promise<boolean>;
}

const AllDevicesContext = createContext<AllDevicesContextValue>({
  devices: [],
  loading: true,
  refreshDevices: async () => {},
  updateDeviceName: async () => false,
});

export const useAllDevices = () => useContext(AllDevicesContext);

export function AllDevicesProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: any;
}) {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);

  // Tải danh sách thiết bị (Supabase RLS tự động phân quyền theo người dùng)
  const refreshDevices = useCallback(async () => {
    if (!currentUser) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("thietbi")
        .select("*")
        .order("id_thietbi");

      if (!error && data) {
        setDevices(data as DeviceData[]);
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách thiết bị:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Đồng bộ realtime bảng thietbi
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("global-thietbi-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thietbi" },
        (payload) => {
          const record = payload.new as DeviceData | undefined;
          const oldRecord = payload.old as Partial<DeviceData> | undefined;

          if (payload.eventType === "DELETE") {
            setDevices((prev) => prev.filter((d) => d.id_thietbi !== (oldRecord as any)?.id_thietbi));
          } else if (record) {
            setDevices((prev) => {
              const idx = prev.findIndex((d) => d.id_thietbi === record.id_thietbi);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = record;
                return next;
              }
              return [...prev, record].sort((a, b) => a.id_thietbi - b.id_thietbi);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const updateDeviceName = async (
    deviceId: number,
    newName: string,
    oldName?: string,
    currentUserId?: number | null,
    currentNodeId?: string | null
  ) => {
    const cleanName = newName.trim();
    if (!cleanName) {
      toast.error("Tên thiết bị không được để trống!");
      return false;
    }
    if (cleanName.length > 50) {
      toast.error("Tên thiết bị không được quá 50 ký tự!");
      return false;
    }

    try {
      const { error } = await supabase
        .from("thietbi")
        .update({ ten_hienthi: cleanName })
        .eq("id_thietbi", deviceId);

      if (error) throw error;

      const device = devices.find((d) => d.id_thietbi === deviceId);
      const prevName = oldName || device?.ten_hienthi || "Thiết bị";
      const logNode = currentNodeId || device?.idnode || null;
      const logUser = currentUserId ?? currentUser?.idnguoidung ?? null;

      await supabase.from("nhatkyhoatdong").insert([{
        id_thietbi: deviceId,
        idnguoidung: logUser,
        idnode: logNode,
        loai_thongbao: "user_action",
        hanhdong: `Đổi tên thiết bị "${prevName}" thành "${cleanName}"`,
        chi_tiet: JSON.stringify({
          loai_nhatky: "user_action",
          device_id: deviceId,
          old_name: prevName,
          new_name: cleanName,
          timestamp: new Date().toISOString(),
        }),
      }]);

      toast.success("Đổi tên thiết bị thành công!");
      return true;
    } catch (e: any) {
      console.error("Lỗi khi đổi tên thiết bị:", e);
      toast.error("Lỗi đổi tên thiết bị: " + e.message);
      return false;
    }
  };

  return (
    <AllDevicesContext.Provider value={{ devices, loading, refreshDevices, updateDeviceName }}>
      {children}
    </AllDevicesContext.Provider>
  );
}
