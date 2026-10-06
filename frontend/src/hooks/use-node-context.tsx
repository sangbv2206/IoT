import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getRoomTypeConfig } from "@/components/dashboard/shared/constants";

const LOCAL_STORAGE_KEY = "sh-current-node-id";

export interface NodeInfo {
  id: string;
  name: string;
  chip: string;
  icon: any;
  loai_phong?: string;
  trang_thai?: string;
  rssi?: number | null;
  last_heartbeat?: string | null;
  idnguoidung?: number | null;
}

interface NodeContextValue {
  currentNode: NodeInfo;
  currentNodeId: string;
  setCurrentNodeId: (id: string) => void;
  nodesList: NodeInfo[];
  nodesLoading: boolean;
  refreshNodes: (userId?: number, role?: string) => Promise<void>;
}

const fallbackNode: NodeInfo = {
  id: "",
  name: "Không có Node",
  chip: "",
  icon: null,
  trang_thai: "offline",
};

const NodeContext = createContext<NodeContextValue>({
  currentNode: fallbackNode,
  currentNodeId: "",
  setCurrentNodeId: () => {},
  nodesList: [],
  nodesLoading: true,
  refreshNodes: async () => {},
});

export const useNode = () => {
  const ctx = useContext(NodeContext);
  if (!ctx) throw new Error("useNode() must be used within a <NodeProvider>");
  return ctx;
};

export function NodeProvider({ children }: { children: ReactNode }) {
  const [currentNodeId, setCurrentNodeIdRaw] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(LOCAL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const [nodesList, setNodesList] = useState<NodeInfo[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const currentNodeIdRef = useRef(currentNodeId);
  currentNodeIdRef.current = currentNodeId;
  const cachedUserIdRef = useRef<number | null>(null);

  const setCurrentNodeId = useCallback((id: string) => {
    setCurrentNodeIdRaw(id);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, id);
      } catch {}
    }
  }, []);

  // Tải danh sách phòng/node của người dùng
  const refreshNodes = useCallback(async (userId?: number) => {
    setNodesLoading(true);
    try {
      let uid = userId ?? cachedUserIdRef.current;
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from("nguoidung").select("idnguoidung").eq("auth_uid", session.user.id).maybeSingle();
          if (profile?.idnguoidung) {
            uid = Number(profile.idnguoidung);
            cachedUserIdRef.current = uid;
          }
        }
      }

      let query = supabase.from("iot_nodes").select("*").neq("idnode", "SYSTEM_CONFIG").order("idnode", { ascending: true });
      if (uid && uid > 0) {
        query = query.or(`idnguoidung.eq.${uid},idnguoidung.is.null`);
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapped: NodeInfo[] = data.map((n) => {
          const roomConfig = getRoomTypeConfig(n.loai_phong || "phong_khac");
          return {
            id: n.idnode,
            name: n.ten_phong,
            chip: n.idnode,
            icon: roomConfig.icon,
            loai_phong: n.loai_phong,
            trang_thai: n.trang_thai || "offline",
            rssi: n.rssi,
            last_heartbeat: n.last_heartbeat,
            idnguoidung: n.idnguoidung,
          };
        });

        setNodesList(mapped);

        // Giữ nguyên phòng người dùng đã chọn (Chỉ đổi nếu phòng cũ đã bị xóa khỏi hệ thống)
        if (mapped.length > 0) {
          const exists = mapped.some((m) => m.id === currentNodeIdRef.current);
          if (!exists) {
            setCurrentNodeId(mapped[0].id);
          }
        } else {
          setCurrentNodeId("");
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách Node:", e);
    } finally {
      setNodesLoading(false);
    }
  }, [setCurrentNodeId]);

  // Khởi tạo ban đầu & Lắng nghe Realtime bảng iot_nodes
  useEffect(() => {
    void refreshNodes();

    const channel = supabase.channel("realtime-iot-nodes")
      .on("postgres_changes", { event: "*", schema: "public", table: "iot_nodes" }, () => {
        void refreshNodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNodes]);

  const currentNode = useMemo<NodeInfo>(() => {
    return nodesList.find((n) => n.id === currentNodeId) || nodesList[0] || fallbackNode;
  }, [currentNodeId, nodesList]);

  const value = useMemo<NodeContextValue>(() => ({
    currentNode,
    currentNodeId,
    setCurrentNodeId,
    nodesList,
    nodesLoading,
    refreshNodes,
  }), [currentNode, currentNodeId, setCurrentNodeId, nodesList, nodesLoading, refreshNodes]);

  return (
    <NodeContext.Provider value={value}>
      {children}
    </NodeContext.Provider>
  );
}
