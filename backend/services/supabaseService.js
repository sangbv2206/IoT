'use strict';
/**
 * supabaseService.js — Data Access Layer (DAL) & Realtime Hub cho IoT Backend.
 */
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('../config/config');
const logger = require('../utils/logger');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const knownNodes = new Set();
const deviceCache = new Map();
const nodeUserCache = new Map();
let deviceChannel = null, ruleChannel = null;

const supabaseService = {
  supabase,

  async ensureNodeExists(nodeId) {
    if (!nodeId || knownNodes.has(nodeId)) return;
    try {
      const { data: user } = await supabase.from('nguoidung').select('idnguoidung').limit(1).maybeSingle();
      await supabase.from('iot_nodes').upsert([{
        idnode: nodeId, ten_phong: `Phòng ${nodeId.slice(-5)}`, loai_phong: 'phong_khach',
        trang_thai: 'online', rssi: -50, last_heartbeat: new Date().toISOString(), idnguoidung: user?.idnguoidung || 1
      }], { onConflict: 'idnode', ignoreDuplicates: true });
      knownNodes.add(nodeId);
      if (user?.idnguoidung) nodeUserCache.set(nodeId, user.idnguoidung);
    } catch (e) { logger.warn(`[ensureNodeExists] ${nodeId}: ${e.message}`); }
  },

  async getNodeById(nodeId) {
    try {
      const res = await supabase.from('iot_nodes').select('*').eq('idnode', nodeId).maybeSingle();
      if (res.data) {
        knownNodes.add(res.data.idnode);
        if (res.data.idnguoidung) nodeUserCache.set(res.data.idnode, res.data.idnguoidung);
      }
      return res;
    } catch (err) { return { data: null, error: err }; }
  },

  async insertSensorData(temp, hum, lux, nodeId) {
    await this.ensureNodeExists(nodeId);
    const rows = [
      temp != null && { idnode: nodeId, ten_cambien: 'DHT11', ten_thong_so: 'nhiet_do', gia_tri: temp, don_vi: '°C' },
      hum != null && { idnode: nodeId, ten_cambien: 'DHT11', ten_thong_so: 'do_am', gia_tri: hum, don_vi: '%' },
      lux != null && { idnode: nodeId, ten_cambien: 'BH1750', ten_thong_so: 'anh_sang', gia_tri: lux, don_vi: 'lux' }
    ].filter(Boolean);
    if (!rows.length) return null;

    const { data, error } = await supabase.from('dulieucambien').insert(rows).select();
    if (error) { logger.error('Lỗi insertSensorData:', error.message); throw error; }
    return { iddl: data?.[0]?.iddl, idnode: nodeId, nhiet_do: temp, do_am: hum, anh_sang: lux };
  },

  getThietBiStatus: async (id) => (await supabase.from('thietbi').select('*').eq('id_thietbi', id).maybeSingle()).data,

  async updateThietBiStatus(idThietBi, statusVal) {
    const { data, error } = await supabase.from('thietbi')
      .update({ trangthai: Number(statusVal) ? 1 : 0, thoigian_capnhat: new Date().toISOString() })
      .eq('id_thietbi', idThietBi).select();
    if (error) throw error;
    return data?.[0];
  },

  getRuleByDevice: async (id) => (await supabase.from('luat').select('automation').eq('id_thietbi', id).limit(1)).data?.[0] || null,

  async updateRuleAutomation(idThietBi, autoVal) {
    const { data, error } = await supabase.from('luat').update({ automation: !!autoVal }).eq('id_thietbi', idThietBi).select();
    if (error) throw error;
    return data?.[0];
  },

  getAllRules: async () => (await supabase.from('luat').select('*, thietbi(*)')).data || [],
  isNodeBlocked: async () => false,

  async writeActionLog(idThietBi, actionText, idCambien = null, idNguoidung = null, idnode = null, loaiThongbao = 'user_action', chiTiet = null) {
    try {
      if (!idnode && idThietBi) {
        if (!deviceCache.has(idThietBi)) {
          const { data } = await supabase.from('thietbi').select('idnode').eq('id_thietbi', idThietBi).maybeSingle();
          if (data) deviceCache.set(idThietBi, { idnode: data.idnode });
        }
        idnode = deviceCache.get(idThietBi)?.idnode;
      }
      if (!idNguoidung && idnode) {
        if (!nodeUserCache.has(idnode)) {
          const { data } = await supabase.from('iot_nodes').select('idnguoidung').eq('idnode', idnode).maybeSingle();
          if (data?.idnguoidung) nodeUserCache.set(idnode, data.idnguoidung);
        }
        idNguoidung = nodeUserCache.get(idnode);
      }
      await supabase.from('nhatkyhoatdong').insert([{
        idcambien: idCambien, idnguoidung: idNguoidung, id_thietbi: idThietBi, idnode: idnode,
        hanhdong: actionText, loai_thongbao: loaiThongbao,
        chi_tiet: typeof chiTiet === 'object' && chiTiet !== null ? JSON.stringify(chiTiet) : chiTiet
      }]);
    } catch (err) { logger.error('Lỗi writeActionLog:', err.message); }
  },

  async updateNodeTelemetry(idnode, data = {}) {
    try {
      const payload = { rssi: data.rssi ?? -50, trang_thai: 'online', last_heartbeat: new Date().toISOString(), ...(data.ten_phong ? { ten_phong: data.ten_phong } : {}) };
      const { data: res } = await supabase.from('iot_nodes').update(payload).eq('idnode', idnode).select();
      if (res?.length) { knownNodes.add(idnode); return res[0]; }
      await this.ensureNodeExists(idnode);
    } catch (err) { logger.error(`Lỗi updateNodeTelemetry ${idnode}:`, err.message); }
  },

  async setNodeOffline(idnode) {
    try {
      const { data } = await supabase.from('iot_nodes').update({ trang_thai: 'offline' }).eq('idnode', idnode).select();
      return data?.[0];
    } catch (err) { logger.error(`Lỗi setNodeOffline ${idnode}:`, err.message); }
  },

  async insertTechnicalAlert(idnode, loai_loi, muc_do, chi_tiet) {
    try {
      const { data } = await supabase.from('nhatkyhoatdong').insert([{
        idnode, idnguoidung: nodeUserCache.get(idnode) || null,
        hanhdong: `[Cảnh báo kỹ thuật] ${loai_loi}: ${chi_tiet}`, loai_thongbao: 'technical_alert',
        chi_tiet: JSON.stringify({ muc_do, loai_loi, trang_thai: 'unresolved' })
      }]).select();
      return data?.[0];
    } catch (err) { logger.error(`Lỗi insertTechnicalAlert ${idnode}:`, err.message); }
  },

  async ensureRulesExist() {
    try {
      const { data: devs } = await supabase.from('thietbi').select('id_thietbi, loai_thietbi, tu_dong, cau_hinh');
      if (!devs?.length) return;
      const { data: existing } = await supabase.from('luat').select('id_thietbi, ten_thong_so');
      const set = new Set((existing || []).map(r => `${r.id_thietbi}:${r.ten_thong_so}`));
      const DEFS = {
        quat: { param: 'nhiet_do', op: '>=', thresh: 30.0 },
        den: { param: 'anh_sang', op: '<', thresh: 200.0 },
        rem_cua: { param: 'anh_sang', op: '>', thresh: 800.0 }
      };

      const toIns = devs.filter(d => DEFS[d.loai_thietbi] && !set.has(`${d.id_thietbi}:${DEFS[d.loai_thietbi].param}`))
        .map(d => {
          const cfg = DEFS[d.loai_thietbi];
          return { id_thietbi: d.id_thietbi, ten_thong_so: cfg.param, toantu: cfg.op, nguong: Number(d.cau_hinh?.threshold ?? cfg.thresh), automation: d.tu_dong !== false };
        });

      if (toIns.length) {
        const { error } = await supabase.from('luat').insert(toIns);
        if (!error) logger.success(`[ensureRulesExist] Đã tạo ${toIns.length} luật tự động.`);
      }
    } catch (err) { logger.error('Lỗi ensureRulesExist:', err.message); }
  },

  subscribeToDeviceChanges(cb) {
    if (deviceChannel) return deviceChannel;
    return (deviceChannel = supabase.channel('public:thietbi')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'thietbi' }, p => p?.new && cb(p.new, p.old))
      .subscribe(st => st === 'SUBSCRIBED' ? logger.success('Đã kết nối Realtime "thietbi"') : null));
  },

  subscribeToRuleChanges(cb) {
    if (ruleChannel) return ruleChannel;
    return (ruleChannel = supabase.channel('public:luat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'luat' }, p => p?.new && cb(p.new, p.old))
      .subscribe(st => st === 'SUBSCRIBED' ? logger.success('Đã kết nối Realtime "luat"') : null));
  }
};

module.exports = supabaseService;
