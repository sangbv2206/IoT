import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  X, Sun, Fan, Blinds, Tv, Activity, ArrowUp, ArrowDown, Square,
  Volume2, VolumeX, ChevronUp, ChevronDown, Plus, Minus, Power
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DeviceData } from "../../shared/types";

interface DeviceModalProps {
  device: DeviceData | null;
  nodeId?: string;
  onClose: () => void;
  onToggle: (device: DeviceData, on: boolean) => void;
  onModeChange?: (device: DeviceData, mode: "auto" | "manual") => void;
  onUpdateConfig?: (device: DeviceData, newConfig: Record<string, any>, isImmediate?: boolean) => void;
  publishDeviceCommand: (loai: string, topicKey: string, payload: any) => void;
}

const TV_CHANNELS = [
  { id: 1, name: "VTV1 HD", show: "Thời sự 19:00" },
  { id: 2, name: "VTV3 HD", show: "Gala Cười" },
  { id: 3, name: "HBO HD", show: "Phim điện ảnh" },
  { id: 4, name: "DISCOVERY", show: "Khám phá" },
  { id: 5, name: "CARTOON", show: "Hoạt hình" },
  { id: 6, name: "K+ SPORT", show: "Bóng đá" },
  { id: 7, name: "VTV2 HD", show: "Khoa học" },
  { id: 8, name: "MUSIC HD", show: "Ca nhạc" },
];

export function DeviceModal({
  device,
  nodeId,
  onClose,
  onToggle,
  onModeChange,
  onUpdateConfig,
  publishDeviceCommand,
}: DeviceModalProps) {
  if (!device) return null;

  const loai = device.loai_thietbi;
  const isOn = device.trangthai === 1;

  // Giá trị cấu hình theo loại thiết bị
  const initialValue =
    loai === "den"
      ? (device.cau_hinh?.brightness ?? 80)
      : loai === "quat"
      ? (device.cau_hinh?.speed ?? 2)
      : loai === "rem_cua"
      ? (device.cau_hinh?.position ?? 75)
      : 0;

  const [value, setValue] = useState<number>(initialValue);
  const isInteractingRef = useRef(false);
  const timerRef = useRef<any>(null);

  // Trạng thái Tivi đơn giản
  const [tvChannel, setTvChannel] = useState<number>(() => Number(device.cau_hinh?.channel) || 1);
  const [tvVolume, setTvVolume] = useState<number>(() => Number(device.cau_hinh?.volume) || 25);
  const [tvMuted, setTvMuted] = useState<boolean>(false);

  useEffect(() => {
    if (!isInteractingRef.current) {
      if (loai === "den" && device.cau_hinh?.brightness != null) setValue(device.cau_hinh.brightness);
      else if (loai === "quat" && device.cau_hinh?.speed != null) setValue(device.cau_hinh.speed);
      else if (loai === "rem_cua" && device.cau_hinh?.position != null) setValue(device.cau_hinh.position);
    }
    if (loai === "tivi") {
      if (device.cau_hinh?.channel != null) setTvChannel(Number(device.cau_hinh.channel));
      if (device.cau_hinh?.volume != null) setTvVolume(Number(device.cau_hinh.volume));
    }
  }, [device.cau_hinh, loai]);

  const updateProperty = (val: number, isFinal: boolean) => {
    setValue(val);
    isInteractingRef.current = true;

    if (!isOn && val > 0) onToggle(device, true);

    if (timerRef.current) clearTimeout(timerRef.current);

    const propKey = loai === "den" ? "brightness" : loai === "quat" ? "speed" : "position";

    if (isFinal) {
      if (device.tu_dong && onModeChange) {
        onModeChange(device, "manual");
      }
      onUpdateConfig?.(device, { [propKey]: val }, true);
      timerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
      }, 2500);
    }
  };

  // Điều khiển Tivi
  const sendTvCmd = (cmd: string, nextCh?: number, nextVol?: number) => {
    if (!isOn) onToggle(device, true);
    publishDeviceCommand("tivi", "ctrl", cmd);

    const updatePayload: Record<string, any> = {};
    if (nextCh !== undefined) {
      setTvChannel(nextCh);
      updatePayload.channel = nextCh;
    }
    if (nextVol !== undefined) {
      setTvVolume(nextVol);
      updatePayload.volume = nextVol;
    }
    if (Object.keys(updatePayload).length > 0) {
      onUpdateConfig?.(device, updatePayload, true);
    }
  };

  const currentChannel = TV_CHANNELS.find((c) => c.id === tvChannel) || TV_CHANNELS[0];

  const Icon = loai === "den" ? Sun : loai === "quat" ? Fan : loai === "rem_cua" ? Blinds : loai === "tivi" ? Tv : Activity;
  const gradient =
    loai === "den"
      ? "from-amber-400 to-orange-500"
      : loai === "quat"
      ? "from-sky-400 to-cyan-500"
      : loai === "rem_cua"
      ? "from-indigo-500 to-blue-600"
      : "from-purple-500 to-indigo-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 text-slate-900 dark:text-white animate-in zoom-in-95 duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br", gradient)}>
              <Icon className={cn("h-5 w-5", isOn && loai === "quat" && "animate-spin", isOn && loai === "den" && "animate-pulse")} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{device.ten_hienthi || "Thiết bị"}</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {nodeId ? `Node ${nodeId}` : ""} {device.dia_chi_hw ? `· ${device.dia_chi_hw}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full grid place-items-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ĐÈN */}
        {loai === "den" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-4xl font-black text-amber-500 tabular-nums">{value}%</div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Độ sáng đèn</span>
              <div className="mt-3">
                <Slider
                  value={[value]}
                  min={5}
                  max={100}
                  step={5}
                  onValueChange={([v]) => updateProperty(v, false)}
                  onValueCommit={([v]) => updateProperty(v, true)}
                  className="cursor-pointer py-1"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {[20, 50, 80, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateProperty(p, true)}
                    className={cn(
                      "py-1 rounded-lg text-xs font-bold border transition cursor-pointer",
                      value === p
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QUẠT */}
        {loai === "quat" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
              <div className="text-4xl font-black text-sky-500 tabular-nums">Số {value}</div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {value === 1 ? "Gió nhẹ" : value === 2 ? "Gió vừa" : "Gió mạnh"}
              </span>
              <div className="mt-3">
                <Slider
                  value={[value]}
                  min={1}
                  max={3}
                  step={1}
                  onValueChange={([v]) => updateProperty(v, false)}
                  onValueCommit={([v]) => updateProperty(v, true)}
                  className="cursor-pointer py-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => updateProperty(lvl, true)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold border transition cursor-pointer",
                      value === lvl && isOn
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    Số {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RÈM CỬA */}
        {loai === "rem_cua" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
              <div className="text-4xl font-black text-indigo-500 tabular-nums">{value}%</div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {value === 100 ? "Mở hoàn toàn" : value === 0 ? "Đóng kín" : `Mở ${value}%`}
              </span>
              <div className="mt-3">
                <Slider
                  value={[value]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => updateProperty(v, false)}
                  onValueCommit={([v]) => updateProperty(v, true)}
                  className="cursor-pointer py-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (device.tu_dong && onModeChange) onModeChange(device, "manual");
                    updateProperty(100, true);
                  }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5 mr-1" /> Mở
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (device.tu_dong && onModeChange) onModeChange(device, "manual");
                    publishDeviceCommand("rem_cua", "ctrl", "STOP");
                  }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Square className="h-3 w-3 mr-1 fill-current" /> Dừng
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (device.tu_dong && onModeChange) onModeChange(device, "manual");
                    updateProperty(0, true);
                  }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5 mr-1" /> Đóng
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SMART TIVI ĐƠN GIẢN */}
        {loai === "tivi" && (
          <div className="space-y-3">
            {/* Chuyển Kênh */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                Kênh {tvChannel} · {currentChannel.name}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {currentChannel.show}
              </span>
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = tvChannel <= 1 ? TV_CHANNELS.length : tvChannel - 1;
                    sendTvCmd("CH_DOWN", next);
                  }}
                  className="flex-1 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 mr-1" /> CH -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = tvChannel >= TV_CHANNELS.length ? 1 : tvChannel + 1;
                    sendTvCmd("CH_UP", next);
                  }}
                  className="flex-1 rounded-xl text-xs font-bold cursor-pointer"
                >
                  CH + <ChevronUp className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {TV_CHANNELS.slice(0, 4).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => sendTvCmd(`CH:${ch.id}`, ch.id)}
                    className={cn(
                      "py-1 rounded-lg text-xs font-bold border transition cursor-pointer truncate px-1",
                      tvChannel === ch.id && isOn
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Âm Lượng */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                {tvMuted ? "Tắt tiếng" : `${tvVolume}%`}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Âm lượng tivi
              </span>
              <div className="mt-2.5">
                <Slider
                  value={[tvVolume]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => {
                    setTvVolume(v);
                    setTvMuted(false);
                  }}
                  onValueCommit={([v]) => sendTvCmd(`VOL:${v}`, undefined, v)}
                  className="cursor-pointer py-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = Math.max(0, tvVolume - 5);
                    sendTvCmd("VOL_DOWN", undefined, next);
                  }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5 mr-0.5" /> VOL -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTvMuted(!tvMuted);
                    sendTvCmd("MUTE");
                  }}
                  className={cn(
                    "rounded-xl text-xs font-bold cursor-pointer",
                    tvMuted && "bg-rose-500 text-white border-rose-500"
                  )}
                >
                  {tvMuted ? <VolumeX className="h-3.5 w-3.5 mr-0.5" /> : <Volume2 className="h-3.5 w-3.5 mr-0.5" />}
                  {tvMuted ? "Bật tiếng" : "Tắt tiếng"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = Math.min(100, tvVolume + 5);
                    sendTvCmd("VOL_UP", undefined, next);
                  }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-0.5" /> VOL +
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Chế độ Tự động (chỉ hiển thị cho đèn, quạt, rèm — Tivi không cần tự động) */}
        {onModeChange && loai !== "tivi" && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs">
              <span className="font-bold flex items-center gap-1.5">
                Chế độ tự động
                {Boolean(device.tu_dong) ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                    BẬT
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                    TẮT
                  </span>
                )}
              </span>
              <span className="text-slate-400 text-[11px]">Chỉ tự động theo cảm biến khi bạn bật công tắc này</span>
            </div>
            <Switch
              checked={Boolean(device.tu_dong)}
              onCheckedChange={(v) => onModeChange(device, v ? "auto" : "manual")}
            />
          </div>
        )}

        {/* Nút Bật/Tắt nguồn lớn */}
        <Button
          onClick={() => {
            const next = !isOn;
            if (device.tu_dong && onModeChange) onModeChange(device, "manual");
            onToggle(device, next);
          }}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-2",
            isOn
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          )}
        >
          <Power className="h-4 w-4" />
          {isOn ? `Tắt ${device.ten_hienthi || "Thiết bị"}` : `Bật ${device.ten_hienthi || "Thiết bị"}`}
        </Button>
      </div>
    </div>
  );
}

export default DeviceModal;
