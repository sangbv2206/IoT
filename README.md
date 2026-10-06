# 🏠 Smart Home IoT & Voice Control Dashboard

Đồ án hệ thống Nhà thông minh: Giám sát cảm biến thời gian thực, điều khiển thiết bị qua Web Dashboard và nhận diện giọng nói AI (Edge Impulse + Groq/Gemini).

---

## ⚡ TỔNG QUAN HỆ THỐNG CHO THÀNH VIÊN NHÓM
* **Cơ sở dữ liệu:** Dùng **Supabase Cloud** (Lưu trên đám mây) 👉 **KHÔNG CẦN CÀI DOCKER, KHÔNG CẦN CÀI DATABASE TRÊN MÁY**.
* **Giao tiếp thời gian thực:** Dùng **HiveMQ MQTT Broker** công cộng.
* **Không có mạch ESP32 thật?** 👉 **VẪN CHẠY VÀ TEST ĐƯỢC 100%** nhờ Bộ giả lập (Simulator) hoặc gõ lệnh Terminal có sẵn trong dự án!

---

## 🚀 HƯỚNG DẪN 4 BƯỚC CHẠY DỰ ÁN TỪ ĐẦU (DÀNH CHO NGƯỜI MỚI)

### Bước 1: Tải mã nguồn về máy
Mở Terminal / PowerShell và gõ:
```bash
git clone https://github.com/MKohaku1310/IoT.git
cd IoT
```

---

### Bước 2: Tạo file cấu hình môi trường (`.env`)
Dự án cần 2 file cấu hình `.env` (1 ở `backend` và 1 ở `frontend`). Bạn chỉ cần copy từ file mẫu có sẵn:

#### 1. Cho Backend:
```bash
cd backend
cp .env.example .env    # Trên Windows PowerShell: copy .env.example .env
```
*(Mở file `backend/.env` ra, điền API Key hoặc xin file `.env` chuẩn từ bạn Sang).*

#### 2. Cho Frontend:
```bash
cd ../frontend
cp .env.example .env    # Trên Windows PowerShell: copy .env.example .env
```
*(File này cấu hình kết nối trực tiếp đến Supabase Cloud).*

---

### Bước 3: Cài đặt và Khởi chạy hệ thống
Mở **2 cửa sổ Terminal** riêng biệt để chạy song song:

* **Cửa sổ Terminal 1 (Chạy Backend Bridge):**
  ```bash
  cd backend
  npm install
  npm run dev
  ```
  *(Khi thấy báo `✅ Đã kết nối MQTT Broker` và `✅ Đã kết nối Supabase` là thành công).*

* **Cửa sổ Terminal 2 (Chạy Giao diện Web Frontend):**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  *Mở trình duyệt truy cập vào địa chỉ:* **`http://localhost:3000`**

---

### Bước 4: Đăng nhập tài khoản kiểm thử
Trên màn hình đăng nhập của Web, nhập tài khoản:
* **Email:** `sa12@gmail.com`
* **Mật khẩu:** `123456`

---

## 🎮 HƯỚNG DẪN TEST ĐIỀU KHIỂN & CẢM BIẾN TRÊN GIAO DIỆN

### 👉 CÁCH 1: Bạn KHÔNG CÓ mạch ESP32 (Dùng Bộ Giả Lập tự động — Khuyên dùng)
Mở thêm **cửa sổ Terminal thứ 3** và chạy:
```bash
cd backend
npm run sim
```
* **Hiện tượng xảy ra:**
  * Terminal sẽ tự động đóng vai như 1 con ESP32 thật.
  * Cứ 4 giây tự bắn số liệu Nhiệt độ, Độ ẩm, Ánh sáng $\rightarrow$ **Đồ thị và thông số trên Web nhảy số liên tục.**
  * Cứ 10 giây gửi Heartbeat $\rightarrow$ **Thanh trạng thái Node trên Web hiện "Online".**
  * Khi bạn click bật/tắt Đèn, Quạt, Rèm trên Web $\rightarrow$ Simulator sẽ nhận lệnh và trả về trạng thái `ON`/`OFF` $\rightarrow$ **Công tắc trên Web bật/tắt chuẩn 100%.**

---

### 👉 CÁCH 2: Bạn thích tự tay gõ lệnh trong Terminal (Pub/Sub)
Không cần cài thêm tool gì, mở Terminal thứ 3 và gõ trực tiếp lệnh `npx mqtt`:

* **Thử đổi số liệu cảm biến (Nhiệt độ 35°C, Độ ẩm 80%, Ánh sáng 600 lux):**
  ```bash
  npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/sensors" -m "{\"temp\": 35.0, \"hum\": 80, \"lux\": 600}"
  ```
  *(Nhìn lên Web sẽ thấy số liệu thay đổi ngay lập tức!)*

* **Thử bật Đèn phòng khách:**
  ```bash
  npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/den/state" -m "ON"
  ```
  *(Đổi `"ON"` thành `"OFF"` để tắt đèn).*

* **Thử mở Rèm cửa:**
  ```bash
  npx mqtt pub -h broker.hivemq.com -t "buivansang_iot_pj/NODE-LIVINGROOM-01/rem_cua/state" -m "OPEN"
  ```

* **Lắng nghe toàn bộ tin nhắn trong hệ thống:**
  ```bash
  npx mqtt sub -h broker.hivemq.com -t "buivansang_iot_pj/#" -v
  ```

---

### 👉 CÁCH 3: Bạn CÓ phần cứng ESP32-S3 thật
1. Tạo file `include/secrets.h` ở thư mục gốc:
```cpp
#ifndef SECRETS_H
#define SECRETS_H
static const char* ssid = "TEN_WIFI_NHA_BAN";
static const char* password = "MAT_KHAU_WIFI";
#define GROQ_API_KEY_STR "gsk_..."
#endif
```
2. Cắm cáp USB vào máy tính và nạp firmware qua PlatformIO:
```bash
pio run -t upload
```

---

## 📌 SƠ ĐỒ NỐI CHÂN MẠCH THỰC TẾ (ESP32-S3)

* **Board chính:** ESP32-S3 DevKitC-1 (8MB Flash, OPI PSRAM)

| Linh kiện | Chân GPIO | Mô tả chức năng |
|---|---|---|
| Màn hình OLED SSD1306 & Cảm biến BH1750 | `SDA: 8`, `SCL: 9` | I2C chung (màn hình hiển thị + đo cường độ sáng) |
| Cảm biến DHT11 | `10` | Đo nhiệt độ & độ ẩm phòng |
| Đèn LED | `4` | Điều khiển độ sáng (PWM LEDC) |
| Quạt Mini | `6` | Điều khiển tốc độ quay (PWM LEDC) |
| Rèm cửa (Động cơ Servo SG90) | `7` | Động cơ quay góc 0° (Đóng) - 180° (Mở) |
| Mắt phát hồng ngoại IR | `5` | Phát xung IR điều khiển Tivi |
| Micro I2S INMP441 | `SCK: 41`, `WS: 42`, `SD: 40` | Thu âm giọng nói 16kHz nhận diện lệnh AI |
| Nút Boot | `0` | Nhấn giữ thu âm thủ công |

---

## 📡 DANH SÁCH MQTT TOPICS CHÍNH
* **Tiền tố:** `buivansang_iot_pj`
* **Node ID mặc định:** `NODE-LIVINGROOM-01`
* **Gửi dữ liệu cảm biến:**
  * `{prefix}/{nodeId}/sensors` (Dạng JSON: `{"temp": ..., "hum": ..., "lux": ...}`)
* **Nhận lệnh điều khiển từ Web:**
  * `{prefix}/{nodeId}/den` (`ON` / `OFF`)
  * `{prefix}/{nodeId}/quat` (`ON` / `OFF`)
  * `{prefix}/{nodeId}/rem_cua` (`OPEN` / `CLOSE`)
  * `{prefix}/{nodeId}/tv` (`ON` / `OFF` / `TOGGLE`)
* **Phản hồi trạng thái lên Web:**
  * `{prefix}/{nodeId}/{thiết_bị}/state`
