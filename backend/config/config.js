require('dotenv').config();
const logger = require('../utils/logger');

// Kiểm tra các biến môi trường bắt buộc
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
  process.exit(1);
}

// Cấu hình MQTT Broker
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com';
const mqttPort = parseInt(process.env.MQTT_PORT || '1883', 10);

// Tiền tố topic: Ưu tiên đọc từ biến môi trường
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'buivansang_iot_pj';

const TOPICS = {
  // ─── 1. Telemetry & Heartbeat (ESP32 -> Backend) ─────────────
  ALL_SENSORS:      `${TOPIC_PREFIX}/+/sensors`,   // Gói JSON tổng hợp DHT11 + BH1750
  TEMP_WILDCARD:    `${TOPIC_PREFIX}/+/temp`,      // Nhiệt độ DHT11 (GPIO 10)
  HUM_WILDCARD:     `${TOPIC_PREFIX}/+/hum`,       // Độ ẩm DHT11 (GPIO 10)
  LUX_WILDCARD:     `${TOPIC_PREFIX}/+/lux`,       // Cường độ ánh sáng BH1750 (I2C 8,9)
  SENSORS_WILDCARD: `${TOPIC_PREFIX}/+/sensors`,
  HEARTBEAT:        `${TOPIC_PREFIX}/+/heartbeat`,

  // ─── 2. Trạng thái thiết bị phần cứng (ESP32 -> Backend) ────
  // Bắt toàn bộ trạng thái {nodeId}/{device}/state bằng wildcard 2 cấp
  ALL_DEVICE_STATES: `${TOPIC_PREFIX}/+/+/state`,

  // Chi tiết từng thiết bị thực tế trên mạch:
  LIGHT_STATE_WILDCARD:   `${TOPIC_PREFIX}/+/light/state`,    // Đèn phòng khách (GPIO 4 - PWM)
  FAN_STATE_WILDCARD:     `${TOPIC_PREFIX}/+/fan/state`,      // Quạt phòng khách (GPIO 6 - PWM)
  CURTAIN_STATE_WILDCARD: `${TOPIC_PREFIX}/+/curtain/state`,  // Rèm cửa thông minh (GPIO 7 - Servo)
  
  // ─── 3. Hệ thống Hồng ngoại IR (Thu & Phát) ──────────────────
  IR_RECEIVE_WILDCARD:    `${TOPIC_PREFIX}/+/ir/received`,    // Mắt thu IR 1838 (GPIO 3) nhận tín hiệu
  IR_SEND_WILDCARD:       `${TOPIC_PREFIX}/+/ir/send`,        // Lệnh phát tín hiệu qua LED IR (GPIO 5)
  TV_STATE_WILDCARD:      `${TOPIC_PREFIX}/+/tv/state`,       // Trạng thái Tivi ảo (điều khiển qua IR)

  // ─── 4. Tự động hóa (2 Chế độ theo 2 cảm biến phần cứng) ────
  AUTO_LIGHT_WILDCARD:    `${TOPIC_PREFIX}/+/automode_light/state`, // Tự động Đèn/Rèm theo ánh sáng BH1750
  AUTO_FAN_WILDCARD:      `${TOPIC_PREFIX}/+/automode_fan/state`,   // Tự động Quạt theo nhiệt độ/độ ẩm DHT11

  // ─── 5. Quản trị hệ thống & An ninh ─────────────────────────
  WIFI_POWER_WILDCARD:    `${TOPIC_PREFIX}/+/wifi/power/state`,
  ALERT_WILDCARD:         `${TOPIC_PREFIX}/+/alert`,

  // ─── 6. Kịch bản thông minh (Smart Scenes) ──────────────────
  SCENE_WILDCARD:         `${TOPIC_PREFIX}/+/scene`,
  SCENE_GLOBAL:           `${TOPIC_PREFIX}/scene`,

  // ─── 7. Cấu hình ngưỡng cảm biến (Broker -> ESP32) ──────────
  THRESHOLD_TEMP:         `${TOPIC_PREFIX}/threshold/temp`,
  THRESHOLD_HUM:          `${TOPIC_PREFIX}/threshold/hum`,
  THRESHOLD_LUX:          `${TOPIC_PREFIX}/threshold/lux`,

  // Tiện ích sinh topic lệnh và trạng thái
  cmd: (nodeId, device) => `${TOPIC_PREFIX}/${nodeId}/${device}`,
  state: (nodeId, device) => `${TOPIC_PREFIX}/${nodeId}/${device}/state`
};

// Cấu hình các ngưỡng giới hạn kiểm tra dữ liệu và bộ lọc
const SETTINGS = {
  // Khoảng thời gian lệch tối đa giữa các gói tin để gom cụm cảm biến (ms)
  BUFFER_TIMEOUT_MS: 7000,
  
  // Thời gian chờ tối thiểu giữa các lần ghi DB Supabase theo từng node (ms)
  TELEMETRY_DB_INTERVAL_MS: parseInt(process.env.TELEMETRY_DB_INTERVAL_MS || '30000', 10),

  // Ngưỡng biến thiên giá trị cảm biến kích hoạt ghi DB sớm (vượt ngưỡng đáng kể)
  SIGNIFICANT_CHANGE: {
    TEMP: 1.0,  // lệch >= 1.0 °C
    HUM: 5.0,   // lệch >= 5.0 %
    LUX: 50.0   // lệch >= 50 lux
  },

  // Thời gian chờ tối thiểu giữa các lần kích hoạt tự động cùng một thiết bị (ms)
  AUTOMATION_COOLDOWN_MS: 3000, 
  
  // Ngưỡng dữ liệu cảm biến hợp lệ để lọc nhiễu dị thường
  LIMITS: {
    TEMP: { MIN: 0,   MAX: 60    },
    HUM:  { MIN: 0,   MAX: 100   },
    LUX:  { MIN: 0,   MAX: 10000 },
  }
};

module.exports = {
  supabaseUrl,
  supabaseServiceKey,
  mqttBrokerUrl,
  mqttPort,
  TOPIC_PREFIX,
  TOPICS,
  SETTINGS
};
