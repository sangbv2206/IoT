import { useState } from "react";
import { Home, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITIES, getDeviceTypeConfig } from "@/components/dashboard/shared/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DeviceData } from "@/components/dashboard/shared/types";

interface HomeSettingsSectionProps {
  homeName: string;
  setHomeName: (name: string) => void;
  savingHome: boolean;
  onSaveHomeName: () => void;
  city: string;
  onCityChange: (city: string) => void;
  nodesList: Array<{ id: string; name: string }>;
  devices: DeviceData[];
  onRenameDevice: (
    devId: number,
    newName: string,
    oldName: string,
    userId: number | null,
    nodeId: string | null
  ) => Promise<boolean>;
  currentUserId: number | null;
}

function DeviceRenameRow({
  device,
  node,
  currentUserId,
  onRename,
}: {
  device: DeviceData;
  node: { id: string; name: string };
  currentUserId: number | null;
  onRename: HomeSettingsSectionProps["onRenameDevice"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(device.ten_hienthi || "");
  const [loading, setLoading] = useState(false);
  const cfg = getDeviceTypeConfig(device.loai_thietbi);
  const Icon = cfg.icon;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Tên thiết bị không được để trống!");
      return;
    }
    setLoading(true);
    const ok = await onRename(device.id_thietbi, name.trim(), device.ten_hienthi || "", currentUserId, node.id);
    setLoading(false);
    if (ok) setIsEditing(false);
  };

  return (
    <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white", cfg.gradient)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs bg-white dark:bg-slate-900"
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          ) : (
            <>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {device.ten_hienthi || cfg.label}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {cfg.label} · HW: {device.dia_chi_hw || "N/A"}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setIsEditing(false)} disabled={loading}>
              Hủy
            </Button>
            <Button size="sm" className="h-7 px-2.5 text-[10px] font-bold bg-indigo-600 text-white" onClick={handleSave} disabled={loading}>
              {loading ? "Lưu..." : "Lưu"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-[10px] font-semibold" onClick={() => setIsEditing(true)}>
            Đổi tên
          </Button>
        )}
      </div>
    </div>
  );
}

export function HomeSettingsSection({
  homeName,
  setHomeName,
  savingHome,
  onSaveHomeName,
  city,
  onCityChange,
  nodesList,
  devices,
  onRenameDevice,
  currentUserId,
}: HomeSettingsSectionProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tên nhà & Vị trí thời tiết */}
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Không Gian Sống</h3>
            <p className="text-xs text-slate-500">Tùy chỉnh tên ngôi nhà và vị trí dự báo thời tiết</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên ngôi nhà:</label>
            <div className="flex gap-2">
              <Input
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="Căn hộ thông minh..."
                className="text-xs font-medium"
              />
              <Button
                size="sm"
                onClick={onSaveHomeName}
                disabled={savingHome}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 text-xs"
              >
                {savingHome ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Vị trí thời tiết:
            </label>
            <Select value={city} onValueChange={onCityChange}>
              <SelectTrigger className="text-xs bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Danh sách phòng & Thiết bị */}
      <GlassCard className="p-6 space-y-4 border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Phòng & Thiết Bị</h3>
              <p className="text-xs text-slate-500">Đổi tên hiển thị cho từng thiết bị theo thói quen sử dụng</p>
            </div>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {nodesList.length} phòng
          </Badge>
        </div>

        <div className="space-y-6 pt-2">
          {nodesList.map((node) => {
            const nodeDevs = devices.filter((d) => d.idnode === node.id);
            return (
              <div key={node.id} className="space-y-3">
                <div className="flex items-center justify-between border-l-2 border-indigo-500 pl-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{node.name}</span>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        ● Node ESP32
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-slate-400">ID: {node.id}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {nodeDevs.length} thiết bị
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {nodeDevs.map((dev) => (
                    <DeviceRenameRow
                      key={dev.id_thietbi}
                      device={dev}
                      node={node}
                      currentUserId={currentUserId}
                      onRename={onRenameDevice}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
