import { ShieldAlert, Thermometer, WifiOff, BellOff } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Switch } from "@/components/ui/switch";

interface SafetySettingsSectionProps {
  highTempAlert: boolean;
  onToggleHighTemp: (enabled: boolean) => void;
  nodeOfflineAlert: boolean;
  onToggleNodeOffline: (enabled: boolean) => void;
  dndNightEnabled: boolean;
  onToggleDnd: (enabled: boolean) => void;
}

export function SafetySettingsSection({
  highTempAlert,
  onToggleHighTemp,
  nodeOfflineAlert,
  onToggleNodeOffline,
  dndNightEnabled,
  onToggleDnd,
}: SafetySettingsSectionProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cảnh Báo An Toàn</h3>
            <p className="text-xs text-slate-500">Tự động phát cảnh báo khi các chỉ số đo lường vượt ngưỡng an toàn</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Cảnh báo nhiệt độ cao */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/15 text-orange-500">
                <Thermometer className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-slate-900 dark:text-white">
                  Cảnh báo nhiệt độ phòng quá cao
                </span>
                <span className="text-[11px] text-slate-500">
                  Thông báo khẩn khi nhiệt độ đo từ cảm biến &gt; 38°C
                </span>
              </div>
            </div>
            <Switch checked={highTempAlert} onCheckedChange={onToggleHighTemp} />
          </div>

          {/* Cảnh báo node offline */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                <WifiOff className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-slate-900 dark:text-white">
                  Cảnh báo thiết bị ngoại tuyến (Offline)
                </span>
                <span className="text-[11px] text-slate-500">
                  Thông báo khi Node ESP32 hoặc thiết bị bị mất kết nối mạng
                </span>
              </div>
            </div>
            <Switch checked={nodeOfflineAlert} onCheckedChange={onToggleNodeOffline} />
          </div>
        </div>
      </GlassCard>

      {/* Chế độ Không làm phiền ban đêm */}
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <BellOff className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Chế Độ Yên Tĩnh Ban Đêm</h3>
            <p className="text-xs text-slate-500">Tắt chuông thông báo không khẩn cấp trong giờ nghỉ ngơi</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
          <div>
            <span className="text-xs font-bold block text-slate-900 dark:text-white">
              Không làm phiền (23:00 - 06:00)
            </span>
            <span className="text-[11px] text-slate-500">
              Tắt tiếng tất cả thông báo trừ cảnh báo an toàn khẩn cấp
            </span>
          </div>
          <Switch checked={dndNightEnabled} onCheckedChange={onToggleDnd} />
        </div>
      </GlassCard>
    </div>
  );
}
