import type { DynamicSensors } from "@/components/dashboard/shared/types";

/* -------------------- 1. Kiểm tra & Parse Metric -------------------- */
export function isRecordForNode(
  r: any,
  node: { id?: string; chip?: string } | null | undefined
): boolean {
  if (!node?.id) return true;
  const nid = node.id, nchip = node.chip;
  if (r.idnode && (r.idnode === nid || (nchip && r.idnode === nchip))) return true;
  if (r.cambien_idnode && r.cambien_idnode === nid) return true;
  if (r.cambien && (r.cambien === nid || (nchip && r.cambien === nchip))) return true;
  if (!r.idnode && !r.cambien && !r.cambien_idnode) {
    return nid === "ESP32-S3-Node-01" || nid === "ESP32";
  }
  return false;
}

export function parseSensorMetric(
  r: any
): { key: string; value: number; unit: string; sensorModel?: string } | null {
  if (!r) return null;
  if (r.ten_thong_so && !isNaN(Number(r.gia_tri))) {
    return { key: r.ten_thong_so, value: Number(r.gia_tri), unit: r.don_vi || "", sensorModel: r.ten_cambien };
  }
  const fallback = r.nhietdo != null ? ["nhiet_do", r.nhietdo, "°C"] :
                   r.doam != null ? ["do_am", r.doam, "%"] :
                   r.anhsang != null ? ["anh_sang", r.anhsang, "lux"] : null;
  return fallback && !isNaN(Number(fallback[1]))
    ? { key: fallback[0] as string, value: Number(fallback[1]), unit: fallback[2] as string, sensorModel: r.cambien }
    : null;
}

export function extractDynamicSensors(
  rows: any[],
  targetNode: { id?: string; chip?: string } | null | undefined
): DynamicSensors {
  const result: DynamicSensors = {};
  const filtered = targetNode ? rows.filter((r) => isRecordForNode(r, targetNode)) : rows;
  for (const r of filtered) {
    if (r.ten_thong_so && !result[r.ten_thong_so] && !isNaN(Number(r.gia_tri))) {
      result[r.ten_thong_so] = { value: Number(r.gia_tri), unit: r.don_vi || "", ten_cambien: r.ten_cambien, thoigian: r.thoigian };
    } else {
      if (r.nhietdo != null && !result["nhiet_do"]) result["nhiet_do"] = { value: Number(r.nhietdo), unit: "°C", ten_cambien: r.cambien, thoigian: r.thoigian };
      if (r.doam != null && !result["do_am"]) result["do_am"] = { value: Number(r.doam), unit: "%", ten_cambien: r.cambien, thoigian: r.thoigian };
      if (r.anhsang != null && !result["anh_sang"]) result["anh_sang"] = { value: Number(r.anhsang), unit: "lux", ten_cambien: r.cambien, thoigian: r.thoigian };
    }
  }
  return result;
}

/* -------------------- 2. Gom nhóm & Chuẩn hóa Lịch sử -------------------- */
export function normalizeSensorRows(rawRows: any[]): any[] {
  const grouped = new Map<string, any>();
  for (const r of rawRows || []) {
    if (!r) continue;
    if (r.nhietdo != null || r.doam != null || r.diennang != null || r.power != null) {
      grouped.set(String(r.iddl || r.thoigian), { ...r, diennang: r.diennang ?? r.power });
      continue;
    }
    const timeKey = r.thoigian ? Math.floor(new Date(r.thoigian).getTime() / 5000) * 5000 : Date.now();
    const groupKey = `${r.idnode || r.cambien || "node"}_${timeKey}`;
    const entry = grouped.get(groupKey) || {
      iddl: r.iddl, idnode: r.idnode, cambien: r.idnode || r.cambien || "ESP32",
      thoigian: r.thoigian, metrics: {} as Record<string, number>,
      nhietdo: null, doam: null, anhsang: null, diennang: null,
    };
    const val = Number(r.gia_tri);
    if (!isNaN(val)) {
      const k = r.ten_thong_so;
      entry.metrics[k] = val;
      if (k === "nhiet_do" || k === "temp") entry.nhietdo = val;
      else if (k === "do_am" || k === "humid") entry.doam = val;
      else if (k === "anh_sang" || k === "light") entry.anhsang = val;
      else if (k === "dien_nang" || k === "power" || k === "cong_suat") entry.diennang = val;
    }
    if (r.nhietdo != null) entry.nhietdo = Number(r.nhietdo);
    if (r.doam != null) entry.doam = Number(r.doam);
    if (r.anhsang != null) entry.anhsang = Number(r.anhsang);
    grouped.set(groupKey, entry);
  }
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.thoigian).getTime() - new Date(a.thoigian).getTime()
  );
}

// Giữ lại alias để tương thích ngược với các file gọi normalizeSensorHistory
export const normalizeSensorHistory = normalizeSensorRows;

/* -------------------- 3. Ngưỡng cảnh báo & Thống kê -------------------- */
export const SENSOR_THRESHOLDS = {
  temp: 32,    // >= 32°C cảnh báo nóng
  humid: 80,   // >= 80% cảnh báo ẩm ướt
  light: 200,  // < 200 lx cảnh báo thiếu sáng
  power: 1500, // >= 1500 W cảnh báo quá tải
};

export function calculateAlertStats(history: any[]) {
  if (!history?.length) {
    return { alertCount: 0, safetyRate: 100, tempAlerts: 0, humidAlerts: 0, lightAlerts: 0, powerAlerts: 0 };
  }
  const today = new Date().toDateString();
  const subset = history.filter((h) => new Date(h.thoigian).toDateString() === today);
  const target = subset.length > 0 ? subset : history.slice(0, 100);

  let tempAlerts = 0, humidAlerts = 0, lightAlerts = 0, powerAlerts = 0;
  for (const r of target) {
    if (r.nhietdo != null && Number(r.nhietdo) >= SENSOR_THRESHOLDS.temp) tempAlerts++;
    if (r.doam != null && (Number(r.doam) >= SENSOR_THRESHOLDS.humid || Number(r.doam) <= 40)) humidAlerts++;
    if (r.anhsang != null && Number(r.anhsang) < SENSOR_THRESHOLDS.light) lightAlerts++;
    const p = r.diennang ?? r.power;
    if (p != null && Number(p) >= SENSOR_THRESHOLDS.power) powerAlerts++;
  }

  const alertCount = tempAlerts + humidAlerts + lightAlerts + powerAlerts;
  const totalChecks = target.length * 4;
  const safetyRate = totalChecks
    ? Math.max(0, Math.min(100, Math.round(((totalChecks - alertCount) / totalChecks) * 100)))
    : 100;

  return { alertCount, safetyRate, tempAlerts, humidAlerts, lightAlerts, powerAlerts };
}

export function calculateAvgInterval(history: any[]): string {
  if (history.length < 2) return "Đang tính...";
  let sum = 0, count = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const diff = Math.abs(new Date(history[i].thoigian).getTime() - new Date(history[i + 1].thoigian).getTime());
    if (diff < 300000) { sum += diff; count++; }
  }
  return count > 0 ? `~${Math.round(sum / count / 1000)} giây/lần` : "Không ổn định";
}

export function calculateComfortScore(history: any[]) {
  if (!history?.length) return { score: 100, status: "Chưa rõ", color: "#64748b" };
  const temp = Number(history[0].nhietdo), humid = Number(history[0].doam);
  if (isNaN(temp) || isNaN(humid)) return { score: 100, status: "Chưa rõ", color: "#64748b" };

  const tempPen = temp < 22 ? (22 - temp) * 6 : temp > 26 ? (temp - 26) * 6 : 0;
  const humidPen = humid < 45 ? (45 - humid) * 1.5 : humid > 60 ? (humid - 60) * 1.5 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - tempPen - humidPen)));

  const status = score < 40 ? "Không thoải mái" : score < 70 ? "Hơi khó chịu" : score < 85 ? "Khá thoải mái" : "Rất thoải mái";
  const color = score < 40 ? "#ef4444" : score < 70 ? "#f59e0b" : "#10b981";
  return { score, status, color };
}

/* -------------------- 4. Tổng hợp Dữ liệu Biểu đồ -------------------- */
export function aggregateSensorChartData(
  chartData: any[],
  history: any[],
  range: "today" | "7d" | "30d",
  deviceFilter: string
): any[] {
  if (chartData?.length && !chartData.every((d) => d.temp == null && d.humid == null && d.light == null)) {
    return chartData.map((d) => ({
      ...d,
      temp: d.temp != null ? +Number(d.temp).toFixed(1) : null,
      humid: d.humid != null ? +Number(d.humid).toFixed(1) : null,
      light: d.light != null ? Math.round(Number(d.light)) : null,
      power: d.power != null ? Math.round(Number(d.power)) : (d.diennang != null ? Math.round(Number(d.diennang)) : 0),
    }));
  }
  if (!history?.length) return [];

  const relevant = deviceFilter === "all" ? history : history.filter((h) => h.idnode === deviceFilter || h.cambien === deviceFilter);
  if (!relevant.length) return [];

  const avg = (arr: number[]) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null);
  const isToday = range === "today";
  const buckets = new Map<string, { label: string; t: number[]; h: number[]; l: number[]; p: number[] }>();

  if (isToday) {
    const curH = new Date().getHours();
    for (let h = 0; h <= curH; h++) {
      buckets.set(String(h), { label: `${String(h).padStart(2, "0")}:00`, t: [], h: [], l: [], p: [] });
    }
  } else {
    const days = range === "7d" ? 7 : 30;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, t: [], h: [], l: [], p: [] });
    }
  }

  const todayStr = new Date().toDateString();
  for (const r of relevant) {
    const d = new Date(r.thoigian);
    const key = isToday ? String(d.getHours()) : d.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (isToday && d.toDateString() !== todayStr && relevant.length >= 50) continue;
    if (r.nhietdo != null && !isNaN(Number(r.nhietdo))) b.t.push(Number(r.nhietdo));
    if (r.doam != null && !isNaN(Number(r.doam))) b.h.push(Number(r.doam));
    if (r.anhsang != null && !isNaN(Number(r.anhsang))) b.l.push(Number(r.anhsang));
    const p = r.diennang ?? r.power;
    if (p != null && !isNaN(Number(p))) b.p.push(Number(p));
  }

  return Array.from(buckets.values()).map((b) => ({
    label: b.label,
    temp: avg(b.t),
    humid: avg(b.h),
    light: b.l.length ? Math.round(b.l.reduce((x, y) => x + y, 0) / b.l.length) : null,
    power: b.p.length ? Math.round(b.p.reduce((x, y) => x + y, 0) / b.p.length) : null,
  }));
}

export function calculateQuickStats(
  aggregatedChartData: any[],
  history: any[],
  selectedMetric: string
) {
  const key = selectedMetric === "all" ? "temp" : selectedMetric;
  const values: number[] = [];

  aggregatedChartData.forEach((d) => {
    if (d[key] != null && !isNaN(Number(d[key]))) values.push(Number(d[key]));
  });

  if (!values.length && history?.length) {
    history.forEach((h) => {
      const v = key === "temp" ? h.nhietdo : key === "humid" ? h.doam : key === "light" ? h.anhsang : (h.diennang ?? h.power);
      if (v != null && !isNaN(Number(v))) values.push(Number(v));
    });
  }

  const unit = key === "temp" ? "°C" : key === "humid" ? "%" : key === "light" ? "lx" : "W";
  const isInt = key === "light" || key === "power";
  if (!values.length) return { min: "--", avg: "--", max: "--", diffVal: "0", isIncrease: false, unit };

  const min = Math.min(...values), max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid), second = values.slice(mid);
  const fAvg = first.length ? first.reduce((a, b) => a + b, 0) / first.length : avg;
  const sAvg = second.length ? second.reduce((a, b) => a + b, 0) / second.length : avg;
  const diff = sAvg - fAvg;
  const fmt = (n: number) => (isInt ? Math.round(n).toString() : n.toFixed(1));

  return {
    min: fmt(min), avg: fmt(avg), max: fmt(max),
    diffVal: fmt(Math.abs(diff)), isIncrease: diff >= 0, unit,
  };
}

/* -------------------- 5. Xuất báo cáo CSV -------------------- */
export function exportSensorCSV(records: any[]): void {
  const header = "\uFEFFsep=,\n\"STT\",\"Ngày\",\"Giờ\",\"Nhiệt độ (°C)\",\"Độ ẩm (%)\",\"Ánh sáng (lx)\",\"Điện năng (W)\",\"Thiết bị gửi\"\n";
  const rows = records.map((r) => {
    const d = new Date(r.rawTime);
    const valid = !isNaN(d.getTime());
    const dateStr = valid ? `\t${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : `\t${r.time}`;
    const timeStr = valid ? `\t${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}` : "";
    return `"${r.id}","${dateStr}","${timeStr}","${r.temp}","${r.humid}","${r.light}","${r.power}","${r.device}"`;
  }).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thong-ke-cam-bien-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
