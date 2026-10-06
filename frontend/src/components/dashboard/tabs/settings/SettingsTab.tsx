import { Sliders, Home, ShieldAlert, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { useAllDevices } from "@/hooks/use-all-devices";
import { useNode } from "@/hooks/use-node-context";
import { useSettingsState } from "./useSettingsState";
import { HomeSettingsSection } from "./HomeSettingsSection";
import { SafetySettingsSection } from "./SafetySettingsSection";
import { SystemSettingsSection } from "./SystemSettingsSection";

export function SettingsTab({
  currentUser,
}: {
  currentUserRole?: string;
  currentUser?: any;
}) {
  const { devices, updateDeviceName } = useAllDevices();
  const { nodesList } = useNode();
  const settings = useSettingsState(currentUser);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <GlassCard className="p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/70 to-sky-50/60 dark:from-slate-900/95 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200/80 dark:border-white/10 shadow-lg text-slate-800 dark:text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sliders className="h-3.5 w-3.5" />
              <span>Thiết Lập Vận Hành</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Cài Đặt Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-xl">
              Quản lý không gian sống, thiết lập cảnh báo an toàn cảm biến và cấu hình hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold space-y-0.5">
              <span className="text-[10px] text-slate-400 block uppercase">Vị trí thời tiết</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {settings.city}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Categories Tabs Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <button
          type="button"
          onClick={() => settings.setActiveCategory("home")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            settings.activeCategory === "home"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Home className="h-4 w-4" />
          <span>Ngôi nhà & Thiết bị</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {devices.length} thiết bị
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => settings.setActiveCategory("safety")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            settings.activeCategory === "safety"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Cảnh báo & An toàn</span>
        </button>

        <button
          type="button"
          onClick={() => settings.setActiveCategory("system")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            settings.activeCategory === "system"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Sliders className="h-4 w-4" />
          <span>Hệ thống & Đo lường</span>
        </button>
      </div>

      {/* Tab Panels */}
      {settings.activeCategory === "home" && (
        <HomeSettingsSection
          homeName={settings.homeName}
          setHomeName={settings.setHomeName}
          savingHome={settings.savingHome}
          onSaveHomeName={settings.handleSaveHomeName}
          city={settings.city}
          onCityChange={settings.handleCityChange}
          nodesList={nodesList}
          devices={devices}
          onRenameDevice={updateDeviceName}
          currentUserId={currentUser?.idnguoidung ? Number(currentUser.idnguoidung) : null}
        />
      )}

      {settings.activeCategory === "safety" && (
        <SafetySettingsSection
          highTempAlert={settings.highTempAlert}
          onToggleHighTemp={settings.handleHighTempToggle}
          nodeOfflineAlert={settings.nodeOfflineAlert}
          onToggleNodeOffline={settings.handleNodeOfflineToggle}
          dndNightEnabled={settings.dndNightEnabled}
          onToggleDnd={settings.handleDndToggle}
        />
      )}

      {settings.activeCategory === "system" && (
        <SystemSettingsSection
          tempUnit={settings.tempUnit}
          onTempUnitChange={settings.handleTempUnitChange}
          sensorInterval={settings.sensorInterval}
          onIntervalChange={settings.handleIntervalChange}
        />
      )}
    </div>
  );
}

export default SettingsTab;
