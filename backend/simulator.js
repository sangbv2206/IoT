/**
 * ESP32 Hardware Simulator for IoT Smart Home
 * Dành cho thành viên nhóm hoặc tester KHÔNG CÓ PHẦN CỨNG ESP32.
 * Giả lập gửi dữ liệu cảm biến DHT11, BH1750, Heartbeat và phản hồi bật/tắt thiết bị qua MQTT.
 * 
 * Chạy lệnh: npm run sim
 */
'use strict';

require('dotenv').config();
const mqtt = require('mqtt');

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com';
const PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
const PREFIX = process.env.MQTT_TOPIC_PREFIX || 'buivansang_iot_pj';
const NODE_ID = process.env.SIMULATOR_NODE_ID || 'NODE-LIVINGROOM-01';

console.log('='.repeat(60));
console.log('KHỞI ĐỘNG BỘ GIẢ LẬP PHẦN CỨNG ESP32-S3 (MOCK HARDWARE)');
console.log(`Broker: ${BROKER_URL}:${PORT}`);
console.log(`Topic Prefix: ${PREFIX}`);
console.log(`Simulated Node ID: ${NODE_ID}`);
console.log('='.repeat(60));

const client = mqtt.connect(BROKER_URL, {
  port: PORT,
  clientId: `ESP32_SIMULATOR_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 3000
});

// Trạng thái thiết bị ảo
const deviceStates = {
  den: 'OFF',       // GPIO 4
  quat: 'OFF',      // GPIO 6
  rem_cua: 'CLOSE', // GPIO 7 (Servo)
  tv: 'OFF'         // GPIO 5 (IR)
};

// Giá trị cảm biến ngẫu nhiên dao động
let currentTemp = 28.5;
let currentHum = 65;
let currentLux = 320;

client.on('connect', () => {
  console.log('\n [SIMULATOR] Đã kết nối MQTT Broker thành công!');
  
  // Đăng ký nhận lệnh điều khiển gửi tới node này hoặc topic chung
  const subTopics = [
    `${PREFIX}/${NODE_ID}/#`,
    `${PREFIX}/den`,
    `${PREFIX}/quat`,
    `${PREFIX}/rem_cua`,
    `${PREFIX}/curtain`,
    `${PREFIX}/tv`,
    `${PREFIX}/threshold/#`
  ];

  subTopics.forEach(t => {
    client.subscribe(t, { qos: 1 });
  });
  console.log(`👂 [SIMULATOR] Đang lắng nghe lệnh điều khiển trên: ${PREFIX}/${NODE_ID}/#`);

  // Publish trạng thái ban đầu của thiết bị
  publishState('den', deviceStates.den);
  publishState('quat', deviceStates.quat);
  publishState('rem_cua', deviceStates.rem_cua);
  publishState('tv', deviceStates.tv);

  // Bắt đầu chu kỳ gửi cảm biến & heartbeat
  startSensorLoop();
  startHeartbeatLoop();
});

// Hàm publish trạng thái thiết bị
function publishState(device, state) {
  const topic = `${PREFIX}/${NODE_ID}/${device}/state`;
  client.publish(topic, state, { retain: true, qos: 1 });
  // Đồng thời publish theo alias ngắn nếu có
  if (device === 'den') client.publish(`${PREFIX}/${NODE_ID}/led3/state`, state, { retain: true, qos: 1 });
  if (device === 'quat') client.publish(`${PREFIX}/${NODE_ID}/led2/state`, state, { retain: true, qos: 1 });
  if (device === 'rem_cua') client.publish(`${PREFIX}/${NODE_ID}/curtain/state`, state, { retain: true, qos: 1 });
  console.log(`📤 [TRẠNG THÁI] ${device.toUpperCase()} -> ${state}`);
}

// Xử lý khi Web/Backend gửi lệnh điều khiển tới thiết bị
client.on('message', (topic, message) => {
  const payload = message.toString().trim();
  const parts = topic.split('/');

  // Bỏ qua các tin nhắn trạng thái do chính simulator hoặc hệ thống gửi
  if (topic.endsWith('/state') || topic.endsWith('/sensors') || topic.endsWith('/heartbeat')) return;

  console.log(`\n📥 [LỆNH MỚI] Topic: "${topic}" | Payload: "${payload}"`);

  // Xử lý lệnh theo thiết bị
  if (topic.endsWith('/den') || topic.endsWith('/led3') || topic.endsWith('/light')) {
    deviceStates.den = (payload === 'ON' || payload === '1') ? 'ON' : 'OFF';
    publishState('den', deviceStates.den);
  } else if (topic.endsWith('/quat') || topic.endsWith('/led2') || topic.endsWith('/fan')) {
    deviceStates.quat = (payload === 'ON' || payload === '1') ? 'ON' : 'OFF';
    publishState('quat', deviceStates.quat);
  } else if (topic.endsWith('/rem_cua') || topic.endsWith('/curtain')) {
    deviceStates.rem_cua = (payload === 'OPEN' || payload === 'ON' || payload === '1') ? 'OPEN' : 'CLOSE';
    publishState('rem_cua', deviceStates.rem_cua);
  } else if (topic.endsWith('/tv') || topic.endsWith('/tivi')) {
    if (payload === 'TOGGLE') {
      deviceStates.tv = deviceStates.tv === 'ON' ? 'OFF' : 'ON';
    } else {
      deviceStates.tv = (payload === 'ON' || payload === '1') ? 'ON' : 'OFF';
    }
    publishState('tv', deviceStates.tv);
  }
});

// Giả lập gửi cảm biến DHT11 & BH1750 định kỳ mỗi 4 giây
function startSensorLoop() {
  setInterval(() => {
    // Biến thiên nhẹ giá trị
    currentTemp = parseFloat((26 + Math.random() * 6).toFixed(1)); // 26.0 - 32.0 °C
    currentHum = Math.round(55 + Math.random() * 25);              // 55 - 80 %
    currentLux = Math.round(150 + Math.random() * 400);            // 150 - 550 lux

    const sensorData = {
      temp: currentTemp,
      hum: currentHum,
      lux: currentLux,
      timestamp: Date.now()
    };

    // Gửi gói tổng hợp /sensors
    const sensorsTopic = `${PREFIX}/${NODE_ID}/sensors`;
    client.publish(sensorsTopic, JSON.stringify(sensorData));

    // Gửi gói cảm biến lẻ để tương thích toàn bộ hệ thống
    client.publish(`${PREFIX}/${NODE_ID}/temp`, String(currentTemp));
    client.publish(`${PREFIX}/${NODE_ID}/hum`, String(currentHum));
    client.publish(`${PREFIX}/${NODE_ID}/lux`, String(currentLux));

    console.log(`[CẢM BIẾN] Gửi: ${currentTemp}°C | ${currentHum}% | ${currentLux} lx`);
  }, 4000);
}

// Giả lập gửi Heartbeat định kỳ mỗi 10 giây (giúp Node hiển thị "Online" trên Web)
function startHeartbeatLoop() {
  setInterval(() => {
    const hbData = {
      cpu_temp: parseFloat((36 + Math.random() * 4).toFixed(1)),
      rssi: -55 - Math.round(Math.random() * 10),
      uptime: process.uptime(),
      free_heap: 240000
    };
    client.publish(`${PREFIX}/${NODE_ID}/heartbeat`, JSON.stringify(hbData));
  }, 10000);
}

client.on('error', (err) => {
  console.error('[SIMULATOR LỖI]:', err.message);
});
