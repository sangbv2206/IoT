import React, { useState, useMemo } from "react";
import { Sliders } from "lucide-react";
import { DeviceData } from "@/components/dashboard/shared/types";
import { mqttPublish, getDeviceMqttTopic, publishDeviceProperty } from "@/lib/mqttClient";
import { DeviceGrid } from "./DeviceGrid";
import { DeviceModal } from "./DeviceModal";

export interface DeviceControlsProps {
  nodeId?: string;
  nodeName?: string;
  devices: DeviceData[];
  onToggle: (device: DeviceData, on: boolean) => void;
  onModeChange: (device: DeviceData, mode: "auto" | "manual") => void;
  onUpdateConfig?: (device: DeviceData, newConfig: Record<string, any>, isImmediate?: boolean) => void;
}

export function DeviceControls({
  nodeId,
  nodeName,
  devices = [],
  onToggle,
  onModeChange,
  onUpdateConfig,
}: DeviceControlsProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);

  // Chỉ lấy thiết bị chấp hành (không phải cảm biến)
  const controllableDevices = useMemo(
    () => devices.filter((dev) => !dev.loai_thietbi?.startsWith("cam_bien")),
    [devices]
  );

  // Gửi lệnh MQTT
  const publishDeviceCommand = (loai: string, topicKey: string, payload: any) => {
    if (topicKey === "speed" || topicKey === "brightness" || topicKey === "position") {
      publishDeviceProperty(loai, topicKey as any, payload, nodeId);
      return;
    }
    const topics = getDeviceMqttTopic(loai, nodeId);
    const globalTopics = getDeviceMqttTopic(loai);
    const pStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (topics) mqttPublish(topics.ctrl, pStr);
    if (globalTopics && globalTopics.ctrl !== topics?.ctrl) mqttPublish(globalTopics.ctrl, pStr);
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-500" />
            Điều khiển Thiết bị {nodeName || (nodeId ? `Node ${nodeId}` : "")}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bấm thẻ để điều chỉnh chi tiết · Gạt switch để bật/tắt nhanh
          </p>
        </div>
        <span className="text-[10.5px] font-bold text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
          {controllableDevices.length} THIẾT BỊ
        </span>
      </div>

      {/* Lưới thiết bị */}
      <DeviceGrid
        devices={controllableDevices}
        onSelectDevice={setSelectedDevice}
        onToggle={onToggle}
        onModeChange={onModeChange}
      />

      {/* Modal chi tiết nếu có thiết bị được chọn */}
      {selectedDevice && (
        <DeviceModal
          device={devices.find((d) => d.id_thietbi === selectedDevice.id_thietbi) || selectedDevice}
          nodeId={nodeId}
          onClose={() => setSelectedDevice(null)}
          onToggle={onToggle}
          onModeChange={onModeChange}
          onUpdateConfig={onUpdateConfig}
          publishDeviceCommand={publishDeviceCommand}
        />
      )}
    </div>
  );
}

export default DeviceControls;
