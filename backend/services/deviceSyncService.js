'use strict';

const logger = require('../utils/logger');
const supabaseService = require('./supabaseService');
const automationService = require('./automationService');
const { getNodeTelemetry } = require('./telemetryService');
const { TOPIC_PREFIX, TOPICS } = require('../config/config');

// ─── Constants & Mapping ──────────────────────────────────────────────────────
const TRACKED_PROPS = ['brightness', 'speed', 'position', 'volume', 'channel'];
const PROP_ALIAS = { brightness: 'brightness', speed: 'speed', pos: 'position', position: 'position', volume: 'volume', channel: 'channel' };
const PROP_TOPIC = { brightness: 'brightness', speed: 'speed', position: 'pos', volume: 'volume', channel: 'channel' };
const HW_MAP = { led2: 'quat', led3: 'den', curtain: 'rem_cua', led1: 'rem_cua', tv: 'tivi', fan: 'quat', light: 'den' };
const REVERSE_HW_MAP = { quat: 'led2', den: 'led3', rem_cua: 'curtain', tivi: 'tv' };
const STATUS_ON = new Set(['ON', '1', 'OPEN']);
const EXCLUDES = new Set(['wifi', 'child_lock', 'guest_mode', 'heartbeat', 'sensors', 'alert', 'ir']);
const THRESHOLD_TOPICS = { nhiet_do: TOPICS.THRESHOLD_TEMP, do_am: TOPICS.THRESHOLD_HUM, anh_sang: TOPICS.THRESHOLD_LUX };

// Cache cục bộ chống phản hồi vòng lặp (Echo Ping-Pong)
const localDeviceStateCache = new Map();
const localRuleStateCache = new Map();

function updateLocalDeviceCache(idThietBi, trangthai, tuDong, cauHinh = null) {
  const cur = localDeviceStateCache.get(idThietBi) || {};
  const props = {};
  for (const p of TRACKED_PROPS) {
    props[p] = cauHinh?.[p] !== undefined ? (p === 'channel' ? String(cauHinh[p]) : Number(cauHinh[p])) : cur[p];
  }
  localDeviceStateCache.set(idThietBi, {
    trangthai: trangthai !== undefined ? trangthai : cur.trangthai,
    tu_dong: tuDong !== undefined ? tuDong : cur.tu_dong,
    ...props,
  });
}

async function initializeCache() {
  try {
    const { data: devs } = await supabaseService.supabase.from('thietbi').select('*');
    for (const d of devs || []) updateLocalDeviceCache(d.id_thietbi, d.trangthai, d.tu_dong, d.cau_hinh);
    const { data: rules } = await supabaseService.supabase.from('luat').select('*');
    for (const r of rules || []) localRuleStateCache.set(r.idluat, { automation: r.automation, nguong: r.nguong });
    logger.success(`[Cache] Đã nạp ${localDeviceStateCache.size} thiết bị & ${localRuleStateCache.size} luật vào cache`);
  } catch (err) { logger.error('[Cache] Lỗi khởi tạo cache:', err.message); }
}

function getDeviceTopics(loaiThietBi, nodeId, devConfig = null) {
  const prefix = nodeId ? `${TOPIC_PREFIX}/${nodeId}` : TOPIC_PREFIX;
  const custom = devConfig?.cau_hinh?.topic || devConfig?.topic;
  if (custom) return { ctrl: custom.startsWith(TOPIC_PREFIX) ? custom : `${prefix}/${custom}`, autoCtrl: `${prefix}/automode_${custom}`, suffix: custom };
  const suffix = REVERSE_HW_MAP[loaiThietBi] || loaiThietBi;
  return { ctrl: `${prefix}/${suffix}`, autoCtrl: `${prefix}/automode_${suffix}`, suffix };
}

function getDeviceFromTopic(topic) {
  const p = topic.split('/');
  if (p.length < 3 || p[p.length - 1] !== 'state') return null;

  let nodeId = null, raw = null, sub = null;
  if (p.length === 3) raw = p[1];
  else if (p.length === 4) { nodeId = p[1]; raw = p[2]; }
  else { nodeId = p[1]; raw = p[2]; sub = PROP_ALIAS[p[3]] || null; }

  if (!raw || EXCLUDES.has(raw) || p.includes('wifi')) return null;

  const isAuto = raw.startsWith('automode');
  const cleanDev = isAuto ? raw.replace(/^automode_?/, '') : raw;
  const loaiThietBi = HW_MAP[cleanDev] || cleanDev;
  const type = sub ? 'property' : isAuto ? 'auto' : 'status';
  return { loaiThietBi, rawDevice: raw, type, subProperty: sub, nodeId };
}

async function handleDeviceStateInput(deviceInfo, valueStr) {
  const { loaiThietBi, type, subProperty, nodeId } = deviceInfo;
  try {
    let q = supabaseService.supabase.from('thietbi').select('*').eq('loai_thietbi', loaiThietBi);
    if (nodeId) q = q.or(`idnode.eq.${nodeId},idnode.is.null`);
    const { data: devs } = await q;
    if (!devs?.length) return;
    const dev = (nodeId && devs.find(d => d.idnode === nodeId)) || devs.find(d => !d.idnode) || devs[0];

    if (type === 'status') {
      const status = STATUS_ON.has(valueStr) ? 1 : 0;
      updateLocalDeviceCache(dev.id_thietbi, status, dev.tu_dong, dev.cau_hinh);
      if (dev.trangthai !== status) {
        await supabaseService.updateThietBiStatus(dev.id_thietbi, status);
        await supabaseService.writeActionLog(dev.id_thietbi, `Phần cứng: ${status ? 'Bật' : 'Tắt'} ${dev.ten_hienthi || loaiThietBi}`, null, null, nodeId || dev.idnode, 'hardware_sync');
        logger.success(`📟 [Phần cứng ESP32] "${dev.ten_hienthi}" → ${status ? 'BẬT' : 'TẮT'}`);
      }
    } else if (type === 'property' && subProperty) {
      const val = subProperty === 'channel' ? valueStr : parseFloat(valueStr);
      if (val !== undefined && (typeof val === 'string' || !isNaN(val))) {
        const curCfg = dev.cau_hinh || {};
        if (curCfg[subProperty] !== val) {
          const cfg = { ...curCfg, [subProperty]: val };
          updateLocalDeviceCache(dev.id_thietbi, undefined, undefined, cfg);
          await supabaseService.supabase.from('thietbi').update({ cau_hinh: cfg, thoigian_capnhat: new Date().toISOString() }).eq('id_thietbi', dev.id_thietbi);
          logger.success(`📟 [Phần cứng ESP32] "${dev.ten_hienthi}" ${subProperty} = ${val}`);
        }
      }
    } else if (type === 'auto') {
      const autoVal = STATUS_ON.has(valueStr);
      updateLocalDeviceCache(dev.id_thietbi, undefined, autoVal, dev.cau_hinh);
      if (dev.tu_dong !== autoVal) {
        await supabaseService.supabase.from('thietbi').update({ tu_dong: autoVal }).eq('id_thietbi', dev.id_thietbi);
        const { data: rules } = await supabaseService.supabase.from('luat').update({ automation: autoVal }).eq('id_thietbi', dev.id_thietbi).select();
        for (const r of rules || []) localRuleStateCache.set(r.idluat, { automation: autoVal, nguong: r.nguong });
        logger.success(`[Phần cứng ESP32] "${dev.ten_hienthi}" Chế độ Auto → ${autoVal ? 'BẬT' : 'TẮT'}`);
      }
      if (autoVal) {
        const target = nodeId || dev.idnode;
        const tel = target ? getNodeTelemetry(target) : null;
        if (tel && (tel.temp != null || tel.hum != null || tel.lux != null)) {
          await automationService.evaluateRules({ nhiet_do: tel.temp, do_am: tel.hum, anh_sang: tel.lux, idnode: target });
        }
      }
    }
  } catch (err) { logger.error(`[Đồng bộ ESP32] Lỗi:`, err.message); }
}

function setupRealtimeListeners(mqttPublish) {
  supabaseService.subscribeToDeviceChanges((dev, oldDev) => {
    try {
      const cached = localDeviceStateCache.get(dev.id_thietbi);
      const statusChanged = dev.trangthai !== undefined && cached?.trangthai !== undefined ? cached.trangthai !== dev.trangthai : (oldDev?.trangthai !== dev.trangthai);
      const tuDongChanged = dev.tu_dong !== undefined && cached?.tu_dong !== undefined ? cached.tu_dong !== dev.tu_dong : (oldDev?.tu_dong !== dev.tu_dong);

      const propDiffs = {};
      for (const p of TRACKED_PROPS) {
        const nVal = dev.cau_hinh?.[p] !== undefined ? (p === 'channel' ? String(dev.cau_hinh[p]) : Number(dev.cau_hinh[p])) : undefined;
        const oVal = cached?.[p] !== undefined ? cached[p] : (oldDev?.cau_hinh?.[p] !== undefined ? (p === 'channel' ? String(oldDev.cau_hinh[p]) : Number(oldDev.cau_hinh[p])) : undefined);
        if (nVal !== undefined && oVal !== undefined && nVal !== oVal) propDiffs[p] = nVal;
      }

      updateLocalDeviceCache(dev.id_thietbi, dev.trangthai, dev.tu_dong, dev.cau_hinh);
      const hasPropChange = Object.keys(propDiffs).length > 0;
      if (!statusChanged && !tuDongChanged && !hasPropChange) return;

      const topics = getDeviceTopics(dev.loai_thietbi, dev.idnode, dev);
      const prefix = dev.idnode ? `${TOPIC_PREFIX}/${dev.idnode}` : TOPIC_PREFIX;
      const suffix = topics.suffix || dev.loai_thietbi;

      if (statusChanged) {
        const payload = dev.trangthai === 1 ? 'ON' : 'OFF';
        if (topics.ctrl) mqttPublish(topics.ctrl, payload, { qos: 1 });
        logger.info(`🌐 [Web/App] "${dev.ten_hienthi}" → ${payload}`);
      }
      for (const [p, val] of Object.entries(propDiffs)) {
        mqttPublish(`${prefix}/${suffix}/${PROP_TOPIC[p]}`, String(val), { qos: 1 });
        logger.info(`🌐 [Web/App] "${dev.ten_hienthi}" ${p} → ${val}`);
      }
      if (tuDongChanged) {
        const payload = dev.tu_dong ? 'ON' : 'OFF';
        if (topics.autoCtrl) mqttPublish(topics.autoCtrl, payload, { retain: true, qos: 1 });
        logger.info(`🌐 [Web/App] "${dev.ten_hienthi}" Auto → ${payload}`);
      }
    } catch (err) { logger.error('[Realtime DB] Lỗi device change:', err.message); }
  });

  supabaseService.subscribeToRuleChanges(async (rule, oldRule) => {
    try {
      const cached = localRuleStateCache.get(rule.idluat);
      const autoChanged = cached?.automation !== undefined ? cached.automation !== rule.automation : (oldRule ? rule.automation !== oldRule.automation : true);
      const nguongChanged = cached?.nguong !== undefined ? cached.nguong !== rule.nguong : (!oldRule || rule.nguong !== oldRule.nguong);
      if (!autoChanged && !nguongChanged) return;

      localRuleStateCache.set(rule.idluat, { automation: rule.automation, nguong: rule.nguong });
      logger.info(`⚙️ [Luật tự động] ID=${rule.idluat} (Auto: ${rule.automation ? 'BẬT' : 'TẮT'})`);

      const { data: tb } = await supabaseService.supabase.from('thietbi').select('loai_thietbi, idnode, cau_hinh').eq('id_thietbi', rule.id_thietbi).maybeSingle();
      if (!tb) return;

      if (autoChanged) {
        const allRules = await supabaseService.getAllRules();
        const isAuto = allRules.filter(r => r.id_thietbi === rule.id_thietbi).some(r => r.idluat === rule.idluat ? rule.automation : r.automation);
        if (localDeviceStateCache.get(rule.id_thietbi)?.tu_dong !== isAuto) {
          updateLocalDeviceCache(rule.id_thietbi, undefined, isAuto);
          const topics = getDeviceTopics(tb.loai_thietbi, tb.idnode, tb);
          if (topics.autoCtrl) mqttPublish(topics.autoCtrl, isAuto ? 'ON' : 'OFF', { qos: 1 });
        }
      }
      if (nguongChanged) {
        const top = THRESHOLD_TOPICS[(rule.ten_thong_so || '').toLowerCase()];
        if (top) mqttPublish(top, String(rule.nguong), { retain: true, qos: 1 });
        await supabaseService.supabase.from('thietbi').update({ cau_hinh: { ...(tb.cau_hinh || {}), threshold: Number(rule.nguong) } }).eq('id_thietbi', rule.id_thietbi);
      }
      if (tb.idnode) {
        const tel = getNodeTelemetry(tb.idnode);
        if (tel && (tel.temp != null || tel.hum != null || tel.lux != null)) {
          await automationService.evaluateRules({ nhiet_do: tel.temp, do_am: tel.hum, anh_sang: tel.lux, idnode: tb.idnode });
        }
      }
    } catch (err) { logger.error('[Realtime DB] Lỗi rule change:', err.message); }
  });
}

module.exports = { handleDeviceStateInput, getDeviceTopics, getDeviceFromTopic, updateLocalDeviceCache, localDeviceStateCache, setupRealtimeListeners, initializeCache };
