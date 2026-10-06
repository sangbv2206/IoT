'use strict';

const logger = require('../utils/logger');
const supabaseService = require('./supabaseService');
const mqttService = require('./mqttService');
const { getDeviceTopics, updateLocalDeviceCache } = require('./deviceSyncService');
const { TOPIC_PREFIX } = require('../config/config');

const CHECK_INTERVAL_MS = parseInt(process.env.SCHEDULE_CHECK_INTERVAL_MS || '15000', 10);
let lastCheckedMinute = '';

function getVietnamNow() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(now);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { time, day: dayMap[weekday] ?? now.getDay() };
}

const scheduleService = {
  
  start() {
    logger.info('[Hẹn giờ] Bắt đầu khởi chạy dịch vụ lịch hẹn giờ');

    setInterval(async () => {
      try {
        const { time, day } = getVietnamNow();
        if (time === lastCheckedMinute) return;
        lastCheckedMinute = time;

        const { data: schedules } = await supabaseService.supabase
          .from('lichhengio')
          .select('*, thietbi(*)')
          .eq('kichhoat', true);

        for (const s of schedules || []) {
          const sTime = String(s.thoigian || '').substring(0, 5);
          if (sTime !== time || !(s.thu || []).includes(day) || !s.id_thietbi) continue;

          const target = s.hanhdong === 'on' ? 1 : 0;
          const tb = s.thietbi, devId = s.id_thietbi;
          const devName = tb?.ten_hienthi || tb?.loai_thietbi || 'Thiết bị';
          const targetNode = tb?.idnode || s.idnode;
          const prefix = targetNode ? `${TOPIC_PREFIX}/${targetNode}` : TOPIC_PREFIX;

          logger.info(`[Hẹn giờ] Kích hoạt ID=${s.idid}: ${target ? 'BẬT' : 'TẮT'} "${devName}" (${time})`);

          // 1. Cập nhật Cache & DB (tự động chuyển sang thủ công khi hẹn giờ chạy)
          const props = tb?.loai_thietbi === 'rem_cua' ? { position: target ? 100 : 0 } : (tb?.cau_hinh || {});
          updateLocalDeviceCache(devId, target, false, props);
          await supabaseService.supabase.from('thietbi')
            .update({
              trangthai: target,
              tu_dong: false,
              cau_hinh: { ...(tb?.cau_hinh || {}), ...props },
              thoigian_capnhat: new Date().toISOString()
            })
            .eq('id_thietbi', devId);

          // 2. Gửi lệnh MQTT tới ESP32
          const topics = getDeviceTopics(tb?.loai_thietbi, targetNode, tb);
          if (topics?.ctrl) {
            const payload = target === 1 ? 'ON' : 'OFF';
            await mqttService.publish(topics.ctrl, payload, { qos: 1 });

            // Bổ sung đồng bộ vị trí % cho rèm cửa
            if (tb?.loai_thietbi === 'rem_cua') {
              const pos = target === 1 ? 100 : 0;
              await mqttService.publish(`${prefix}/rem_cua/pos`, String(pos), { qos: 1 });
            }
          }

          // 3. Ghi nhật ký hoạt động
          await supabaseService.writeActionLog(
            devId,
            `Hẹn giờ: ${target ? 'Bật' : 'Tắt'} ${devName} (${s.thoigian})`,
            null, null, targetNode || null, 'user_action'
          ).catch(() => {});
        }
      } catch (err) {
        logger.error('[Hẹn giờ] Lỗi kiểm tra lịch:', err.message);
      }
    }, CHECK_INTERVAL_MS);
  }
};

module.exports = scheduleService;
