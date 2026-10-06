import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useCustomTime } from "./use-custom-time.tsx";

/* ---------- Singleton Shared 15s Timer for Relative Time ---------- */
let shared15sNow = Date.now();
const listeners15s = new Set<() => void>();
let shared15sTimer: ReturnType<typeof setInterval> | null = null;

function subscribe15s(cb: () => void) {
  listeners15s.add(cb);
  if (!shared15sTimer) {
    shared15sTimer = setInterval(() => {
      shared15sNow = Date.now();
      listeners15s.forEach((fn) => fn());
    }, 15000);
  }
  return () => {
    listeners15s.delete(cb);
    if (listeners15s.size === 0 && shared15sTimer) {
      clearInterval(shared15sTimer);
      shared15sTimer = null;
    }
  };
}

/* ---------- Time Hooks ---------- */

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
export function useRelativeTime(timestamp: number) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe15s(() => setTick((t) => t + 1));
  }, []);

  const now = shared15sNow;
  const diff = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diff < 10) return "vừa xong";
  if (diff < 60) return `${diff} giây trước`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export type TimeOfDay = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export function getTimeOfDayVN(date?: Date): number {
  const now = date || new Date();
  try {
    const vnDateStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "numeric",
      hour12: false,
    }).format(now);
    const h = parseInt(vnDateStr, 10);
    return isNaN(h) ? now.getHours() : h % 24;
  } catch {
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcTime + 7 * 3600000).getHours();
  }
}

export function useTimeOfDay(customDate?: Date) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { offsetMs } = useCustomTime();

  const getHour = useCallback(() => {
    if (!mounted) return 10;
    const effectiveDate = customDate || new Date(Date.now() + offsetMs);
    return getTimeOfDayVN(effectiveDate);
  }, [mounted, customDate, offsetMs]);

  const [h, setH] = useState(getHour);

  useEffect(() => {
    setH(getHour());
    const timer = setInterval(() => {
      const nextH = getHour();
      setH((prev) => (prev !== nextH ? nextH : prev));
    }, 30000);
    return () => clearInterval(timer);
  }, [getHour]);

  return useMemo(() => {
    if (h >= 5 && h < 7) return { period: "dawn" as TimeOfDay, label: "Sáng sớm", hour: h };
    if (h >= 7 && h < 11) return { period: "morning" as TimeOfDay, label: "Buổi sáng", hour: h };
    if (h >= 11 && h < 14) return { period: "noon" as TimeOfDay, label: "Buổi trưa", hour: h };
    if (h >= 14 && h < 18) return { period: "afternoon" as TimeOfDay, label: "Buổi chiều", hour: h };
    if (h >= 18 && h < 22) return { period: "evening" as TimeOfDay, label: "Buổi tối", hour: h };
    return { period: "night" as TimeOfDay, label: "Đêm khuya", hour: h };
  }, [h]);
}

export function useDarkMode() {
  return { dark: false, toggle: () => {} };
}

export function useAnimatedNumber(target: number | null, duration = 350) {
  const [value, setValue] = useState(target ?? 0);
  const currentValRef = useRef(target ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      currentValRef.current = 0;
      setValue(0);
      return;
    }

    const from = currentValRef.current;
    const to = target;
    
    if (Math.abs(to - from) < 0.05) {
      currentValRef.current = to;
      setValue(to);
      return;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    let startTime: number | null = null;
    const step = (t: number) => {
      if (startTime === null) startTime = t;
      const progress = Math.min(1, (t - startTime) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = from + (to - from) * eased;

      currentValRef.current = nextVal;
      setValue(nextVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentValRef.current = to;
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
