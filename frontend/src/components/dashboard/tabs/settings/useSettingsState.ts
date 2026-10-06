import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CITIES } from "@/components/dashboard/shared/constants";

export function useSettingsState(currentUser?: any) {
  const [activeCategory, setActiveCategory] = useState<"home" | "safety" | "system">("home");

  // 1. Ngôi nhà & Vị trí
  const [homeName, setHomeName] = useState("Ngôi nhà thông minh");
  const [savingHome, setSavingHome] = useState(false);
  const [city, setCity] = useState(CITIES[0]?.name || "Hà Nội");

  // 2. An toàn & Cảnh báo
  const [highTempAlert, setHighTempAlert] = useState(true);
  const [nodeOfflineAlert, setNodeOfflineAlert] = useState(true);
  const [dndNightEnabled, setDndNightEnabled] = useState(false);

  // 3. Hệ thống & Đo lường
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [sensorInterval, setSensorInterval] = useState<string>("5");

  // Load cài đặt từ localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const getStorage = (key: string) => window.localStorage.getItem(key);

    const storedCity = getStorage("sh-gemini-city");
    if (storedCity) setCity(storedCity);

    const storedHome = getStorage(`sh-home-name-${currentUser?.idnguoidung || "default"}`);
    if (storedHome) setHomeName(storedHome);

    const storedUnit = getStorage("sh-temp-unit");
    if (storedUnit === "C" || storedUnit === "F") setTempUnit(storedUnit);

    const storedInterval = getStorage("sh-sensor-interval");
    if (storedInterval) setSensorInterval(storedInterval);

    const storedDnd = getStorage("sh-dnd-night");
    if (storedDnd !== null) setDndNightEnabled(storedDnd === "true");

    const storedHighTemp = getStorage("sh-high-temp-alert");
    if (storedHighTemp !== null) setHighTempAlert(storedHighTemp === "true");

    const storedOffline = getStorage("sh-node-offline-alert");
    if (storedOffline !== null) setNodeOfflineAlert(storedOffline === "true");
  }, [currentUser?.idnguoidung]);

  const setItem = (key: string, val: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, val);
  };

  const handleSaveHomeName = useCallback(() => {
    if (!homeName.trim()) {
      toast.error("Vui lòng nhập tên ngôi nhà!");
      return;
    }
    setSavingHome(true);
    setItem(`sh-home-name-${currentUser?.idnguoidung || "default"}`, homeName.trim());
    toast.success("Đã cập nhật tên ngôi nhà!");
    setSavingHome(false);
  }, [homeName, currentUser?.idnguoidung]);

  const handleCityChange = useCallback((newCity: string) => {
    setCity(newCity);
    setItem("sh-gemini-city", newCity);
    toast.success(`Đã chọn vị trí thời tiết: ${newCity}`);
  }, []);

  const handleToggle = useCallback((setter: (v: boolean) => void, key: string, msg: string) => (enabled: boolean) => {
    setter(enabled);
    setItem(key, String(enabled));
    toast.info(msg);
  }, []);

  const handleTempUnitChange = useCallback((unit: "C" | "F") => {
    setTempUnit(unit);
    setItem("sh-temp-unit", unit);
    toast.success(`Đã chuyển đơn vị nhiệt độ sang °${unit}`);
  }, []);

  const handleIntervalChange = useCallback((val: string) => {
    setSensorInterval(val);
    setItem("sh-sensor-interval", val);
    toast.success(`Đã đặt tần suất cập nhật cảm biến: ${val} giây`);
  }, []);

  return {
    activeCategory,
    setActiveCategory,
    homeName,
    setHomeName,
    savingHome,
    handleSaveHomeName,
    city,
    handleCityChange,
    highTempAlert,
    handleHighTempToggle: handleToggle(setHighTempAlert, "sh-high-temp-alert", "Đã cập nhật cảnh báo nhiệt độ"),
    nodeOfflineAlert,
    handleNodeOfflineToggle: handleToggle(setNodeOfflineAlert, "sh-node-offline-alert", "Đã cập nhật cảnh báo thiết bị ngoại tuyến"),
    dndNightEnabled,
    handleDndToggle: handleToggle(setDndNightEnabled, "sh-dnd-night", "Đã cập nhật chế độ Yên tĩnh"),
    tempUnit,
    handleTempUnitChange,
    sensorInterval,
    handleIntervalChange,
  };
}
