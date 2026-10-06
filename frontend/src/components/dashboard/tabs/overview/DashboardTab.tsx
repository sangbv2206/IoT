import React, { useMemo } from "react";
import { useAnimatedNumber } from "@/hooks/use-smart-home";
import { DigitalClockCard } from "@/components/dashboard/widgets/DigitalClockCard";
import { WeatherCard } from "@/components/dashboard/widgets/WeatherCard";
import { ScenesCard } from "@/components/dashboard/tabs/scenes/SmartScenesCard";
import { DeviceControls } from "@/components/dashboard/tabs/devices/DeviceControls";
import { Sensors, DeviceData } from "@/components/dashboard/shared/types";
import { SensorCardGrid, SensorCardData } from "./SensorCardGrid";

export interface DashboardTabProps {
  sensors: Sensors;
  sensorHistory?: any[];
  nodeName?: string;
  nodeId?: string;
  thresholds?: Record<string, number>;
  nodeDevices?: DeviceData[];
  onNodeDeviceToggle?: (device: DeviceData, on: boolean) => void;
  onNodeDeviceModeChange?: (device: DeviceData, mode: "auto" | "manual") => void;
  onNodeDeviceUpdateConfig?: (device: DeviceData, newConfig: Record<string, any>, isImmediate?: boolean) => void;
  [key: string]: any;
}

export function DashboardTab({
  sensors,
  nodeName = "Phòng khách",
  nodeId = "living",
  thresholds,
  nodeDevices = [],
  onNodeDeviceToggle,
  onNodeDeviceModeChange,
  onNodeDeviceUpdateConfig,
  currentUser,
}: DashboardTabProps) {
  const tempA = useAnimatedNumber(sensors.temp);
  const humidA = useAnimatedNumber(sensors.humid);
  const lightA = useAnimatedNumber(sensors.light);

  const hasTemp = sensors.temp != null;
  const hasHumid = sensors.humid != null;
  const hasLight = sensors.light != null;

  const tempThreshold = thresholds?.temp ?? 30;
  const humidThreshold = thresholds?.humid ?? 75;
  const lightThreshold = thresholds?.light ?? 200;

  const sensorCards: SensorCardData[] = useMemo(
    () => [
      {
        key: "temp",
        label: "Nhiệt độ phòng",
        value: hasTemp ? tempA.toFixed(1) : "--",
        rawValue: sensors.temp ?? 0,
        max: 50,
        unit: "°C",
        alert: hasTemp ? sensors.temp! >= tempThreshold : false,
        hasRealData: hasTemp,
      },
      {
        key: "humid",
        label: "Độ ẩm không khí",
        value: hasHumid ? Math.round(humidA).toString() : "--",
        rawValue: sensors.humid ?? 0,
        max: 100,
        unit: "%",
        alert: hasHumid ? sensors.humid! >= humidThreshold : false,
        hasRealData: hasHumid,
      },
      {
        key: "light",
        label: "Ánh sáng phòng",
        value: hasLight ? Math.round(lightA).toString() : "--",
        rawValue: sensors.light ?? 0,
        max: 2000,
        unit: "lx",
        alert: hasLight ? sensors.light! < lightThreshold : false,
        hasRealData: hasLight,
      },
    ],
    [hasTemp, tempA, sensors.temp, tempThreshold, hasHumid, humidA, sensors.humid, humidThreshold, hasLight, lightA, sensors.light, lightThreshold]
  );

  return (
    <div className="space-y-5 max-w-[1680px] mx-auto pb-10">
      {/* KHỐI 1: TỔNG QUAN, ĐO LƯỜNG & KỊCH BẢN */}
      <div className="relative rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT 1 (4/12): THỜI GIAN & THỜI TIẾT */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
            <DigitalClockCard />
            <WeatherCard location={`${nodeName} (Hà Nội)`} />
          </div>

          {/* CỘT 2 (5/12): 3 THẺ CẢM BIẾN */}
          <SensorCardGrid cards={sensorCards} />

          {/* CỘT 3 (3/12): KỊCH BẢN THÔNG MINH */}
          <div className="lg:col-span-3 flex flex-col">
            <ScenesCard nodeId={nodeId} currentUser={currentUser} />
          </div>
        </div>
      </div>

      {/* KHỐI 2: ĐIỀU KHIỂN THIẾT BỊ */}
      <div className="w-full pt-2">
        <DeviceControls
          nodeId={nodeId}
          nodeName={nodeName}
          devices={nodeDevices}
          onToggle={(dev, on) => onNodeDeviceToggle?.(dev, on)}
          onModeChange={(dev, mode) => onNodeDeviceModeChange?.(dev, mode)}
          onUpdateConfig={onNodeDeviceUpdateConfig}
        />
      </div>
    </div>
  );
}

export default DashboardTab;
