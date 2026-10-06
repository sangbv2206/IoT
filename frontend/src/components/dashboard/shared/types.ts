export type TabKey =
  | "dashboard"
  | "scenes"
  | "sensors"
  | "activity"
  | "schedule"
  | "notifications"
  | "settings";

// ─── 1. Bảng nguoidung ───────────────────────────────────────────────────────
export type UserData = {
  idnguoidung: number;
  auth_uid?: string | null;
  hoten: string;
  email: string;
  anhdaidien?: string | null;
  ngaysinh?: string | null;
  sodienthoai?: string | null;
  vaitro: "buyer" | "admin" | string;
  trang_thai: "active" | "suspended" | string;
  thoigian?: string;
};

// ─── 2. Bảng hogiadinh & thanhvien_hogiadinh ─────────────────────────────────
export type HouseholdData = {
  id_hogiadinh: number;
  ten_nha: string;
  dia_chi: string | null;
  id_chuho: number | null;
  thoigian_tao: string;
};

export type HouseholdMemberData = {
  id_thanhvien: number;
  id_hogiadinh: number;
  idnguoidung: number;
  vaitro: "owner" | "member";
  quyen_dieu_khien: "full_control" | "view_only";
  thoigian_thamgia: string;
  nguoidung?: {
    hoten: string;
    email: string;
    anhdaidien: string | null;
  };
};

export type InviteCodeData = {
  id_ma: number;
  id_hogiadinh: number;
  ma_moi: string;
  quyen_dieu_khien: "full_control" | "view_only";
  expires_at: string;
  is_used: boolean;
  used_by: number | null;
  thoigian_su_dung?: string | null;
  thoigian_tao: string;
};

// ─── 3. Bảng iot_nodes ───────────────────────────────────────────────────────
export type NodeData = {
  idnode: string;
  idnguoidung?: number | null;
  id_hogiadinh: number | null;
  ten_phong: string;
  loai_phong: string;
  trang_thai: "online" | "offline" | string;
  last_heartbeat: string | null;
  rssi: number | null;
};

// ─── 4. Bảng thietbi ────────────────────────────────────────────────────────
export type DeviceData = {
  id_thietbi: number;
  idnode: string;
  loai_thietbi: string; // 'den' | 'quat' | 'rem_cua' | 'tivi' | 'khac'
  ten_hienthi: string | null;
  dia_chi_hw: string | null;
  trangthai: number;             // 0: Tắt, 1: Bật
  tu_dong: boolean;              // true: Tự động, false: Thủ công
  cau_hinh: Record<string, any>; // Cấu hình động: {threshold, brightness, speed, position...}
  thoigian_tao?: string;
  thoigian_capnhat?: string;
};

export type NodeWithDevices = NodeData & {
  thietbi: DeviceData[];
};

// ─── 5. Bảng dulieucambien (Time-Series Metric Log) ──────────────────────────
export type SensorMetricData = {
  iddl: number;
  idnode: string;
  ten_cambien: string;   // 'DHT11' | 'BH1750' | 'MQ-2'...
  ten_thong_so: string;  // 'nhiet_do' | 'do_am' | 'anh_sang' | 'gas_ppm'...
  gia_tri: number;
  don_vi: string | null; // '°C' | '%' | 'lux'...
  thoigian: string;
};

/** Dữ liệu cảm biến thời gian thực */
export type DynamicSensorReading = {
  value: number;
  unit: string;
  ten_cambien?: string;
  thoigian?: string;
};

export type DynamicSensors = Record<string, DynamicSensorReading>;

// ─── 6. Bảng luat (Automation Rules) ─────────────────────────────────────────
export type RuleData = {
  idluat: number;
  id_thietbi: number;
  ten_thong_so: string;  // 'nhiet_do' | 'do_am' | 'anh_sang'...
  toantu: ">=" | "<=" | ">" | "<" | "=" | string;
  nguong: number;
  hanhdong: number;      // 1: Bật, 0: Tắt
  automation: boolean;
  thietbi?: DeviceData;
};

export type AutomationRuleData = RuleData;

// ─── 7. Bảng lichhengio ─────────────────────────────────────────────────────
export type ScheduleData = {
  idid: number;
  id_thietbi: number;
  hanhdong: "on" | "off" | string;
  thoigian: string;      // Format "HH:mm"
  thu: number[];         // 0=CN, 1=T2, ..., 6=T7
  kichhoat: boolean;
  thoigian_tao?: string;
  thietbi?: DeviceData;
};

// ─── 8. Bảng kichban (Smart Scenes) ─────────────────────────────────────────
export type SceneData = {
  id_kichban: number;
  idnguoidung?: number | null;
  id_hogiadinh?: number | null;
  idnode?: string | null;
  ten_kichban: string;
  mo_ta?: string | null;
  icon: string;
  kichhoat: boolean;
  cau_hinh_thietbi: Record<string, any>;
  luat_cambien?: Record<string, any> | null;
  thoigian_tao?: string;
  thoigian_capnhat?: string;
  // Aliases tương thích ngược
  idkichban?: number;
  kich_hoat?: boolean;
};

// ─── 9. Bảng nhatkyhoatdong (Activity & Security Logs) ──────────────────────
export type ActivityLogData = {
  idnhatky: number;
  idcambien?: number | null;
  idnguoidung?: number | null;
  ten_nguoi_thaotac?: string | null;
  idnode?: string | null;
  id_thietbi?: number | null;
  hanhdong: string;
  loai_thongbao: "user_action" | "system_alert" | "admin_notification" | "technical_alert" | string;
  chi_tiet?: string | null;
  ip_address?: string | null;
  thoigian: string;
};

// ─── 10. Bảng voice_profiles & voice_command_history (Voice AI) ─────────────
export type VoiceProfileData = {
  id: string;
  idnguoidung?: number | null;
  name: string;
  role: string;
  embedding: string;
  samples_count?: number;
  embedding_dim?: number;
  created_at?: string;
  updated_at?: string;
};

export type VoiceCommandHistoryData = {
  id: number;
  session_id?: string | null;
  idnguoidung?: number | null;
  user_name?: string | null;
  role?: string | null;
  transcript: string;
  device?: string | null;
  action?: string | null;
  parameters?: Record<string, any>;
  cosine_similarity?: number | null;
  threshold?: number | null;
  verified: boolean;
  status: string;
  mqtt_published: boolean;
  latency_ms?: number | null;
  created_at: string;
};

// ─── Tương thích ngược với UI components ────────────────────────────────────
export type DeviceState = { on: boolean; mode: "auto" | "manual" };
export type Devices = {
  fan: DeviceState;
  light: DeviceState;
  [key: string]: DeviceState | undefined;
};
export type Sensors = { temp: number | null; humid: number | null; light: number | null };
export type Alert = { id: number; ts: number; title: string; detail: string; level: "error" | "warn" | "info" };
