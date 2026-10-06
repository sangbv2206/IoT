# 🏠 Smart Home IoT Dashboard

Hệ thống giám sát và điều khiển nhà thông minh theo thời gian thực sử dụng ESP32, MQTT, Supabase và React.

---

## 📐 Kiến trúc hệ thống

```
┌─────────────┐   MQTT (sensor data)   ┌──────────────────┐   Insert   ┌─────────────┐
│   ESP32-S3  │ ─────────────────────► │  Backend Bridge  │ ─────────► │  Supabase   │
│ (Cảm biến)  │ ◄───────────────────── │  (bridge.js)     │            │  PostgreSQL │
└─────────────┘   MQTT (control cmd)   └──────────────────┘            └──────┬──────┘
                                                                               │ Realtime
                        ┌─────────────────────────────────────────────────────┘
                        ▼
                ┌─────────────────┐
                │    Frontend     │   Supabase JS SDK (Realtime WebSocket)
                │  React + Vite   │ ◄─────────────────────────────────────
                └────────┬────────┘
                         │ MQTT over WebSocket (direct, low-latency)
                         └──────────────────────────────────► ESP32
```

### Luồng dữ liệu

| Chiều | Đường đi | Độ trễ |
|-------|----------|--------|
| Cảm biến → Web | ESP32 → MQTT → Backend → Supabase → Frontend Realtime | ~500ms |
| Web → Thiết bị | Frontend → **MQTT WebSocket trực tiếp** → ESP32 | ~150-200ms |
| Web → DB | Frontend → Supabase REST API | ~100ms |

---

## 🛠 Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| **Phần cứng** | ESP32-S3, DHT11 (nhiệt độ & độ ẩm), BH1750 (ánh sáng) |
| **Giao thức IoT** | MQTT 3.1.1 qua HiveMQ Public Broker |
| **Backend Bridge** | Node.js 22, `mqtt` npm, `@supabase/supabase-js` |
| **Database** | Supabase (PostgreSQL) + Realtime WebSocket |
| **Frontend** | React 19, TypeScript, TanStack Router, Vite, Recharts |
| **Chạy ứng dụng** | Backend → Render, Frontend → Local Dev Server (Vite) |

---

## 📋 Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- Tài khoản [Supabase](https://supabase.com) (free tier OK)
- Tài khoản [Render](https://render.com) (để deploy backend)
- Arduino IDE với board ESP32 đã cài đặt

---

## 📁 Cấu trúc thư mục

```
IoT-PJ1/
├── arduino/
│   ├── esp32.ino          # Code firmware ESP32
│   └── secrets.h          # WiFi credentials (KHÔNG commit lên git)
├── backend/
│   ├── bridge.js          # MQTT ↔ Supabase bridge (entry point)
│   ├── config/
│   │   └── config.js      # Cấu hình chung (topics, limits)
│   ├── services/
│   │   ├── mqttService.js       # Kết nối & publish/subscribe MQTT
│   │   ├── supabaseService.js   # CRUD + Realtime Supabase
│   │   ├── automationService.js # Đánh giá luật tự động hóa
│   │   └── scheduleService.js   # Lịch hẹn giờ thiết bị
│   ├── scripts/
│   │   ├── simulator.js       # Giả lập ESP32 gửi dữ liệu MQTT
│   │   ├── generate_docs.js   # Tạo tài liệu Word hướng dẫn test
│   │   ├── query_samples.js   # Các câu truy vấn mẫu qua RPC
│   │   ├── test_now.js        # Script test nhanh RPC lấy dữ liệu hôm nay
│   │   └── test_rpc_7d.js     # Script test RPC 7 ngày / 30 ngày / heatmap
│   ├── utils/
│   │   └── logger.js      # Logger có màu sắc
│   ├── .env               # Biến môi trường (KHÔNG commit lên git)
│   └── package.json
├── database/
│   ├── schema.sql         # Schema database Supabase đầy đủ
│   └── admin_migration.sql # Sql bổ sung bảng và phân quyền admin/buyer
├── docs/
│   ├── BaoCao_IoT_SmartHome.docx # Báo cáo môn học Smart Home
│   ├── Huong_Dan_Van_Hanh_Admin.docx # Hướng dẫn vận hành hệ thống cho admin
│   ├── Huong_Dan_Van_Hanh_Admin_V2.docx # Hướng dẫn vận hành V2
│   ├── TEST_COMMANDS.docx # Hướng dẫn chạy test backend và frontend (tự sinh)
│   ├── test.puml          # Sơ đồ thiết kế PlantUML
│   └── uml_diagrams.md    # Tài liệu giải thích sơ đồ UML
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.tsx  # Dashboard chính
│   │   │   ├── login.tsx  # Trang đăng nhập
│   │   │   └── profile.tsx # Trang hồ sơ người dùng
│   │   └── lib/
│   │       ├── supabase.ts    # Supabase client + auto-reconnect
│   │       └── mqttClient.ts  # MQTT WebSocket client (direct publish)
│   ├── .env               # Biến môi trường frontend
│   └── package.json
└── README.md
```

---

## ⚙️ Cài đặt & Chạy Local

### 1. Clone project

```bash
git clone <repo-url>
cd IoT-PJ1
```

### 2. Cấu hình Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

```env
# Supabase - lấy từ Supabase Dashboard > Project Settings > API
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY

# MQTT Broker (mặc định dùng HiveMQ public)
MQTT_BROKER_URL=mqtt://broker.hivemq.com
MQTT_PORT=1883
```

### 3. Cấu hình Frontend

```bash
cd frontend
npm install
```

Tạo file `.env` trong thư mục `frontend/`:

```env
# Supabase - dùng Anon/Public key (KHÔNG phải Service Role Key)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
```

### 4. Khởi tạo Database Supabase

Vào **Supabase Dashboard → SQL Editor**, paste toàn bộ nội dung file `database/schema.sql` và chạy.

### 5. Cấu hình Arduino

Mở `arduino/secrets.h` và điền thông tin WiFi:

```cpp
const char* ssid     = "TEN_WIFI_CUA_BAN";
const char* password = "MAT_KHAU_WIFI";
```

Nạp code `arduino/esp32.ino` lên board ESP32 bằng Arduino IDE.

---

## 🚀 Chạy Local

### Khởi động Backend Bridge

```bash
cd backend

# Chạy development (nodemon tự restart khi sửa code)
npm run dev

# Hoặc chạy production
npm start
```

**Output mong đợi khi khởi động thành công:**
```
[INFO]    --- KHỞI ĐỘNG HỆ THỐNG SMART HOME BRIDGE ---
[SUCCESS] Đã kết nối kênh Realtime bảng "thietbi": trạng thái = SUBSCRIBED
[SUCCESS] Đã kết nối kênh Realtime bảng "luat": trạng thái = SUBSCRIBED
[SUCCESS] Kết nối thành công đến MQTT Broker!
[INFO]    Đã subscribe thành công các topic: [...]
```

### Khởi động Frontend Dev Server

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại: `http://localhost:3000`

### Chạy Simulator (khi không có ESP32 thật)

```bash
cd backend
node scripts/simulator.js
```

---

## ☁️ Deploy

### Backend lên Render

1. Push code lên GitHub
2. Tạo **Web Service** mới trên Render, chọn repo và thư mục `backend/`
3. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node bridge.js`
4. Thêm Environment Variables trên Render Dashboard:
   - `SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...`
   - `RENDER_EXTERNAL_URL` = `https://YOUR_SERVICE.onrender.com` *(để self-ping chống spin-down)*

### Frontend (Chạy cục bộ)

```bash
cd frontend
npm install
npm run dev
```

Truy cập giao diện tại: `http://localhost:3000` (hoặc port do Vite cấp).
Tạo file `.env.local` trong thư mục `frontend`:
- `VITE_SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `YOUR_ANON_KEY`

---

## 📡 MQTT Topics Reference

| Topic | Chiều | Mô tả |
|-------|-------|--------|
| `buivansang_iot_pj/temp` | ESP32 → Broker | Nhiệt độ (°C) |
| `buivansang_iot_pj/hum` | ESP32 → Broker | Độ ẩm (%) |
| `buivansang_iot_pj/lux` | ESP32 → Broker | Ánh sáng (lux) |
| `buivansang_iot_pj/led` | Broker → ESP32 | Điều khiển Điều hòa (ON/OFF) |
| `buivansang_iot_pj/led2` | Broker → ESP32 | Điều khiển Quạt (ON/OFF) |
| `buivansang_iot_pj/led3` | Broker → ESP32 | Điều khiển Đèn (ON/OFF) |
| `buivansang_iot_pj/automode` | Broker → ESP32 | Chế độ tự động Điều hòa |
| `buivansang_iot_pj/automode2` | Broker → ESP32 | Chế độ tự động Quạt |
| `buivansang_iot_pj/automode3` | Broker → ESP32 | Chế độ tự động Đèn |
| `buivansang_iot_pj/led/state` | ESP32 → Broker | Trạng thái Điều hòa |
| `buivansang_iot_pj/led2/state` | ESP32 → Broker | Trạng thái Quạt |
| `buivansang_iot_pj/led3/state` | ESP32 → Broker | Trạng thái Đèn |
| `buivansang_iot_pj/threshold/temp` | Broker → ESP32 | Ngưỡng nhiệt độ (retain) |
| `buivansang_iot_pj/threshold/hum` | Broker → ESP32 | Ngưỡng độ ẩm (retain) |
| `buivansang_iot_pj/threshold/lux` | Broker → ESP32 | Ngưỡng ánh sáng (retain) |

---

## 🗄️ Database Schema

| Bảng | Mô tả |
|------|-------|
| `dulieucambien` | Lịch sử đo đạc cảm biến từ ESP32 |
| `thietbi` | Danh sách và trạng thái các thiết bị (điều hòa, quạt, đèn) |
| `luat` | Cấu hình luật tự động hóa và ngưỡng cảm biến |
| `nguoidung` | Thông tin người dùng (liên kết Supabase Auth) |
| `nhatkyhoatdong` | Nhật ký mọi hành động điều khiển |
| `lichhengio` | Lịch hẹn giờ bật/tắt thiết bị |

---

## 🔗 Endpoints

### Backend Health Check

```
GET https://YOUR_RENDER_SERVICE.onrender.com/health
```

Response mẫu:
```json
{
  "status": "ok",
  "service": "Smart Home IoT Bridge",
  "uptime_seconds": 3600,
  "mqtt_connected": true,
  "timestamp": "2026-07-09T07:00:00.000Z"
}
```

---

## 👤 Tài khoản demo

| Field | Value |
|-------|-------|
| Email | `buivanchung22109@gmail.com` |
| Password | `Admin@123` |
| Local Frontend URL | `http://localhost:3000` |


---

## 📝 License

MIT License — Dự án học tập IoT, PTIT 2026.
