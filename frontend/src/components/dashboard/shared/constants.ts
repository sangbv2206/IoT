import { TabKey } from "./types";
import {
  LayoutDashboard,
  LineChart as LineChartIcon,
  CalendarClock,
  History,
  Settings as SettingsIcon,
  Home,
  Moon,
  Sunrise,
  Sun,
  Fan,
  Tv,
  Blinds,
  Layers,
  Users2,
  Droplets,
  Box,
  Thermometer,
  Flame,
  Wind,
  Gauge,
  Cpu,
  Activity,
  Lightbulb,
} from "lucide-react";

// ============================================================
// Danh sách Tab hệ thống
// ============================================================
export const BUYER_TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "dashboard",  label: "Bảng điều khiển",   icon: LayoutDashboard },
  { key: "scenes",     label: "Kịch bản ngữ cảnh", icon: Layers },
  { key: "sensors",    label: "Dữ liệu cảm biến",  icon: LineChartIcon },
  { key: "schedule",   label: "Lịch hẹn giờ",      icon: CalendarClock },
  { key: "activity",   label: "Lịch sử hoạt động", icon: History },
  { key: "settings",   label: "Cài đặt hệ thống",  icon: SettingsIcon },
];

export const ADMIN_TABS = BUYER_TABS;
export const TABS = BUYER_TABS;

// ============================================================
// Cấu hình hiển thị theo loại phòng (loai_phong trong CSDL)
// ============================================================
export const KNOWN_ROOM_TYPES: Record<string, { label: string; icon: any; gradient: string }> = {
  phong_khach: { label: "Phòng khách",  icon: Home,     gradient: "from-blue-500 to-indigo-500" },
};

export const ROOM_TYPE_CONFIG = KNOWN_ROOM_TYPES;

export function getRoomTypeConfig(loai: string, customRoomName?: string | null) {
  const norm = (loai || "").toLowerCase().trim();
  if (KNOWN_ROOM_TYPES[norm]) {
    return {
      ...KNOWN_ROOM_TYPES[norm],
      label: customRoomName?.trim() || KNOWN_ROOM_TYPES[norm].label,
    };
  }
  return {
    label: customRoomName?.trim() || (loai ? loai.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Khu vực khác"),
    icon: Box,
    gradient: "from-slate-500 to-gray-500",
  };
}


export interface DeviceTypeMeta {
  label: string;
  icon: any;
  gradient: string;
  glow: string;
}

export const KNOWN_DEVICE_TYPES: Record<string, DeviceTypeMeta> = {
  den:     { label: "Đèn",         icon: Lightbulb, gradient: "from-amber-400 to-yellow-300", glow: "rgba(251,191,36,0.4)" },
  quat:    { label: "Quạt",        icon: Fan,       gradient: "from-sky-400 to-cyan-300",     glow: "rgba(56,189,248,0.4)" },
  rem_cua: { label: "Rèm cửa",     icon: Blinds,    gradient: "from-indigo-400 to-blue-400",  glow: "rgba(99,102,241,0.4)" },
  tivi:    { label: "Smart Tivi",  icon: Tv,        gradient: "from-purple-500 to-indigo-500", glow: "rgba(168,85,247,0.4)" },
  khac:    { label: "Thiết bị",    icon: Box,       gradient: "from-slate-400 to-gray-300",   glow: "rgba(148,163,184,0.4)" },
};

export const DEVICE_TYPE_CONFIG = KNOWN_DEVICE_TYPES;

/**
 * Lấy config hiển thị của loại thiết bị (Hoàn toàn DYNAMIC suy diễn theo từ khóa, không hardcode thiết bị ảo)
 */
export function getDeviceTypeConfig(loai: string): DeviceTypeMeta {
  if (!loai) return KNOWN_DEVICE_TYPES.khac;
  const norm = loai.toLowerCase().trim();
  if (KNOWN_DEVICE_TYPES[norm]) return KNOWN_DEVICE_TYPES[norm];

  // Suy luận dynamic theo từ khóa thực tế:
  if (norm.includes("den") || norm.includes("light") || norm.includes("led")) {
    return { label: "Đèn", icon: Lightbulb, gradient: "from-amber-400 to-yellow-300", glow: "rgba(251,191,36,0.4)" };
  }
  if (norm.includes("quat") || norm.includes("fan")) {
    return { label: "Quạt", icon: Fan, gradient: "from-sky-400 to-cyan-300", glow: "rgba(56,189,248,0.4)" };
  }
  if (norm.includes("rem") || norm.includes("curtain") || norm.includes("cua")) {
    return { label: "Rèm cửa", icon: Blinds, gradient: "from-indigo-400 to-blue-400", glow: "rgba(99,102,241,0.4)" };
  }
  if (norm.includes("tv") || norm.includes("tivi")) {
    return { label: "Smart Tivi", icon: Tv, gradient: "from-purple-500 to-indigo-500", glow: "rgba(168,85,247,0.4)" };
  }

  // Tự động chuyển slug snake_case thành Title Case cho thiết bị mới thêm
  const autoLabel = norm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: autoLabel, icon: Box, gradient: "from-slate-400 to-gray-300", glow: "rgba(148,163,184,0.4)" };
}

/**
 * Lấy label hiển thị của thiết bị: Ưu tiên tên người dùng đặt (ten_hienthi) trước, sau đó mới đến loại thiết bị
 */
export function getDeviceTypeLabel(loai: string, customName?: string | null): string {
  if (customName && customName.trim()) return customName.trim();
  return getDeviceTypeConfig(loai).label;
}

// ============================================================
// Cấu hình giao diện theo thông số cảm biến động (ten_thong_so trong CSDL)
// Ngưỡng cảnh báo (threshold) và toán tử nằm ở CSDL (bảng luat), không code cứng ở đây!
// ============================================================
export interface SensorParamMeta {
  label: string;
  unit: string;
  icon: any;
  gradient: string;
}

export const KNOWN_SENSOR_PARAMS: Record<string, SensorParamMeta> = {
  nhiet_do: { label: "Nhiệt độ",     unit: "°C",  icon: Thermometer, gradient: "from-rose-500 to-orange-400" },
  do_am:    { label: "Độ ẩm",        unit: "%",   icon: Droplets,    gradient: "from-sky-500 to-cyan-400" },
  anh_sang: { label: "Ánh sáng",     unit: "lux", icon: Sun,         gradient: "from-amber-400 to-yellow-300" },
  gas_ppm:  { label: "Khí Gas",      unit: "ppm", icon: Flame,       gradient: "from-red-500 to-amber-500" },
  co2:      { label: "Nồng độ CO2",  unit: "ppm", icon: Wind,        gradient: "from-emerald-500 to-teal-400" },
  ap_suat:  { label: "Áp suất khí",  unit: "hPa", icon: Gauge,       gradient: "from-teal-500 to-cyan-400" },
  cpu_temp: { label: "Nhiệt độ CPU", unit: "°C",  icon: Cpu,         gradient: "from-purple-500 to-indigo-400" },
  rssi:     { label: "Sóng Wi-Fi",   unit: "dBm", icon: Activity,    gradient: "from-blue-500 to-cyan-400" },
};

export const SENSOR_PARAM_CONFIG = KNOWN_SENSOR_PARAMS;

/**
 * Lấy metadata hiển thị của bất kỳ thông số cảm biến nào.
 * Hoàn toàn DYNAMIC: Tự suy diễn icon, unit và màu sắc nếu là thông số mới từ Node gửi lên.
 */
export function getSensorMetadata(paramKey: string, fallbackUnit?: string): SensorParamMeta {
  const normKey = (paramKey || "").toLowerCase().trim().replace(/[\s-]/g, "_");
  const found = KNOWN_SENSOR_PARAMS[normKey];
  if (found) {
    return {
      ...found,
      unit: fallbackUnit || found.unit,
    };
  }

  // Tự động suy luận visual metadata
  let icon: any = Activity;
  let unit = fallbackUnit || "";
  let gradient = "from-indigo-500 to-violet-500";

  if (normKey.includes("temp") || normKey.includes("nhiet")) {
    icon = Thermometer; unit = unit || "°C"; gradient = "from-rose-500 to-orange-400";
  } else if (normKey.includes("hum") || normKey.includes("am")) {
    icon = Droplets; unit = unit || "%"; gradient = "from-sky-500 to-cyan-400";
  } else if (normKey.includes("lux") || normKey.includes("sang") || normKey.includes("light")) {
    icon = Sun; unit = unit || "lux"; gradient = "from-amber-400 to-yellow-300";
  } 

  const autoLabel = paramKey
    ? paramKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Cảm biến";

  return {
    label: autoLabel,
    unit,
    icon,
    gradient,
  };
}

export const CITIES = [
  { name: "Hà Nội", lat: 21.0285, lon: 105.8542 },
  { name: "TP. Hồ Chí Minh", lat: 10.8231, lon: 106.6297 },
  { name: "Đà Nẵng", lat: 16.0544, lon: 108.2022 },
  { name: "Hải Phòng", lat: 20.8449, lon: 106.6881 },
  { name: "Cần Thơ", lat: 10.0452, lon: 105.7469 },
  { name: "Nha Trang", lat: 12.2388, lon: 109.1967 },
  { name: "Đà Lạt", lat: 11.9404, lon: 108.4583 },
  { name: "Huế", lat: 16.4637, lon: 107.5909 },
];
