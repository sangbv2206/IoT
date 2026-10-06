'use strict';

const logger = require('../utils/logger');
const supabaseService = require('./supabaseService');
const mqttService = require('./mqttService');
const { TOPIC_PREFIX } = require('../config/config');

const DEV_MAP = { curtain: 'rem_cua', light: 'den', fan: 'quat', tv: 'tivi' };
const TOPIC_MAP = { quat: 'led2', den: 'led3', rem_cua: 'curtain', tivi: 'tv' };
const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '=': (a, b) => a === b, '==': (a, b) => a === b };

const activeScenePerNode = new Map();
const lastSensorSceneTime = new Map();
const COOLDOWN_MS = 60000;

function parseActions(configObj, isDeactivate = false) {
  return Object.entries(configObj || {})
    .filter(([, cfg]) => cfg && cfg.enabled !== false)
    .map(([rawDev, cfg]) => {
      const dev = DEV_MAP[rawDev] || rawDev;
      const isOn = !isDeactivate && (cfg.on !== undefined ? Boolean(cfg.on) : Boolean(cfg.state));
      const pos = isDeactivate ? 0 : (cfg.position !== undefined ? Number(cfg.position) : (isOn ? 100 : 0));
      return {
        device: dev,
        state: (dev === 'rem_cua' ? pos > 0 : isOn) ? 'ON' : 'OFF',
        brightness: isDeactivate ? 0 : (cfg.brightness !== undefined ? Number(cfg.brightness) : 80),
        speed: isDeactivate ? 1 : (cfg.speed !== undefined ? Number(cfg.speed) : 2),
        position: pos,
      };
    });
}

async function findScene(nodeId, sceneId, sceneName, customActions, isDeactivate) {
  if (customActions && typeof customActions === 'object') {
    const actions = parseActions(customActions, isDeactivate);
    if (actions.length) return { id: sceneId, name: sceneName || sceneId, actions };
  }
  try {
    let q = supabaseService.supabase.from('kichban').select('*');
    q = !isNaN(Number(sceneId)) ? q.eq('id_kichban', Number(sceneId)) : q.ilike('ten_kichban', `%${sceneName || sceneId}%`);
    if (nodeId) q = q.or(`idnode.eq.${nodeId},idnode.is.null`);
    const { data } = await q.limit(1);
    if (data?.[0]) return { id: data[0].id_kichban, name: data[0].ten_kichban, actions: parseActions(data[0].cau_hinh_thietbi, isDeactivate) };
  } catch (err) { logger.warn(`[SceneService] Lỗi DB: ${err.message}`); }
  return null;
}

async function dispatchDevice(prefix, act, nodeId) {
  const nodeTopic = `${prefix}/${TOPIC_MAP[act.device] || act.device}`;
  if (act.device === 'rem_cua') {
    await mqttService.publish(nodeTopic, act.position > 0 ? 'OPEN' : 'CLOSE', { qos: 1 });
    await mqttService.publish(`${prefix}/rem_cua/pos`, String(act.position), { qos: 1 });
  } else {
    await mqttService.publish(nodeTopic, act.state, { qos: 1 });
    if (act.state === 'ON') {
      if (act.device === 'quat') await mqttService.publish(`${prefix}/quat/speed`, String(act.speed), { qos: 1 });
      if (act.device === 'den') await mqttService.publish(`${prefix}/den/brightness`, String(act.brightness), { qos: 1 });
    }
  }

  try {
    const { updateLocalDeviceCache } = require('./deviceSyncService');
    let devQ = supabaseService.supabase.from('thietbi').select('id_thietbi, cau_hinh').eq('loai_thietbi', act.device);
    if (nodeId) devQ = devQ.eq('idnode', nodeId);
    const { data: matchedDevs } = await devQ;
    const num = act.state === 'ON' ? 1 : 0;
    const props = { brightness: act.brightness, speed: act.speed, position: act.position };

    for (const d of matchedDevs || []) {
      updateLocalDeviceCache(d.id_thietbi, num, false, props);
      await supabaseService.supabase.from('thietbi')
        .update({ trangthai: num, tu_dong: false, cau_hinh: { ...(d.cau_hinh || {}), ...props }, thoigian_capnhat: new Date().toISOString() })
        .eq('id_thietbi', d.id_thietbi);
    }
  } catch (err) { logger.warn(`[SceneService] Lỗi cập nhật DB: ${err.message}`); }
}

const sceneService = {
  getActiveScene: (nodeId) => activeScenePerNode.get(nodeId) || null,

  async activateScene(nodeId, sceneId, source = 'web', userId = null, isDeactivate = false, customActions = null, sceneName = null) {
    const scene = await findScene(nodeId, sceneId, sceneName, customActions, isDeactivate);
    if (!scene?.actions?.length) {
      logger.warn(`[SceneService] Kịch bản không tồn tại: "${sceneId}"`);
      return { success: false, message: `Kịch bản "${sceneId}" không hợp lệ` };
    }

    logger.info(`[SceneService] ${isDeactivate ? 'Tắt' : 'Kích hoạt'}: "${scene.name}" [Node: ${nodeId || 'all'}, Nguồn: ${source}]`);
    const prefix = nodeId ? `${TOPIC_PREFIX}/${nodeId}` : TOPIC_PREFIX;

    try {
      await Promise.all(scene.actions.map(act => dispatchDevice(prefix, act, nodeId)));
      if (isDeactivate) activeScenePerNode.delete(nodeId);
      else activeScenePerNode.set(nodeId, { sceneId, sceneName: scene.name, activatedAt: new Date().toISOString(), source });

      await supabaseService.supabase.from('nhatkyhoatdong').insert([{
        idnode: nodeId,
        idnguoidung: userId,
        hanhdong: `${isDeactivate ? 'Tắt' : 'Kích hoạt'} kịch bản "${scene.name}" (${source.toUpperCase()})`,
        loai_thongbao: 'user_action',
        chi_tiet: JSON.stringify({ scene_id: sceneId, is_deactivate: isDeactivate })
      }]).catch(() => {});

      return { success: true, sceneName: scene.name, isDeactivate };
    } catch (err) {
      logger.error('[SceneService] Lỗi thực thi:', err.message);
      return { success: false, error: err.message };
    }
  },

  async evaluateSensorScenes(sensorData) {
    if (!sensorData || typeof sensorData !== 'object') return;
    try {
      const now = Date.now();
      const { data: scenes } = await supabaseService.supabase.from('kichban').select('*').not('luat_cambien', 'is', null).eq('kichhoat', true);
      for (const s of scenes || []) {
        if (s.idnode && sensorData.idnode && s.idnode !== sensorData.idnode) continue;
        const rule = s.luat_cambien;
        if (!rule?.ten_thong_so || rule.nguong === undefined) continue;
        const val = sensorData[rule.ten_thong_so] ?? sensorData[rule.ten_thong_so.toLowerCase()];
        if (val === undefined || isNaN(Number(val))) continue;

        if (OPS[rule.toantu || '>']?.(Number(val), Number(rule.nguong)) && now - (lastSensorSceneTime.get(s.id_kichban) || 0) >= COOLDOWN_MS) {
          lastSensorSceneTime.set(s.id_kichban, now);
          logger.info(`[SceneService] Cảm biến kích hoạt "${s.ten_kichban}"`);
          await this.activateScene(s.idnode || sensorData.idnode, s.id_kichban, 'sensor');
        }
      }
    } catch (err) { logger.error('[SceneService] Lỗi sensor scene:', err.message); }
  }
};

module.exports = sceneService;
