# Smart Home IoT System

Hệ thống giám sát môi trường và điều khiển thiết bị thông minh qua Web Dashboard và ESP32-S3.

## Công nghệ sử dụng

- Firmware: C++ (PlatformIO), ESP32-S3, FreeRTOS, TinyML (Edge Impulse)
- Backend: Node.js, MQTT client, Supabase client
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Database & Realtime: Supabase (PostgreSQL)
- Protocol: MQTT (HiveMQ broker)

## Sơ đồ kết nối phần cứng (ESP32-S3)

Board: ESP32-S3 DevKitC-1

| Thiết bị / Cảm biến | Chân kết nối | Chức năng |
|---|---|---|
| OLED SSD1306 | I2C (SDA: GPIO 8, SCL: GPIO 9) | Hiển thị trạng thái kết nối, thông số cảm biến |
| BH1750 | I2C (SDA: GPIO 8, SCL: GPIO 9) | Cảm biến cường độ ánh sáng |
| DHT11 | GPIO 10 | Cảm biến nhiệt độ, độ ẩm |
| LED | GPIO 4 | Đèn (PWM LEDC) |
| Quạt mini | GPIO 6 | Quạt (PWM LEDC) |
| Servo SG90 | GPIO 7 | Điều khiển đóng/mở rèm |
| Mắt phát hồng ngoại (IR LED) | GPIO 5 | Phát tín hiệu điều khiển TV |
| Microphone INMP441 | I2S (SCK: GPIO 41, WS: GPIO 42, SD: GPIO 40) | Thu âm giọng nói |
| Button Boot | GPIO 0 | Kích hoạt thu âm |

## MQTT Topics

- Topic Prefix: `buivansang_iot_pj`
- Node ID: `NODE-LIVINGROOM-01`

| Topic | Định dạng | Hướng truyền | Chức năng |
|---|---|---|---|
| `buivansang_iot_pj/NODE-LIVINGROOM-01/sensors` | `{"temp": float, "hum": float, "lux": int}` | ESP32 -> Broker | Gửi dữ liệu cảm biến |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/heartbeat` | `{"uptime": int, "free_heap": int, "rssi": int}` | ESP32 -> Broker | Trạng thái hoạt động |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/den` | `ON` / `OFF` | Web -> ESP32 | Lệnh điều khiển đèn |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/quat` | `ON` / `OFF` | Web -> ESP32 | Lệnh điều khiển quạt |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/rem_cua` | `OPEN` / `CLOSE` | Web -> ESP32 | Lệnh điều khiển rèm |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/tv` | `ON` / `OFF` / `TOGGLE` | Web -> ESP32 | Lệnh điều khiển TV |
| `buivansang_iot_pj/NODE-LIVINGROOM-01/{thiet_bi}/state` | `ON` / `OFF` / `OPEN` / `CLOSE` | ESP32 -> Web | Trạng thái phản hồi thực tế |

## Cấu trúc thư mục

```text
.
├── backend/            # Dịch vụ trung gian MQTT - Supabase
│   ├── config/         # Cấu hình môi trường
│   ├── services/       # Logic xử lý tự động, đồng bộ, lịch trình
│   ├── bridge.js       # File chạy chính của backend
│   └── simulator.js    # Giả lập thiết bị ảo
├── frontend/           # Giao diện web dashboard
│   ├── src/components/ # Các component giao diện
│   └── src/lib/        # Cấu hình kết nối Supabase
├── include/            # Cấu hình phần cứng firmware
├── src/                # Mã nguồn ESP32-S3 (PlatformIO)
│   ├── main.cpp        # Điểm khởi chạy chính
│   ├── audio_voice.cpp # Xử lý giọng nói
│   ├── DisplayUI.cpp   # Giao diện OLED
│   └── hardware.cpp    # Điều khiển GPIO và cảm biến
├── platformio.ini      # Cấu hình PlatformIO
└── README.md
```

## Cài đặt và chạy

### 1. Backend

Cài đặt thư viện và cấu hình môi trường:

```bash
cd backend
npm install
cp .env.example .env
```

Điền các thông tin kết nối trong `backend/.env`, sau đó chạy:

```bash
npm run dev
```

### 2. Frontend

Cài đặt thư viện và cấu hình môi trường:

```bash
cd frontend
npm install
cp .env.example .env
```

Cập nhật thông tin Supabase trong `frontend/.env`, sau đó chạy:

```bash
npm run dev
```

Truy cập giao diện tại: `http://localhost:3000`

### 3. Kiểm thử không cần phần cứng

#### Cách 1: Sử dụng bộ giả lập tự động (Simulator)

Bộ giả lập đóng vai trò như một node ESP32-S3 thực tế: tự động gửi telemetry cảm biến (chu kỳ 4s), gửi heartbeat duy trì trạng thái online (chu kỳ 10s), nhận lệnh điều khiển từ Web và phản hồi trạng thái thiết bị.

Khởi chạy bằng lệnh:

```bash
cd backend
npm run sim
```

#### Cách 2: Sử dụng lệnh Terminal (MQTT Pub / Sub qua npx mqtt)

Có thể kiểm thử trực tiếp các chức năng bằng công cụ `npx mqtt` mà không cần cài thêm phần mềm ngoài:

- Lắng nghe toàn bộ bản tin trong hệ thống:

```bash
npx mqtt sub -h broker.hivemq.com -t "buivansang_iot_pj/#" -v
```

- Bắn dữ liệu cảm biến thủ công (nhiệt độ, độ ẩm, độ sáng):

```bash
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/sensors" -m "{\"temp\": 32.5, \"hum\": 75, \"lux\": 420}"
```

- Bật / tắt đèn:

```bash
# Bật đèn
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/den/state" -m "ON"

# Tắt đèn
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/den/state" -m "OFF"
```

- Bật / tắt quạt:

```bash
# Bật quạt
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/quat/state" -m "ON"

# Tắt quạt
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/quat/state" -m "OFF"
```

- Đóng / mở rèm cửa:

```bash
# Mở rèm
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/rem_cua/state" -m "OPEN"

# Đóng rèm
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/rem_cua/state" -m "CLOSE"
```

- Bật / tắt TV:

```bash
npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/tv/state" -m "ON"
```

### 4. Nạp code cho ESP32-S3 (Phần cứng thật)

1. Tạo file `include/secrets.h`:

```cpp
#ifndef SECRETS_H
#define SECRETS_H

static const char* ssid = "WIFI_NAME";
static const char* password = "WIFI_PASSWORD";

#endif
```

2. Nạp code bằng PlatformIO:

```bash
pio run -t upload
```
