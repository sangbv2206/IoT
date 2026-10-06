'use strict';

const http = require('http');
const https = require('https');
const { TOPICS, TOPIC_PREFIX } = require('./config/config');
const logger = require('./utils/logger');
const mqttService = require('./services/mqttService');
const supabaseService = require('./services/supabaseService');
const scheduleService = require('./services/scheduleService');
const sceneService = require('./services/sceneService');
const voiceService = require('./services/voiceService');
const { handleTelemetryInput, handleCombinedTelemetryInput } = require('./services/telemetryService');
const {
  handleDeviceStateInput,
  getDeviceFromTopic,
  getDeviceTopics,
  setupRealtimeListeners,
  updateLocalDeviceCache,
  initializeCache
} = require('./services/deviceSyncService');
const { handleHeartbeatInput, loadSystemConfig, startOfflineChecker } = require('./services/heartbeatService');

// ─── MQTT Message Router (Bộ đệm lọc trùng lặp tin nhắn 400ms) ───────────────
const recentMsgMap = new Map();

function onMqttMessage(topic, valueStr) {
  const now = Date.now();
  const prev = recentMsgMap.get(topic);
  if (prev && prev.val === valueStr && (now - prev.t < 400)) return;
  recentMsgMap.set(topic, { val: valueStr, t: now });
  if (recentMsgMap.size > 200) {
    for (const [k, v] of recentMsgMap) { if (now - v.t > 4000) recentMsgMap.delete(k); }
  }

  const parts = topic.split('/');
  if (parts.length < 2) return;

  // 1. Heartbeat: {prefix}/{nodeId}/heartbeat
  if (topic.endsWith('/heartbeat')) {
    return handleHeartbeatInput(parts[1], valueStr);
  }

  // 2. Kịch bản thông minh: {prefix}/{nodeId}/scene
  if (topic.endsWith('/scene')) {
    let p = null;
    try { p = JSON.parse(valueStr); } catch {}
    const payloadNode = p?.node_id;
    if (parts.length === 2 && payloadNode) return;

    const nodeId = parts.length >= 3 && parts[1] !== 'scene' ? parts[1] : (payloadNode || 'CC:2D:2B:9F:C1:14');
    const sceneId = p?.scene_id || valueStr.trim();
    const source = p?.source || 'web';
    const userId = p?.userId || null;
    const isDeactivate = Boolean(p?.is_deactivate);
    const actions = p?.actions || null;
    const sceneName = p?.scene_name || null;
    return sceneService.activateScene(nodeId, sceneId, source, userId, isDeactivate, actions, sceneName);
  }

  // 3. Telemetry tổng hợp JSON: {prefix}/{nodeId}/sensors
  if (topic.endsWith('/sensors')) {
    if (parts.length < 3) return;
    return handleCombinedTelemetryInput(parts[1], valueStr);
  }

  // 4. Telemetry cảm biến lẻ: {prefix}/{nodeId}/temp|hum|lux
  if (!topic.includes('/threshold/') && (topic.endsWith('/temp') || topic.endsWith('/hum') || topic.endsWith('/lux'))) {
    if (parts.length < 3) return;
    const type = topic.endsWith('/temp') ? 'temp' : topic.endsWith('/hum') ? 'hum' : 'lux';
    return handleTelemetryInput(parts[1], type, valueStr);
  }

  // 5. Cảnh báo an ninh phần cứng: {prefix}/{nodeId}/alert
  if (topic.endsWith('/alert')) {
    const nodeId = parts[1];
    let alert = {};
    try { alert = JSON.parse(valueStr); } catch { alert = { message: valueStr }; }
    logger.warn(`[Anti-Tamper][${nodeId}]`, alert);
    supabaseService.writeActionLog(null, `[Cảnh báo an ninh] ${alert.message || alert.reason || valueStr}`, null, null, nodeId, 'system_alert', alert);
    return;
  }

  // 6. Quản trị phần cứng & An ninh
  if (topic.endsWith('/ir/received')) return logger.info(`[Mắt thu IR][${parts[1]}] Tín hiệu: ${valueStr}`);
  if (topic.endsWith('/wifi/power/state')) {
    try {
      const p = JSON.parse(valueStr);
      if (p.cpu_temp || p.rssi) handleHeartbeatInput(parts[1], JSON.stringify({ cpu_temp: p.cpu_temp, rssi: p.rssi }));
    } catch {}
    return;
  }

  // 7. Trạng thái thiết bị phần cứng (led, fan, curtain, tv, automode...)
  const deviceInfo = getDeviceFromTopic(topic);
  if (deviceInfo) return handleDeviceStateInput(deviceInfo, valueStr);
}

// ─── Đồng bộ khởi động từ Database → MQTT (Không tự ý bật thiết bị) ──────────
async function syncStartupState() {
  logger.info('[Startup Sync] Đồng bộ cấu hình ban đầu từ DB...');

  // 1. Nạp cache trạng thái thiết bị
  const { data: devs } = await supabaseService.supabase.from('thietbi').select('id_thietbi, trangthai, tu_dong, cau_hinh');
  if (devs?.length) {
    devs.forEach(d => updateLocalDeviceCache(d.id_thietbi, d.trangthai, d.tu_dong, d.cau_hinh));
    logger.info(`[Startup Sync] Đã nạp cache ${devs.length} thiết bị.`);
  }

  // 2. Đảm bảo các luật tự động hợp lệ cho actuator
  await supabaseService.ensureRulesExist();

  // 3. Đồng bộ ngưỡng cảm biến lên MQTT (chỉ publish ngưỡng cấu hình, không ép bật tắt thiết bị)
  const rules = await supabaseService.getAllRules();
  const threshMap = {};
  const KEY_MAP = { nhiet_do: 'NhietDo', do_am: 'DoAm', anh_sang: 'AnhSang' };

  for (const r of rules) {
    const k = KEY_MAP[(r.ten_thong_so || '').toLowerCase()];
    if (k && r.nguong != null) threshMap[k] = Number(r.nguong);
  }

  if (threshMap['NhietDo'] !== undefined) mqttService.publish(TOPICS.THRESHOLD_TEMP, String(threshMap['NhietDo']), { retain: true, qos: 1 });
  if (threshMap['DoAm']    !== undefined) mqttService.publish(TOPICS.THRESHOLD_HUM,  String(threshMap['DoAm']),    { retain: true, qos: 1 });
  if (threshMap['AnhSang'] !== undefined) mqttService.publish(TOPICS.THRESHOLD_LUX,  String(threshMap['AnhSang']), { retain: true, qos: 1 });

  logger.success('[Startup Sync] Hoàn tất đồng bộ cấu hình.');
}

// ─── HTTP Server (Health & Voice Proxy) ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
const serverStartTime = Date.now();

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if ((req.url || '').startsWith('/api/voice') || (req.url || '').startsWith('/api/esp32')) {
    return voiceService.handleHttpRequest(req, res);
  }

  if (req.url === '/voice/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      voice_service: 'running',
      engine: 'Node.js Native AI (Groq + Gemini)',
      port: voiceService.port,
      ready: voiceService.isReady
    }));
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok', service: 'Smart Home IoT Backend (Unified)',
      uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
      mqtt_connected: mqttService.isConnected?.() ?? 'unknown',
      voice_ai: voiceService.isReady ? 'ready' : 'starting',
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found\n');
});

// ─── Bootstrap Main ──────────────────────────────────────────────────────────
async function main() {
  logger.info('=== KHỞI ĐỘNG SMART HOME IOT BACKEND (UNIFIED) ===');

  await loadSystemConfig();
  voiceService.start();
  mqttService.connect(onMqttMessage, () => syncStartupState().catch(e => logger.error('Startup sync error:', e.message)));
  await initializeCache();
  setupRealtimeListeners((topic, payload, opts) => mqttService.publish(topic, payload, opts));
  startOfflineChecker();
  scheduleService.start();

  httpServer.listen(PORT, () => {
    logger.success(`HTTP Server đang chạy tại cổng ${PORT}`);
    logger.info(`  → /health         : Trạng thái hệ thống`);
    logger.info(`  → /voice/health   : Trạng thái Voice AI (Groq + Gemini)`);
    logger.info(`  → /api/voice/*    : Voice AI Web API`);
    logger.info(`  → /api/esp32/*    : ESP32 Audio Receiver (Port 8001 & 5000)`);

    // Self-ping cho Render Free Tier
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || null;
    if (RENDER_URL) {
      setInterval(() => {
        const url = `${RENDER_URL}/health`;
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, r => { r.resume(); logger.info(`[Self-Ping] ${url} → HTTP ${r.statusCode}`); })
           .on('error', e => logger.warn(`[Self-Ping] Lỗi: ${e.message}`));
      }, 10 * 60 * 1000);
    }
  });
}

function gracefulShutdown() {
  logger.info('Đang tắt tiến trình...');
  try { httpServer.close(); } catch {}
  voiceService.stop();
  mqttService.close();
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

main().catch(err => { logger.error('Lỗi khởi động:', err.message); process.exit(1); });
