# Smart Home IoT & Voice Control

Đồ án hệ thống nhà thông minh giám sát cảm biến và điều khiển thiết bị qua Web, hỗ trợ giọng nói (Edge Impulse + Groq/Gemini).

---

## 1. Phần cứng & Sơ đồ nối chân (ESP32-S3)

* **Board:** ESP32-S3 DevKitC-1 (8MB Flash, PSRAM OPI)
* **Cảm biến:** DHT11 (Nhiệt độ, độ ẩm), BH1750 (Ánh sáng)
* **Thiết bị:** Đèn (LED), Quạt, Rèm cửa (Servo), Tivi (Mắt phát hồng ngoại IR)
* **Âm thanh:** Micro I2S INMP441, Màn hình OLED 0.96 inch SSD1306

| Linh kiện | Chân GPIO | Chức năng |
|---|---|---|
| OLED & BH1750 | `SDA: 8`, `SCL: 9` | I2C (màn hình + cảm biến ánh sáng) |
| DHT11 | `10` | Cảm biến nhiệt độ, độ ẩm |
| Đèn LED | `4` | Điều khiển độ sáng PWM |
| Quạt | `6` | Điều khiển tốc độ PWM |
| Rèm cửa | `7` | Động cơ Servo (0° - 180°) |
| Mắt phát IR | `5` | Phát tín hiệu hồng ngoại điều khiển Tivi |
| Micro I2S | `SCK: 41`, `WS: 42`, `SD: 40` | Thu âm giọng nói (16kHz) |
| Nút Boot | `0` | Nhấn giữ thu âm thủ công |

---

## 2. Cấu hình & Chạy dự án

### ESP32-S3 Firmware (PlatformIO)
1. Tạo file `include/secrets.h`:
```cpp
#ifndef SECRETS_H
#define SECRETS_H
static const char* ssid = "TEN_WIFI";
static const char* password = "MAT_KHAU_WIFI";
#define GROQ_API_KEY_STR "gsk_..."
#endif
```
2. Cắm cáp Type-C vào máy tính và nạp:
```bash
pio run -t upload
```

### Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```
File `backend/.env`:
```env
SUPABASE_URL=https://ccvesdhnzlvfpdfhlesr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
MQTT_BROKER_URL=mqtt://broker.hivemq.com
MQTT_PORT=1883
MQTT_TOPIC_PREFIX=buivansang_iot_pj
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Mở trình duyệt: `http://localhost:3000`

---

## 3. Danh sách MQTT Topics

* **Cảm biến (ESP32 → Broker):**
  * `buivansang_iot_pj/temp`: Nhiệt độ (°C)
  * `buivansang_iot_pj/hum`: Độ ẩm (%)
  * `buivansang_iot_pj/lux`: Ánh sáng (lux)
* **Điều khiển thiết bị (Broker ⇄ ESP32):**
  * `buivansang_iot_pj/led`: Bật/tắt Điều hòa (`ON` / `OFF`)
  * `buivansang_iot_pj/led2`: Bật/tắt Quạt (`ON` / `OFF`)
  * `buivansang_iot_pj/led3`: Bật/tắt Đèn (`ON` / `OFF`)
* **Điều khiển Tivi qua IR:**
  * `buivansang_iot_pj/tv/power`: Nguồn (`ON` / `OFF` / `TOGGLE`)
  * `buivansang_iot_pj/tv/volume`: Âm lượng (`UP` / `DOWN` / `MUTE`)
  * `buivansang_iot_pj/tv/channel`: Chuyển kênh (`UP` / `DOWN` / số kênh)
* **Chế độ tự động & Ngưỡng:**
  * `buivansang_iot_pj/automode`: Tự động Điều hòa
  * `buivansang_iot_pj/automode2`: Tự động Quạt
  * `buivansang_iot_pj/automode3`: Tự động Đèn
  * `buivansang_iot_pj/threshold/*`: Cài đặt ngưỡng cảm biến

---

## 4. Tài khoản đăng nhập

| Email | Mật khẩu | Phân quyền / Ghi chú |
|---|---|---|
| `sa12@gmail.com` | `123456` | Tài khoản Sang (sang12) |

