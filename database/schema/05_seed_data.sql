-- ============================================================
-- 05_SEED_DATA.SQL — Dữ Liệu Khởi Tạo Mẫu
-- Dữ liệu thiết lập cho Node Phòng khách & 4 Thiết bị chuẩn
-- ============================================================

-- 1. Node cấu hình hệ thống (reserved)
INSERT INTO public.iot_nodes (idnode, ten_node, ten_phong, trang_thai, rssi, cpu_temp, flash_used, ota_status, loai_board) VALUES
('SYSTEM_CONFIG', 'System Configuration', 'System', 'online', -80, 65, 60, 'idle', 'ESP32-S3')
ON CONFLICT (idnode) DO NOTHING;

-- 2. Node IoT Phòng Khách (ESP32-S3)
INSERT INTO public.iot_nodes (idnode, ten_node, loai_board, loai_node, ten_phong, loai_phong, firmware_version, trang_thai, last_heartbeat, uptime_percent, rssi, flash_used, cpu_temp, mo_ta, trang_thai_duyet) VALUES
('NODE-LIVINGROOM-01', 'Node Phòng Khách', 'ESP32-S3', 'sensor_actuator', 'Phòng khách', 'phong_khach', '2.0.0', 'online', NOW(), 99.8, -58, 31.6, 38.2, 'ESP32-S3 Smart Living Room', 'approved')
ON CONFLICT (idnode) DO NOTHING;

-- 3. Household mặc định
INSERT INTO public.hogiadinh (id_hogiadinh, ten_nha, dia_chi) VALUES
(1, 'Nhà Mặc Định', 'Hà Nội, Việt Nam') ON CONFLICT (id_hogiadinh) DO NOTHING;

UPDATE public.iot_nodes SET id_hogiadinh = 1
WHERE idnode IN ('NODE-LIVINGROOM-01');

-- 4. 4 THIẾT BỊ ĐIỀU KHIỂN CHUẨN (Đèn, Quạt, Rèm cửa, Smart TV)
INSERT INTO public.thietbi (id_thietbi, idnode, loai_thietbi, ten_hienthi, dia_chi_hw, trangthai, tu_dong, cau_hinh) VALUES
(1, 'NODE-LIVINGROOM-01', 'den',      'Đèn phòng khách',     'GPIO-4', 0, true,  '{"wattage":40}'),
(2, 'NODE-LIVINGROOM-01', 'quat',     'Quạt phòng khách',    'GPIO-6', 0, true,  '{"wattage":65}'),
(3, 'NODE-LIVINGROOM-01', 'rem_cua',  'Rèm cửa thông minh',  'GPIO-7', 0, true,  '{"wattage":15}'),
(4, 'NODE-LIVINGROOM-01', 'tivi',     'Smart Tivi',          'GPIO-5', 0, false, '{"wattage":120}')
ON CONFLICT (id_thietbi) DO NOTHING;

SELECT setval('public.thietbi_id_thietbi_seq', (SELECT MAX(id_thietbi) FROM public.thietbi));

-- 5. Automation Rules mặc định cho 4 thiết bị & cảm biến DHT11/BH1750
INSERT INTO public.luat (idluat, id_thietbi, ten_thong_so, toantu, nguong, hanhdong, automation) VALUES
(1, 2, 'nhiet_do', '>', 31.0,  1, true),   -- Nhiệt độ > 31°C → Bật quạt
(2, 2, 'do_am',    '>', 75.0,  1, true),   -- Độ ẩm > 75% → Bật quạt
(3, 1, 'anh_sang', '<', 40.0,  1, true),   -- Ánh sáng < 40 lux → Bật đèn
(4, 3, 'anh_sang', '>', 350.0, 1, true)    -- Ánh sáng > 350 lux → Mở rèm
ON CONFLICT (idluat) DO NOTHING;

SELECT setval('public.luat_idluat_seq', (SELECT MAX(idluat) FROM public.luat));

-- 6. Lịch hẹn giờ mẫu
INSERT INTO public.lichhengio (idid, id_thietbi, hanhdong, thoigian, thu, kichhoat) VALUES
(1, 1, 'on',  '18:30:00', ARRAY[1,2,3,4,5], true),     -- Bật đèn lúc 18:30 từ T2-T6
(2, 3, 'off', '22:30:00', ARRAY[0,1,2,3,4,5,6], true), -- Đóng rèm lúc 22:30 hàng ngày
(3, 4, 'off', '23:00:00', ARRAY[0,1,2,3,4,5,6], true)  -- Tắt TV lúc 23:00 hàng ngày
ON CONFLICT (idid) DO NOTHING;

SELECT setval('public.lichhengio_idid_seq', (SELECT MAX(idid) FROM public.lichhengio));
