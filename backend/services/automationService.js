'use strict';

const supabaseService = require('./supabaseService');
const mqttService = require('./mqttService');
const { SETTINGS, TOPIC_PREFIX } = require('../config/config');
const logger = require('../utils/logger');

const lastStateChange = new Map();
const lastAlertLog = new Map();
const ALERT_COOLDOWN = 10 * 60 * 1000;
const OPS = {
  '>': (a, b) => a > b, '>=': (a, b) => a >= b,
  '<': (a, b) => a < b, '<=': (a, b) => a <= b, '=': (a, b) => a === b,
};

const automationService = {
  /**
   * Đánh giá và thực thi luật tự động hóa từ dữ liệu cảm biến
   */
  async evaluateRules(sensorData) {
    if (!sensorData || typeof sensorData !== 'object') return;

    try {
      const { getDeviceTopics, updateLocalDeviceCache } = require('./deviceSyncService');
      const rules = await supabaseService.getAllRules();
      if (!rules?.length) return;

      // 1. Nhóm luật theo thiết bị (chỉ nhận thiết bị đang bật tu_dong === true)
      const devMap = new Map();
      const sNode = sensorData.idnode || sensorData.cambien_idnode;

      for (const r of rules) {
        if (!r.automation || !r.id_thietbi || r.thietbi?.tu_dong !== true) continue;
        if (sNode && r.thietbi.idnode && sNode !== r.thietbi.idnode) continue;
        if (!devMap.has(r.id_thietbi)) devMap.set(r.id_thietbi, { dev: r.thietbi, rules: [] });
        devMap.get(r.id_thietbi).rules.push(r);
      }

      const now = Date.now();

      // 2. Đánh giá từng thiết bị
      for (const [devId, { dev, rules: dRules }] of devMap) {
        let target = null, triggerRule = null, triggerVal = null;

        for (const r of dRules) {
          const k = (r.ten_thong_so || '').trim();
          const val = sensorData[k] ?? sensorData[k.toLowerCase()] ?? sensorData[k.toLowerCase().replace(/_/g, '')];
          if (val === null || val === undefined || isNaN(Number(val))) continue;

          const num = Number(val);
          if (OPS[r.toantu]?.(num, Number(r.nguong))) {
            target = r.hanhdong !== undefined && r.hanhdong !== null ? Number(r.hanhdong) : 1;
            triggerRule = r;
            triggerVal = num;
            break;
          }
        }

        // Không thỏa mãn hoặc trạng thái đã trùng khớp: bỏ qua
        if (target === null || dev.trangthai === target) continue;

        // Chống dao động relay bật/tắt liên tục
        if (now - (lastStateChange.get(devId) || 0) < SETTINGS.AUTOMATION_COOLDOWN_MS) continue;

        lastStateChange.set(devId, now);
        updateLocalDeviceCache(dev.id_thietbi, target, dev.tu_dong);
        await supabaseService.updateThietBiStatus(dev.id_thietbi, target);

        // 3. Gửi lệnh điều khiển MQTT tới Node
        const targetNode = dev.idnode || sNode;
        const topics = getDeviceTopics(dev.loai_thietbi, targetNode, dev);

        if (topics?.ctrl) {
          const pStr = target === 1 ? 'ON' : 'OFF';
          mqttService.publish(topics.ctrl, pStr, { qos: 1 });
          logger.info(`[Tự động] "${dev.ten_hienthi}" → ${pStr} (${triggerRule.ten_thong_so}: ${triggerVal} ${triggerRule.toantu} ${triggerRule.nguong})`);

          // Đồng bộ thuộc tính cấu hình mở rộng (brightness, speed, pos)
          if (target === 1 && dev.cau_hinh && typeof dev.cau_hinh === 'object') {
            const prefix = targetNode ? `${TOPIC_PREFIX}/${targetNode}` : TOPIC_PREFIX;
            const suffix = topics.suffix || dev.loai_thietbi;
            for (const [p, s] of Object.entries({ brightness: 'brightness', speed: 'speed', position: 'pos' })) {
              if (dev.cau_hinh[p] != null) {
                mqttService.publish(`${prefix}/${suffix}/${s}`, String(dev.cau_hinh[p]), { qos: 1 });
              }
            }
          }
        }

        // 4. Ghi nhật ký hoạt động có cooldown
        const logKey = triggerRule.idluat;
        if (now - (lastAlertLog.get(logKey) || 0) >= ALERT_COOLDOWN) {
          lastAlertLog.set(logKey, now);
          await supabaseService.writeActionLog(
            dev.id_thietbi,
            `Tự động ${target === 1 ? 'Bật' : 'Tắt'} ${dev.ten_hienthi} (${triggerRule.ten_thong_so}: ${triggerVal} ${triggerRule.toantu} ${triggerRule.nguong})`,
            sensorData.iddl || null, null, targetNode, 'user_action'
          ).catch(() => {});
        }
      }
    } catch (err) {
      logger.error('[Tự động] Lỗi xử lý quy tắc:', err.message);
    }
  }
};

module.exports = automationService;
