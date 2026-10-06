import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  normalizeSensorRows,
  aggregateSensorChartData,
  calculateQuickStats,
  exportSensorCSV,
} from "@/lib/sensorUtils";
import { LucideIcon, Layers, Thermometer, Droplets, Sun } from "lucide-react";

export type RangeType = "today" | "7d" | "30d";

export interface MetricTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  unit: string;
  color: string;
}

export const METRIC_TABS: MetricTabItem[] = [
  { id: "all", label: "Tất cả thông số", icon: Layers, unit: "", color: "#6366f1" },
  { id: "temp", label: "Nhiệt độ", icon: Thermometer, unit: "°C", color: "#f43f5e" },
  { id: "humid", label: "Độ ẩm", icon: Droplets, unit: "%", color: "#0ea5e9" },
  { id: "light", label: "Ánh sáng", icon: Sun, unit: "lx", color: "#f59e0b" },
];

export interface FormattedHistoryRow {
  id: number;
  time: string;
  rawTime: string;
  temp: string;
  humid: string;
  light: string;
  device: string;
  _date: Date;
}

interface UseSensorsDataProps {
  currentNodeId: string;
}

export function useSensorsData({ currentNodeId }: UseSensorsDataProps) {
  const [range, setRange] = useState<RangeType>("today");
  const [deviceFilter, setDeviceFilter] = useState<string>(currentNodeId || "all");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [history, setHistory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  // Bộ lọc lịch sử & phân trang
  const [histDateFilter, setHistDateFilter] = useState<string>("");
  const [histHourFilter, setHistHourFilter] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (currentNodeId) setDeviceFilter(currentNodeId);
  }, [currentNodeId]);

  // Tải lịch sử đo đạc từ Supabase
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("dulieucambien")
        .select("*")
        .order("thoigian", { ascending: false });

      if (deviceFilter && deviceFilter !== "all") {
        query = query.eq("idnode", deviceFilter);
      }

      if (histDateFilter) {
        const startOfDay = new Date(`${histDateFilter}T00:00:00`).toISOString();
        const endOfDay = new Date(`${histDateFilter}T23:59:59.999`).toISOString();
        query = query.gte("thoigian", startOfDay).lte("thoigian", endOfDay).limit(1000);
      } else {
        const limit = range === "7d" ? 500 : range === "30d" ? 1000 : 100;
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (!error && data) {
        setHistory(normalizeSensorRows(data));
      }
    } catch (e) {
      console.error("Lỗi khi tải lịch sử cảm biến:", e);
    } finally {
      setLoading(false);
    }
  }, [deviceFilter, histDateFilter, range]);

  // Tải dữ liệu biểu đồ qua RPC
  const fetchChartData = useCallback(async (isSilent = false) => {
    if (!isSilent) setChartLoading(true);
    try {
      const targetNode = deviceFilter !== "all" ? deviceFilter : null;
      const { data, error } = await supabase.rpc("get_sensor_trend", {
        range_type: range,
        p_node_id: targetNode,
      });
      if (!error && data) setChartData(data);
    } catch (e) {
      console.error("Lỗi RPC get_sensor_trend:", e);
    } finally {
      if (!isSilent) setChartLoading(false);
    }
  }, [deviceFilter, range]);

  useEffect(() => {
    fetchHistory();
    fetchChartData(false);

    const channel = supabase
      .channel("sensors-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dulieucambien" },
        (payload) => {
          const newRec = payload.new as any;
          if (deviceFilter === "all" || newRec.idnode === deviceFilter) {
            setHistory((prev) => normalizeSensorRows([newRec, ...prev]).slice(0, 100));
            fetchChartData(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory, fetchChartData, deviceFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deviceFilter, range, histDateFilter, histHourFilter]);

  const aggregatedChartData = useMemo(
    () => aggregateSensorChartData(chartData, history, range, deviceFilter),
    [chartData, history, range, deviceFilter]
  );

  const quickStats = useMemo(
    () => calculateQuickStats(aggregatedChartData, history, selectedMetric),
    [selectedMetric, aggregatedChartData, history]
  );

  const filtered = useMemo<FormattedHistoryRow[]>(() => {
    const sorted = [...history].sort((a, b) => Number(b.iddl) - Number(a.iddl));
    return sorted
      .map((h) => ({
        id: Number(h.iddl),
        time: new Date(h.thoigian).toLocaleString("vi-VN"),
        rawTime: h.thoigian,
        temp: h.nhietdo != null && !isNaN(Number(h.nhietdo)) ? Number(h.nhietdo).toFixed(1) : "--",
        humid: h.doam != null && !isNaN(Number(h.doam)) ? Number(h.doam).toFixed(0) : "--",
        light: h.anhsang != null && !isNaN(Number(h.anhsang)) ? Math.round(Number(h.anhsang)).toString() : "--",
        device: h.idnode || "Node-01",
        _date: new Date(h.thoigian),
      }))
      .filter((r) => {
        if (deviceFilter !== "all" && r.device !== deviceFilter) return false;
        if (histDateFilter) {
          const y = r._date.getFullYear();
          const m = String(r._date.getMonth() + 1).padStart(2, "0");
          const d = String(r._date.getDate()).padStart(2, "0");
          if (`${y}-${m}-${d}` !== histDateFilter) return false;
        }
        if (histHourFilter !== -1 && r._date.getHours() !== histHourFilter) return false;
        return true;
      });
  }, [history, deviceFilter, histDateFilter, histHourFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Không có dữ liệu để xuất file CSV");
      return;
    }
    exportSensorCSV(filtered);
    toast.success("Đã xuất file CSV thành công!");
  };

  return {
    range,
    setRange,
    deviceFilter,
    setDeviceFilter,
    selectedMetric,
    setSelectedMetric,
    loading,
    chartLoading,
    aggregatedChartData,
    quickStats,
    histDateFilter,
    setHistDateFilter,
    histHourFilter,
    setHistHourFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filtered,
    paginatedData,
    totalPages,
    handleExportCSV,
  };
}
