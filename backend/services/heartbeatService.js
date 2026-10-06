'use strict';
const logger = require('../utils/logger');
const supabaseService = require('./supabaseService');

const HB_TIMEOUT_S = parseInt(process.env.HEARTBEAT_TIMEOUT_S || '60', 10);
const RSSI_THRESHOLD = parseInt(process.env.RSSI_THRESHOLD || '-80', 10);
const CHECK_INTERVAL_MS = parseInt(process.env.OFFLINE_CHECK_INTERVAL_MS || '30000', 10);
const COOLDOWN_MS = parseInt(process.env.ALERT_COOLDOWN_MS || '900000', 10);

let systemConfig = { hbTimeout: HB_TIMEOUT_S, rssiThreshold: RSSI_THRESHOLD };
const alertCooldowns = new Map();

async function loadSystemConfig() {
  try {
    const { data } = await supabaseService.supabase
      .from('iot_nodes').select('rssi').eq('idnode', 'SYSTEM_CONFIG').maybeSingle();
    if (data?.rssi) systemConfig.rssiThreshold = Number(data.rssi) || RSSI_THRESHOLD;
  } catch (err) { logger.error('Lỗi tải cấu hình hệ thống:', err.message); }
}

const lastHeartbeatLogMap = new Map();

async function handleHeartbeatInput(nodeMac, valueStr) {
  try {
    if (!nodeMac || nodeMac === 'SYSTEM_CONFIG') return;
    let data;
    try { data = JSON.parse(valueStr); }
    catch { const n = parseFloat(valueStr); if (!isNaN(n)) data = { uptime: n }; else return; }
    if (!data || typeof data !== 'object') data = typeof data === 'number' ? { uptime: data } : {};

    const now = Date.now();
    const lastLog = lastHeartbeatLogMap.get(nodeMac) || 0;
    if (now - lastLog >= 60000) {
      lastHeartbeatLogMap.set(nodeMac, now);
      logger.info(`[Heartbeat] Node=${nodeMac} RSSI=${data.rssi ?? 'N/A'}`);
    }

    await supabaseService.updateNodeTelemetry(nodeMac, data);
    alertCooldowns.delete(`${nodeMac}:mqtt_disconnect`);

    if (typeof data.rssi === 'number' && data.rssi < systemConfig.rssiThreshold) {
      const k = `${nodeMac}:rssi_weak`, last = alertCooldowns.get(k) || 0;
      if (Date.now() - last > COOLDOWN_MS) {
        alertCooldowns.set(k, Date.now());
        await supabaseService.insertTechnicalAlert(nodeMac, 'rssi_weak', 'warning', `Sóng Wi-Fi yếu (${data.rssi} dBm < ${systemConfig.rssiThreshold} dBm).`);
        const msg = `[Cảnh báo] Sóng Wi-Fi tại node ${nodeMac} yếu (${data.rssi} dBm).`;
        await supabaseService.writeActionLog(null, msg, null, null, nodeMac, 'system_alert');
      }
    }
  } catch (err) { logger.error(`Lỗi heartbeat ${nodeMac}:`, err.message); }
}

function startOfflineChecker() {
  const checkOffline = async () => {
    try {
      const { data: nodes, error } = await supabaseService.supabase
        .from('iot_nodes').select('*').eq('trang_thai', 'online');
      if (error || !nodes?.length) return;

      const timeoutMs = (systemConfig.hbTimeout || HB_TIMEOUT_S) * 1000, now = Date.now();
      for (const node of nodes) {
        if (node.idnode === 'SYSTEM_CONFIG' || !node.last_heartbeat) continue;
        const lastHb = new Date(node.last_heartbeat).getTime();
        if (isNaN(lastHb) || (now - lastHb) <= timeoutMs) continue;

        logger.warn(`[Node Timeout] "${node.idnode}" (${node.ten_phong}) mất heartbeat >${systemConfig.hbTimeout}s → offline.`);
        await supabaseService.setNodeOffline(node.idnode);

        const k = `${node.idnode}:mqtt_disconnect`, last = alertCooldowns.get(k) || 0;
        if (now - last > COOLDOWN_MS) {
          alertCooldowns.set(k, now);
          let detail = `Thiết bị ${node.idnode} (${node.ten_phong}) bị ngắt kết nối.`;
          if (node.idnguoidung) {
            const sibs = nodes.filter(n => n.idnguoidung === node.idnguoidung);
            if (sibs.length > 1) {
              const allDown = sibs.every(s => s.idnode === node.idnode || (now - new Date(s.last_heartbeat).getTime()) > timeoutMs);
              detail += allDown ? ' Nghi ngờ mất điện/Internet toàn nhà.' : ' Các thiết bị khác vẫn hoạt động.';
            }
          }
          await supabaseService.insertTechnicalAlert(node.idnode, 'mqtt_disconnect', 'critical', detail);
          const msg = `[Mất kết nối] Thiết bị tại phòng ${node.ten_phong} đã ngoại tuyến.`;
          await supabaseService.writeActionLog(null, msg, null, node.idnguoidung || null, node.idnode, 'system_alert');
        }
      }
    } catch (err) { logger.error('Lỗi quét offline:', err.message); }
  };

  // Quét ngay lập tức khi khởi động server để dọn sạch các node ma chưa cắm điện
  checkOffline();
  setInterval(checkOffline, CHECK_INTERVAL_MS);
}

module.exports = { handleHeartbeatInput, loadSystemConfig, startOfflineChecker };
