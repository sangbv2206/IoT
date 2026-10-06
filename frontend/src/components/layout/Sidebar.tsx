import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Cpu, ChevronLeft, ChevronRight, Wifi, WifiOff, CircleAlert } from "lucide-react";
import { TabKey } from "@/components/dashboard/shared/types";
import { BUYER_TABS } from "@/components/dashboard/shared/constants";
import { NodeSwitcher } from "./NodeSwitcher";
import { useNode } from "@/hooks/use-node-context";
import { supabase } from "@/lib/supabase";

export function Sidebar({
  tab,
  setTab,
  dark = false,
  alertCount,
  className,
  onCloseMobile,
  currentUserRole = "buyer",
  supabaseOnline = true,
  mqttOnline: mqttOnlineProp = true,
  ..._rest
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  dark?: boolean;
  alertCount: number;
  className?: string;
  onCloseMobile?: () => void;
  currentUserRole?: "admin" | "buyer" | string;
  supabaseOnline?: boolean;
  mqttOnline?: boolean;
  todLabel?: string;
  node?: any;
  setNodeId?: (id: string) => void;
  livingOnline?: boolean;
  bedroomOnline?: boolean;
  kitchenOnline?: boolean;
  nodesList?: any[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentNode } = useNode();
  const [nodeStatus, setNodeStatus] = useState<{ online: boolean; rssi: number | null }>({ online: false, rssi: null });

  // Polling trạng thái node hiện tại
  useEffect(() => {
    if (!currentNode?.id) return;

    const fetchNodeStatus = async () => {
      const { data } = await supabase
        .from("iot_nodes")
        .select("trang_thai, rssi")
        .eq("idnode", currentNode.id)
        .maybeSingle();

      if (data) {
        setNodeStatus({
          online: data.trang_thai === "online",
          rssi: data.rssi,
        });
      }
    };

    fetchNodeStatus();
    const interval = setInterval(fetchNodeStatus, 10000);
    return () => clearInterval(interval);
  }, [currentNode?.id]);

  const allTabs = BUYER_TABS;
  const secondaryKeys = ["settings"];
  const mainTabs = allTabs.filter((t) => !secondaryKeys.includes(t.key));
  const secondaryTabs = allTabs.filter((t) => secondaryKeys.includes(t.key));

  const renderTab = (item: { key: TabKey; label: string; icon: any }, compact = false) => {
    const active = tab === item.key;
    const Icon = item.icon;
    const showBadge = item.key === "notifications" && alertCount > 0;
    return (
      <button
        key={item.key}
        onClick={() => { setTab(item.key); onCloseMobile?.(); }}
        className={cn(
          "group flex items-center rounded-xl text-sm transition-all duration-150 cursor-pointer select-none",
          compact ? "px-3 py-2 font-medium" : "px-3 py-2.5 font-medium",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3",
          active
            ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/25 font-bold"
            : dark
              ? "text-slate-200 font-medium hover:bg-white/15 hover:text-white"
              : "text-slate-700 font-semibold hover:bg-slate-200/70 hover:text-slate-900",
        )}
        title={collapsed ? item.label : undefined}
      >
        <div className="relative flex items-center justify-center">
          <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-white" : dark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")} />
          {collapsed && showBadge && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-950" />
          )}
        </div>
        {!collapsed && <span className="truncate flex-1 text-left font-semibold">{item.label}</span>}
        {!collapsed && showBadge && (
          <span className={cn(
            "ml-auto grid min-w-[22px] h-[22px] place-items-center rounded-full px-1.5 text-[11px] font-extrabold tracking-tight",
            active ? "bg-white/25 text-white" : "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
          )}>
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col gap-3 p-3.5 border-r backdrop-blur-xl overflow-y-auto transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-16" : "w-64",
        dark ? "border-white/15 bg-slate-950/70 text-slate-100" : "border-slate-200/80 bg-white/85 text-slate-900 shadow-sm",
        className
      )}
    >
      {/* === ZONE TOP: Logo + Node + Main Nav === */}
      <div className="flex flex-col gap-3">
        {/* Header Logo */}
        <div className={cn("flex items-center gap-2.5 px-1 pt-1", collapsed && "justify-center")}>
          <button
            onClick={() => setTab("dashboard")}
            className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Về trang Bảng điều khiển"
          >
            <Cpu className="h-5 w-5" />
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-slate-300" : "text-slate-600")}>
                Cổng IoT
              </div>
              <div className={cn("truncate text-xs font-extrabold tracking-tight", dark ? "text-white" : "text-slate-900")}>
                Node ESP32-S3
              </div>
            </div>
          )}
          {!onCloseMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "shrink-0 flex items-center justify-center rounded-lg p-1.5 transition-all cursor-pointer hover:bg-slate-200/80 dark:hover:bg-white/15",
                collapsed && "hidden"
              )}
              title="Thu gọn"
            >
              <ChevronLeft className={cn("h-4 w-4", dark ? "text-slate-300" : "text-slate-700")} />
            </button>
          )}
        </div>

        {!onCloseMobile && collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded-xl p-2 transition-all cursor-pointer hover:bg-slate-200/80 dark:hover:bg-white/15"
            title="Mở rộng"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-indigo-500 animate-pulse" />
          </button>
        )}

        {/* Node Switcher */}
        <NodeSwitcher dark={dark} collapsed={collapsed} />

        {/* Main Nav */}
        <nav className="flex flex-col gap-1.5 mt-1">
          {mainTabs.map((item) => renderTab(item))}
        </nav>
      </div>

      {/* === ZONE BOTTOM: Secondary Nav + Status === */}
      <div className="flex flex-col gap-3 mt-auto pt-2">
        <div className={cn("border-t", dark ? "border-white/15" : "border-slate-300")} />

        <nav className="flex flex-col gap-1.5">
          {secondaryTabs.map((item) => renderTab(item, true))}
        </nav>

        {/* System Status Card */}
        {!collapsed && (
          <div className={cn(
            "rounded-xl border p-2.5 transition-all shadow-sm",
            dark ? "border-white/15 bg-white/10" : "border-slate-300 bg-slate-100/90",
          )}>
            <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between", dark ? "text-slate-300" : "text-slate-700")}>
              <span>Trạng thái kết nối</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", nodeStatus.online ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            </div>
            <div className="flex flex-col gap-1.5">

              <div className="flex items-center justify-between text-xs">
                <span className={cn("flex items-center gap-1.5 font-bold", dark ? "text-slate-200" : "text-slate-800")}>
                  <span className={cn("h-2 w-2 rounded-full shrink-0", nodeStatus.online ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-rose-500 animate-pulse")} />
                  Node hiện tại
                </span>
                <span className={cn("text-[11px] font-extrabold", nodeStatus.online ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {nodeStatus.online ? "Online" : "Offline"}
                </span>
              </div>

              {nodeStatus.online && (
                <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-300 dark:border-white/15 mt-0.5">
                  <Wifi className={cn("h-3 w-3 shrink-0", dark ? "text-emerald-400" : "text-emerald-600")} />
                  <span className={cn("text-[11px] font-semibold", dark ? "text-slate-300" : "text-slate-700")}>
                    WiFi: {nodeStatus.rssi ? `${nodeStatus.rssi} dBm` : "Ổn định"}
                  </span>
                </div>
              )}

              {alertCount > 0 && (
                <div className="flex items-center gap-2 pt-0.5">
                  <CircleAlert className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-amber-400" : "text-amber-600")} />
                  <span className={cn("text-xs font-bold", dark ? "text-amber-300" : "text-amber-700")}>
                    {alertCount} cảnh báo
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
