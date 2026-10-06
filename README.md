# 🏠 Smart Home IoT & Edge AI Dashboard

> Hệ thống giám sát, điều khiển nhà thông minh và xử lý giọng nói tích hợp **Edge AI (TinyML)** & **Cloud LLM (Gemini + Groq Whisper)** dựa trên nền tảng **ESP32-S3**, **MQTT**, **Supabase (PostgreSQL)** và **React 19**.

---

## 📐 Kiến trúc tổng thể hệ thống

```
                                  ┌───────────────────────────────┐
                                  │      Cloud Services           │
                                  │  • Supabase (PostgreSQL + RT) │
                                  │  • HiveMQ Public Broker       │
                                  │  • Groq Whisper (STT ~200ms)  │
                                  │  • Google Gemini AI (LLM NLP) │
                                  └───────────────▲───────────────┘
                                                  │
                  ┌───────────────────────────────┴───────────────────────────────┐
                  ▼                                                               ▼
        ┌──────────────────┐                                            ┌──────────────────┐
        │  Backend Server  │                                            │  Frontend Client │
        │  • Node.js 22    │                                            │  • React 19      │
        │    (Bridge MQTT) │ ◄────────────────── MQTT ────────────────► │  • Vite + TS     │
        │  • FastAPI Python│             (Direct over WS)               │  • TanStack Route│
        │    (Voice AI)    │                                            │  • Tailwind/CSS  │
        └────────▲─────────┘                                            └──────────────────┘
                 │
                 │ WiFi / MQTT (buivansang_iot_pj/*)
                 ▼
        ┌────────────────────────────────────────────────────────┐
        │                     ESP32-S3 DevKit                    │
        │  • TinyML Edge Impulse (Keyword Spotting Offline)       │
        │  • I2S Microphone Audio DSP & VAD Pipeline             │
        │  • Hardware Controllers (PWM, I2C, IR Remote, Servo)   │
        └───────────────────────────▲────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
    [Sensors & Input]                                [Actuators & Output]
    • DHT11 (Temp & Humidity)                         • Đèn Chiếu Sáng (LED PWM)
    • BH1750 (Lux Light I2C)                          • Quạt Thông Gió (Fan PWM)
    • I2S Mic (INMP441)                               • Rèm Cửa Tự Động (Servo)
    • Mắt thu hồng ngoại (IR Rx)                      • Điều Khiển Smart TV (IR Tx LED)
    • Nút nhấn Boot                                   • Màn hình hiển thị OLED SSD1306
                                                      • Đèn trạng thái RGB NeoPixel
```

---

## 🛠 Công nghệ sử dụng (Tech Stack)

| Phân hệ | Công nghệ | Chi tiết |
|---------|-----------|----------|
| **Phần cứng & Firmware** | ESP32-S3 DevKitC-1, PlatformIO, C++ | 8MB Flash, OPI PSRAM, FreeRTOS, TinyML Edge Impulse |
| **Giao thức IoT** | MQTT 3.1.1 (HiveMQ Public Broker) | Hỗ trợ QoS 0/1, Retain flag, Topic Prefix: `buivansang_iot_pj` |
| **Xử lý âm thanh & AI** | I2S INMP441, DSP, Groq Whisper, Gemini | Nhận diện giọng nói tiếng Việt độ trễ cực thấp, phân tích ngữ nghĩa lệnh |
| **Backend Services** | Node.js (v22), Express, Python FastAPI | Xử lý nghiệp vụ Bridge, Rule engine, Lịch hẹn giờ, Scene service |
| **Cơ sở dữ liệu** | Supabase (PostgreSQL 15) | Realtime WebSockets, Lưu trữ Telemetry, RPC tối ưu hóa biểu đồ |
| **Frontend Web** | React 19, TypeScript, TanStack Router | Giao diện Dark/Light mode, Recharts, TanStack Query, Radix UI |

---

## 🔌 Sơ đồ chân kết nối phần cứng (ESP32-S3 Pinout)

| Linh kiện | Chân ESP32-S3 | Chế độ / Chức năng | Ghi chú |
|-----------|---------------|-------------------|---------|
| **OLED SSD1306 / BH1750** | `GPIO 8` | I2C SDA | Giao tiếp I2C chung |
| **OLED SSD1306 / BH1750** | `GPIO 9` | I2C SCL | Tần số 400kHz |
| **DHT11** | `GPIO 10` | 1-Wire Digital In | Đo nhiệt độ & độ ẩm |
| **Đèn LED chiếu sáng** | `GPIO 4` | LEDC PWM (CH 4) | Điều khiển độ sáng / Bật tắt |
| **Quạt gió** | `GPIO 6` | LEDC PWM (CH 5) | Điều khiển tốc độ quạt |
| **Rèm cửa** | `GPIO 7` | Servo PWM | Mở góc 0° - 180° |
| **Mắt phát IR TV** | `GPIO 5` | IR Transmit (PWM) | Phát mã hồng ngoại điều khiển TV |
| **Mắt thu IR** | `GPIO 3` | IR Receive | Học mã điều khiển |
| **I2S Mic INMP441 (SCK)** | `GPIO 41` | I2S Bit Clock (BCLK) | Thu âm giọng nói 16kHz |
| **I2S Mic INMP441 (WS)** | `GPIO 42` | I2S Word Select (LRCLK) | Kênh Mono/Stereo |
| **I2S Mic INMP441 (SD)** | `GPIO 40` | I2S Serial Data (DIN) | Luồng mẫu âm thanh PCM |
| **LED RGB Onboard** | `GPIO 48` | NeoPixel / RGB Output | Báo trạng thái kết nối & Voice AI |
| **Nút nhấn Boot** | `GPIO 0` | Input Pullup | Kích hoạt thu âm thủ công |

---

## 📁 Cấu trúc thư mục dự án

```
IoT-PJ1/
├── platformio.ini             # Cấu hình PlatformIO cho ESP32-S3 DevKit
├── include/
│   └── secrets.h              # Cấu hình Wi-Fi SSID, Pass, API Keys (Không commit)
├── src/                       # Mã nguồn Firmware ESP32-S3 (C++)
│   ├── main.cpp               # Vòng lặp chính, kết nối WiFi/MQTT, FreeRTOS tasks
│   ├── AppConfig.h            # Khai báo cấu hình chân GPIO, tham số DSP, Topics
│   ├── hardware.cpp           # Điều khiển cảm biến, PWM LED/Quạt, Servo rèm
│   ├── AudioDsp.cpp / .h      # Bộ lọc âm thanh, bộ phát hiện giọng nói VAD
│   ├── DisplayUI.cpp / .h     # Giao diện hiển thị trạng thái lên màn hình OLED
│   ├── tv_ir.cpp              # Điều khiển TV hồng ngoại (Power, Volume, Channel)
│   └── audio_voice.cpp        # Pipeline xử lý Voice AI nội bộ
├── lib/
│   └── IoT_inferencing/       # Thư viện mô hình TinyML Edge Impulse
├── backend/                   # Backend Node.js & Voice AI
│   ├── bridge.js              # Entrypoint hệ thống Bridge MQTT ↔ Supabase
│   ├── config/config.js       # Cấu hình Topics, Port và tham số hệ thống
│   ├── services/
│   │   ├── mqttService.js     # Quản lý kết nối & điều phối MQTT
│   │   ├── supabaseService.js # Tích hợp Supabase CRUD, Batching & Realtime
│   │   ├── automationService.js # Bộ xử lý luật tự động hóa theo ngưỡng
│   │   ├── scheduleService.js # Động cơ thực thi lịch hẹn giờ
│   │   ├── sceneService.js    # Quản lý và kích hoạt ngữ cảnh đa thiết bị
│   │   ├── voiceService.js    # Tích hợp dịch vụ giọng nói AI
│   │   └── telemetryService.js# Thu thập dữ liệu cảm biến & cảnh báo
│   ├── scripts/simulator.js   # Bộ giả lập thiết bị gửi dữ liệu ảo
│   └── .env                   # Biến môi trường Backend
├── frontend/                  # Web App React 19 + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.tsx      # Dashboard trung tâm tích hợp Tabs
│   │   │   ├── login.tsx      # Đăng nhập hệ thống
│   │   │   ├── register.tsx   # Đăng ký tài khoản
│   │   │   └── settings.tsx   # Cài đặt người dùng & đổi mật khẩu
│   │   ├── components/dashboard/tabs/
│   │   │   ├── overview/      # Giám sát thông số cảm biến 24h & thiết bị
│   │   │   ├── devices/       # Điều khiển thiết bị & Remote TV thông minh
│   │   │   ├── scenes/        # Quản lý & kích hoạt kịch bản ngữ cảnh
│   │   │   ├── schedule/      # Cài đặt lịch trình tự động theo giờ
│   │   │   └── analytics/     # Biểu đồ thống kê lịch sử chuyên sâu
│   │   └── lib/
│   │       ├── supabase.ts    # Supabase Client kết nối Realtime
│   │       └── mqttClient.ts  # MQTT Client trực tiếp trên Web Browser
│   ├── .env                   # Biến môi trường Frontend (Vite)
│   └── package.json
└── database/schema/           # Kịch bản cơ sở dữ liệu Supabase PostgreSQL
    ├── 01_tables.sql          # Bảng dữ liệu chính
    ├── 02_indexes.sql         # Đánh chỉ mục tối ưu truy vấn
    ├── 03_rpc_functions.sql   # Hàm tổng hợp dữ liệu thống kê phân tích
    ├── 04_rls_policies.sql    # Phân quyền Row-Level Security
    └── 05_seed_data.sql       # Dữ liệu khởi tạo mẫu
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Cấu hình & Nạp Firmware ESP32-S3 (PlatformIO)

1. Cài đặt tiện ích mở rộng **PlatformIO IDE** trên VS Code.
2. Tạo file `include/secrets.h` với nội dung:
   ```cpp
   #ifndef SECRETS_H
   #define SECRETS_H

   static const char* ssid = "TEN_WIFI_CUA_BAN";
   static const char* password = "MAT_KHAU_WIFI";

   #define GROQ_API_KEY_STR "gsk_YOUR_GROQ_API_KEY"

   #endif
   ```
3. Nối board ESP32-S3 qua cổng Type-C và kiểm tra cổng COM trong `platformio.ini`.
4. Biên dịch và nạp code:
   ```bash
   pio run -t upload
   ```

---

### 2. Cấu hình & Chạy Backend Bridge

1. Di chuyển vào thư mục `backend/` và cài đặt dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Tạo file `.env` trong thư mục `backend/`:
   ```env
   SUPABASE_URL=https://ccvesdhnzlvfpdfhlesr.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   MQTT_BROKER_URL=mqtt://broker.hivemq.com
   MQTT_PORT=1883
   MQTT_TOPIC_PREFIX=buivansang_iot_pj
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   GROQ_API_KEY=YOUR_GROQ_API_KEY
   ```
3. Chạy backend:
   ```bash
   # Chế độ phát triển (Auto-reload)
   npm run dev

   # Chế độ thông thường
   npm start
   ```

---

### 3. Cấu hình & Chạy Frontend Web

1. Di chuyển vào thư mục `frontend/` và cài đặt packages:
   ```bash
   cd frontend
   npm install
   ```
2. Tạo file `.env` trong thư mục `frontend/`:
   ```env
   VITE_SUPABASE_URL=https://ccvesdhnzlvfpdfhlesr.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
3. Khởi chạy dev server:
   ```bash
   npm run dev
   ```
4. Truy cập giao diện tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

---

## 📡 Danh mục MQTT Topics

| Topic | Hướng | Dữ liệu mẫu / Định dạng | Chức năng |
|-------|-------|-------------------------|-----------|
| `buivansang_iot_pj/temp` | ESP32 → Broker | `28.5` | Nhiệt độ môi trường (°C) |
| `buivansang_iot_pj/hum` | ESP32 → Broker | `65.0` | Độ ẩm không khí (%) |
| `buivansang_iot_pj/lux` | ESP32 → Broker | `320.0` | Cường độ ánh sáng (lux) |
| `buivansang_iot_pj/led` | Broker ⇄ ESP32 | `ON` / `OFF` | Điều khiển Điều hòa |
| `buivansang_iot_pj/led2` | Broker ⇄ ESP32 | `ON` / `OFF` | Điều khiển Quạt |
| `buivansang_iot_pj/led3` | Broker ⇄ ESP32 | `ON` / `OFF` | Điều khiển Đèn |
| `buivansang_iot_pj/tv/power` | Broker → ESP32 | `TOGGLE` / `ON` / `OFF` | Bật/tắt Smart TV qua IR |
| `buivansang_iot_pj/tv/volume` | Broker → ESP32 | `UP` / `DOWN` / `MUTE` / `0-100` | Điều chỉnh âm lượng TV |
| `buivansang_iot_pj/tv/channel`| Broker → ESP32 | `UP` / `DOWN` / `1..99` | Chuyển kênh TV |
| `buivansang_iot_pj/automode` | Broker ⇄ ESP32 | `ON` / `OFF` | Chế độ tự động Điều hòa |
| `buivansang_iot_pj/automode2`| Broker ⇄ ESP32 | `ON` / `OFF` | Chế độ tự động Quạt |
| `buivansang_iot_pj/automode3`| Broker ⇄ ESP32 | `ON` / `OFF` | Chế độ tự động Đèn |
| `buivansang_iot_pj/threshold/*` | Broker → ESP32 | `30.0` (retain = true) | Cập nhật ngưỡng tự động |
| `buivansang_iot_pj/voice/command` | Web/App → AI | Raw Audio / Text | Gửi lệnh giọng nói xử lý |

---

## 👤 Tài khoản đăng nhập hệ thống

Dưới đây là danh sách tài khoản đã được cấp quyền trong hệ thống Supabase Auth:

| Tài khoản / Email | Tên hiển thị | Mật khẩu | Ghi chú |
|-------------------|--------------|----------|---------|
| `sa12@gmail.com` | **sang1** (sang12) | **`123456`** | Tài khoản kiểm thử của Sang |
| `sangbv2206@gmail.com` | **sang** | **`123456`** | Tài khoản quản trị chính |
| `sangbv12206@gmail.com` | **test** | **`123456`** | Tài khoản phụ |
| `buivanchung22109@gmail.com` | **sang** | **`Admin@123`** | Tài khoản demo đồ án |

---

## 📝 Giấy phép (License)

Dự án phát triển phục vụ học tập & nghiên cứu môn **IoT Ứng Dụng**, Học viện Công nghệ Bưu chính Viễn thông (PTIT).
Giấy phép: **MIT License**.
