import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ccvesdhnzlvfpdfhlesr.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_j72Mv19uraSeb0azL_ifHw_BAXSkPeU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Tự động kết nối lại Realtime WebSocket nhanh hơn khi mất kết nối
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
  },
});


let lastHiddenAt: number | null = null;
const RECONNECT_THRESHOLD_MS = 5 * 60 * 1000; // Nếu tab bị ẩn > 5 phút thì reconnect

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Tab bị ẩn đi, ghi lại thời điểm
      lastHiddenAt = Date.now();
    } else {
      // Tab được focus lại
      const hiddenDuration = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
      if (hiddenDuration > RECONNECT_THRESHOLD_MS) {
        // Đã ẩn quá lâu → reconnect tất cả Realtime channels
        console.info(`[Supabase] Tab bị ẩn ${Math.round(hiddenDuration / 1000)}s. Đang reconnect Realtime...`);
        supabase.realtime.disconnect();
        setTimeout(() => supabase.realtime.connect(), 300);
      }
      lastHiddenAt = null;
    }
  });

  // Cũng reconnect khi kết nối mạng được khôi phục (offline → online)
  window.addEventListener("online", () => {
    console.info("[Supabase] Mạng được khôi phục. Đang reconnect Realtime...");
    supabase.realtime.disconnect();
    setTimeout(() => supabase.realtime.connect(), 500);
  });
}

