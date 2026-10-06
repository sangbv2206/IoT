'use strict';
/**
 * telemetryService.js — Gom cụm, lọc nhiễu, điều tiết lưu Supabase & kích hoạt luật tự động.
 */
const { SETTINGS } = require('../config/config');
const logger = require('../utils/logger');
const supabaseService = require('./supabaseService');
const automationService = require('./automationService');
const sceneService = require('./sceneService');

const nodeBufferMap = new Map();       // Map<nodeId, { temp, hum, lux, tempTime, humTime, luxTime }>
const latestTelemetryMap = new Map();  // Map<nodeId, { temp, hum, lux, nodeId, updatedAt }>
const nodeLastSavedMap = new Map();    // Map<nodeId, { lastSavedTime, lastTemp, lastHum, lastLux }>
const bufferFallbackTimers = new Map();// Map<nodeId, timerId>
const combinedCooldownMap = new Map(); // Map<nodeId, timestamp>

function getNodeTelemetry(nodeId) {
  if (!latestTelemetryMap.has(nodeId)) latestTelemetryMap.set(nodeId, { temp: null, hum: null, lux: null, nodeId, updatedAt: 0 });
  return latestTelemetryMap.get(nodeId);
}

function getNodeBuffer(nodeId) {
  if (!nodeBufferMap.has(nodeId)) nodeBufferMap.set(nodeId, { temp: null, hum: null, lux: null, tempTime: 0, humTime: 0, luxTime: 0 });
  return nodeBufferMap.get(nodeId);
}

function shouldSaveToDatabase(nodeId, t, h, l, now) {
  if (!nodeLastSavedMap.has(nodeId)) return true;
  const last = nodeLastSavedMap.get(nodeId);
  if (now - (last.lastSavedTime || 0) >= (SETTINGS.TELEMETRY_DB_INTERVAL_MS || 30000)) return true;

  const lim = SETTINGS.SIGNIFICANT_CHANGE || { TEMP: 1.0, HUM: 5.0, LUX: 50.0 };
  return (t != null && last.lastTemp != null && Math.abs(t - last.lastTemp) >= lim.TEMP) ||
         (h != null && last.lastHum != null && Math.abs(h - last.lastHum) >= lim.HUM) ||
         (l != null && last.lastLux != null && Math.abs(l - last.lastLux) >= lim.LUX);
}

async function saveAndEvaluateSensorData(nodeId, t, h, l, now = Date.now()) {
  latestTelemetryMap.set(nodeId, { temp: t, hum: h, lux: l, nodeId, updatedAt: now });
  supabaseService.updateNodeTelemetry(nodeId).catch(() => {});
  let record = { idnode: nodeId, nhiet_do: t, do_am: h, anh_sang: l };

  if (shouldSaveToDatabase(nodeId, t, h, l, now)) {
    // Khóa chống ghi trùng đồng thời (concurrency lock)
    nodeLastSavedMap.set(nodeId, { lastSavedTime: now, lastTemp: t, lastHum: h, lastLux: l });
    logger.info(`[Cảm biến][${nodeId}] Ghi Supabase: ${t ?? '--'}°C | ${h ?? '--'}% | ${l ?? '--'} lx`);
    try {
      const inserted = await supabaseService.insertSensorData(t, h, l, nodeId);
      if (inserted) record = inserted;
    } catch (err) { logger.error(`[Cảm biến][${nodeId}] Lỗi ghi Supabase:`, err.message); }
  }

  try {
    await automationService.evaluateRules(record);
    await sceneService.evaluateSensorScenes(record);
  } catch (err) { logger.error(`[Tự động hóa][${nodeId}] Lỗi đánh giá luật:`, err.message); }
}

function startBufferFallbackTimer(nodeId) {
  if (bufferFallbackTimers.has(nodeId)) clearTimeout(bufferFallbackTimers.get(nodeId));
  const timer = setTimeout(async () => {
    const buf = getNodeBuffer(nodeId);
    if (buf.temp == null && buf.hum == null && buf.lux == null) return;
    const { temp, hum, lux } = buf;
    buf.temp = null; buf.hum = null; buf.lux = null;
    bufferFallbackTimers.delete(nodeId);
    logger.warn(`[Cảm biến][${nodeId}] Timeout gom cụm. Lưu dữ liệu hiện có: ${temp ?? '--'}°C | ${hum ?? '--'}% | ${lux ?? '--'} lx`);
    await saveAndEvaluateSensorData(nodeId, temp, hum, lux, Date.now());
  }, (SETTINGS.BUFFER_TIMEOUT_MS || 7000) + 1000);
  bufferFallbackTimers.set(nodeId, timer);
}

async function handleCombinedTelemetryInput(nodeId, payloadStr) {
  try {
    const data = JSON.parse(payloadStr);
    const rawT = data.temperature ?? data.temp, rawH = data.humidity ?? data.hum, rawL = data.lux ?? data.light;
    const t = rawT != null ? parseFloat(rawT) : null;
    const h = rawH != null ? parseFloat(rawH) : null;
    const l = rawL != null ? parseFloat(rawL) : null;

    if (t == null || h == null || l == null || isNaN(t) || isNaN(h) || isNaN(l)) return;

    const { LIMITS } = SETTINGS;
    if (t < LIMITS.TEMP.MIN || t > LIMITS.TEMP.MAX || h < LIMITS.HUM.MIN || h > LIMITS.HUM.MAX || l < LIMITS.LUX.MIN || l > LIMITS.LUX.MAX) {
      logger.warn(`[Cảm biến][${nodeId}] Dữ liệu ngoài ngưỡng: T=${t}, H=${h}, L=${l}. Bỏ qua.`);
      return;
    }

    combinedCooldownMap.set(nodeId, Date.now());
    const buf = getNodeBuffer(nodeId);
    buf.temp = null; buf.hum = null; buf.lux = null;
    if (bufferFallbackTimers.has(nodeId)) {
      clearTimeout(bufferFallbackTimers.get(nodeId));
      bufferFallbackTimers.delete(nodeId);
    }
    await saveAndEvaluateSensorData(nodeId, t, h, l, Date.now());
  } catch (err) { logger.warn(`[Cảm biến][${nodeId}] Lỗi parse sensors JSON:`, err.message); }
}

async function handleTelemetryInput(nodeId, sensorType, valueStr) {
  const now = Date.now();
  if (now - (combinedCooldownMap.get(nodeId) || 0) < 5000) return; // Bỏ qua trùng lặp khi gói /sensors vừa tới
  const value = parseFloat(valueStr);
  if (isNaN(value)) return;

  const { LIMITS } = SETTINGS;
  const buf = getNodeBuffer(nodeId);
  if (sensorType === 'temp' && value >= LIMITS.TEMP.MIN && value <= LIMITS.TEMP.MAX) { buf.temp = value; buf.tempTime = now; }
  else if (sensorType === 'hum' && value >= LIMITS.HUM.MIN && value <= LIMITS.HUM.MAX) { buf.hum = value; buf.humTime = now; }
  else if (sensorType === 'lux' && value >= LIMITS.LUX.MIN && value <= LIMITS.LUX.MAX) { buf.lux = value; buf.luxTime = now; }
  else return;

  if (buf.temp != null && buf.hum != null && buf.lux != null) {
    if (Math.max(buf.tempTime, buf.humTime, buf.luxTime) - Math.min(buf.tempTime, buf.humTime, buf.luxTime) <= (SETTINGS.BUFFER_TIMEOUT_MS || 7000)) {
      const { temp: t, hum: h, lux: l } = buf;
      buf.temp = null; buf.hum = null; buf.lux = null;
      if (bufferFallbackTimers.has(nodeId)) { clearTimeout(bufferFallbackTimers.get(nodeId)); bufferFallbackTimers.delete(nodeId); }
      await saveAndEvaluateSensorData(nodeId, t, h, l, now);
      return;
    }
  }
  startBufferFallbackTimer(nodeId);
}

module.exports = { handleTelemetryInput, handleCombinedTelemetryInput, getNodeTelemetry };
