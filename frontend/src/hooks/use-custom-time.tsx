import React, { useState, useEffect, useCallback, createContext, useContext } from "react";

const STORAGE_KEY_OFFSET = "sh-time-offset-ms";

interface CustomTimeContextType {
  currentTime: Date;
  offsetMs: number;
  isCustom: boolean;
  setCustomTime: (date: Date) => void;
  addOffset: (hours: number, days?: number) => void;
  resetToRealTime: () => void;
}

const CustomTimeContext = createContext<CustomTimeContextType | null>(null);

export function CustomTimeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [offsetMs, setOffsetMs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFSET);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const setCustomTime = useCallback((date: Date) => {
    const newOffset = date.getTime() - Date.now();
    setOffsetMs(newOffset);
    try {
      localStorage.setItem(STORAGE_KEY_OFFSET, newOffset.toString());
    } catch {}
  }, []);

  const addOffset = useCallback((hours: number, days = 0) => {
    const addMs = (hours * 3600 + days * 86400) * 1000;
    setOffsetMs((prev) => {
      const next = prev + addMs;
      try {
        localStorage.setItem(STORAGE_KEY_OFFSET, next.toString());
      } catch {}
      return next;
    });
  }, []);

  const resetToRealTime = useCallback(() => {
    setOffsetMs(0);
    try {
      localStorage.removeItem(STORAGE_KEY_OFFSET);
    } catch {}
  }, []);

  const isCustom = Math.abs(offsetMs) > 1000;
  const currentTime = React.useMemo(() => new Date(now + offsetMs), [now, offsetMs]);

  const value = React.useMemo(
    () => ({
      currentTime,
      offsetMs,
      isCustom,
      setCustomTime,
      addOffset,
      resetToRealTime,
    }),
    [currentTime, offsetMs, isCustom, setCustomTime, addOffset, resetToRealTime]
  );

  return (
    <CustomTimeContext.Provider value={value}>
      {children}
    </CustomTimeContext.Provider>
  );
}

export function useCustomTime() {
  const ctx = useContext(CustomTimeContext);
  if (!ctx) {
    const now = new Date();
    return {
      currentTime: now,
      offsetMs: 0,
      isCustom: false,
      setCustomTime: () => {},
      addOffset: () => {},
      resetToRealTime: () => {},
    };
  }
  return ctx;
}
