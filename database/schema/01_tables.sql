-- ============================================================
-- 01_TABLES.SQL — Cấu Trúc Bảng Cốt Lõi (IoT-Agnostic)
-- Định nghĩa 11 bảng chuẩn 3NF cho Smart Home IoT
-- Phiên bản 2.0 — Tinh gọn, trung lập phần cứng, mở rộng tốt
-- ============================================================

-- 1. Bảng Người Dùng (liên kết với Supabase Auth)
CREATE TABLE IF NOT EXISTS public.nguoidung (
    idnguoidung BIGSERIAL PRIMARY KEY,
    auth_uid    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    hoten       VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    anhdaidien  TEXT,
    ngaysinh    DATE,
    sodienthoai VARCHAR(20),
    vaitro      VARCHAR(20) DEFAULT 'buyer',    -- 'buyer' | 'admin'
    trang_thai  VARCHAR(20) DEFAULT 'active',   -- 'active' | 'suspended'
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Gia Đình (Household)
CREATE TABLE IF NOT EXISTS public.hogiadinh (
    id_hogiadinh    BIGSERIAL PRIMARY KEY,
    ten_nha         VARCHAR(100) NOT NULL DEFAULT 'Nhà của tôi',
    dia_chi         TEXT,
    id_chuho        BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    thoigian_tao    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Thành Viên Gia Đình
CREATE TABLE IF NOT EXISTS public.thanhvien_hogiadinh (
    id_thanhvien        BIGSERIAL PRIMARY KEY,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE CASCADE NOT NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE NOT NULL,
    vaitro              VARCHAR(20) DEFAULT 'member' NOT NULL,       -- 'owner' | 'member'
    quyen_dieu_khien    VARCHAR(20) DEFAULT 'full_control' NOT NULL, -- 'full_control' | 'view_only'
    thoigian_thamgia    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_hogiadinh, idnguoidung)
);

-- 4. Bảng Node Phần Cứng IoT (trung lập phần cứng, không gắn cứng vào ESP32)
--    idnode là mã logic do người dùng/hệ thống đặt (ví dụ: NODE-LIVINGROOM-01)
--    Khi thay bo mạch mới, chỉ cần cập nhật loai_board và dia_chi_mac, idnode không đổi
CREATE TABLE IF NOT EXISTS public.iot_nodes (
    idnode              VARCHAR(50) PRIMARY KEY,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE SET NULL,
    ten_phong           VARCHAR(100) NOT NULL,
    loai_phong          VARCHAR(30) DEFAULT 'phong_khac', -- 'phong_ngu'|'phong_khach'|'nha_bep'|'phong_tam'|'ban_cong'|'phong_khac'
    trang_thai          VARCHAR(20) DEFAULT 'offline',   -- 'online' | 'offline'
    last_heartbeat      TIMESTAMPTZ DEFAULT NOW(),
    rssi                INT DEFAULT -50
);

-- 5. Bảng Mã Mời Gia Đình
CREATE TABLE IF NOT EXISTS public.ma_moi (
    id_ma               BIGSERIAL PRIMARY KEY,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE CASCADE NOT NULL,
    ma_moi              UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    quyen_dieu_khien    VARCHAR(20) DEFAULT 'full_control' NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    is_used             BOOLEAN DEFAULT FALSE,
    used_by             BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    thoigian_su_dung    TIMESTAMPTZ,
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng Thiết Bị
CREATE TABLE IF NOT EXISTS public.thietbi (
    id_thietbi          BIGSERIAL PRIMARY KEY,
    idnode              VARCHAR(50) REFERENCES public.iot_nodes(idnode) ON DELETE CASCADE NOT NULL,
    loai_thietbi        VARCHAR(30) NOT NULL, -- 'den'|'quat'|'dieu_hoa'|'cam_bien_gas'|...
    ten_hienthi         VARCHAR(100),
    dia_chi_hw          VARCHAR(50),
    trangthai           INT DEFAULT 0,        -- 0=Tắt, 1=Bật
    tu_dong             BOOLEAN DEFAULT TRUE,
    cau_hinh            JSONB DEFAULT '{}',
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW(),
    thoigian_capnhat    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng Luật Tự Động (Automation Rules)
--    ten_thong_so khớp 1-1 với dulieucambien.ten_thong_so để tra cứu ngưỡng kích hoạt
CREATE TABLE IF NOT EXISTS public.luat (
    idluat          BIGSERIAL PRIMARY KEY,
    id_thietbi      BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE CASCADE,
    ten_thong_so    VARCHAR(50) NOT NULL,  -- 'nhiet_do' | 'do_am' | 'anh_sang' | 'gas_ppm' | bất kỳ thông số mới
    toantu          VARCHAR(10) NOT NULL,  -- '>' | '<' | '='
    nguong          NUMERIC(6,2) NOT NULL,
    hanhdong        INT DEFAULT 1,         -- 1=Bật, 0=Tắt thiết bị khi thỏa mãn điều kiện
    automation      BOOLEAN DEFAULT TRUE
);

-- 8. Bảng Dữ Liệu Cảm Biến — Metric Log (EAV Time-Series)
--    Mỗi lần đo = 1 dòng, lưu tên thông số + giá trị
--    Không cần ALTER TABLE khi thêm loại cảm biến mới
--    Ví dụ 1 lần đo DHT11: 2 dòng (nhiet_do + do_am)
--    Ví dụ 1 lần đo BH1750: 1 dòng (anh_sang)
CREATE TABLE IF NOT EXISTS public.dulieucambien (
    iddl            BIGSERIAL PRIMARY KEY,
    idnode          VARCHAR(50) REFERENCES public.iot_nodes(idnode) ON DELETE CASCADE NOT NULL,
    ten_cambien     VARCHAR(50) NOT NULL,   -- Model/tên cảm biến vật lý: 'DHT11', 'BH1750', 'MQ-2', 'DS18B20', 'BMP280'
    ten_thong_so    VARCHAR(50) NOT NULL,   -- Tên thông số chuẩn: 'nhiet_do', 'do_am', 'anh_sang', 'gas_ppm', 'co2', 'ap_suat'
    gia_tri         NUMERIC(10,2) NOT NULL, -- Giá trị đo được
    don_vi          VARCHAR(20),            -- Đơn vị: '°C', '%', 'lux', 'ppm', 'µg/m³', 'hPa'
    thoigian        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bảng Nhật Ký Hoạt Động & Thông Báo (gộp audit_log vào đây)
CREATE TABLE IF NOT EXISTS public.nhatkyhoatdong (
    idnhatky            BIGSERIAL PRIMARY KEY,
    idcambien           BIGINT REFERENCES public.dulieucambien(iddl) ON DELETE SET NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ten_nguoi_thaotac   VARCHAR(100),
    idnode              VARCHAR(50) REFERENCES public.iot_nodes(idnode) ON DELETE SET NULL,
    id_thietbi          BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE SET NULL,
    hanhdong            TEXT NOT NULL,
    loai_thongbao       VARCHAR(30) DEFAULT 'user_action', -- 'user_action'|'system_alert'|'admin_notification'|'user_to_admin'
    chi_tiet            TEXT,               -- Chi tiết bổ sung (gộp từ audit_log)
    ip_address          VARCHAR(45),        -- Địa chỉ IP người thao tác (gộp từ audit_log)
    thoigian            TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bảng Lịch Hẹn Giờ
CREATE TABLE IF NOT EXISTS public.lichhengio (
    idid         BIGSERIAL PRIMARY KEY,
    id_thietbi   BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE CASCADE,
    hanhdong     VARCHAR(10) NOT NULL,  -- 'on' | 'off'
    thoigian     TIME NOT NULL,
    thu          INT[] NOT NULL,        -- 0=CN..6=T7
    kichhoat     BOOLEAN DEFAULT TRUE,
    thoigian_tao TIMESTAMPTZ DEFAULT NOW()
);
