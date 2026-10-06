import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tsconfigPaths(),
    tailwindcss(),
    nitro(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Tách recharts + D3 (561 KB) → load khi mở tab chart
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-") || id.includes("react-smooth")) {
            return "vendor-charts";
          }
          // Tách MQTT (384 KB) → load khi kết nối MQTT
          if (id.includes("/mqtt/") || id.includes("mqtt-packet") || id.includes("readable-stream")) {
            return "vendor-mqtt";
          }
          // Tách Supabase (auth + realtime + postgrest)
          if (id.includes("@supabase/")) {
            return "vendor-supabase";
          }
          // Tách Radix UI primitives thành 1 chunk
          if (id.includes("@radix-ui/")) {
            return "vendor-radix";
          }
          // Tách TanStack (router + query) thành chunk riêng
          if (id.includes("@tanstack/")) {
            return "vendor-tanstack";
          }
        },
      },
    },
    // Tăng giới hạn cảnh báo chunk lên 1MB (recharts + mqtt vốn lớn)
    chunkSizeWarningLimit: 1000,
  },
});


