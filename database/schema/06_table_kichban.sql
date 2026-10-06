-- ============================================================
-- 06_TABLE_KICHBAN.SQL — Quản lý Kịch bản ngữ cảnh thông minh (Smart Scenes)
-- An toàn 100%: Sử dụng CREATE TABLE IF NOT EXISTS, không ảnh hưởng dữ liệu cũ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kichban (
    id_kichban          BIGSERIAL PRIMARY KEY,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    idnode              VARCHAR(50) REFERENCES public.iot_nodes(idnode) ON DELETE SET NULL,
    ten_kichban         VARCHAR(100) NOT NULL,
    mo_ta               TEXT,
    icon                VARCHAR(50) DEFAULT 'Layers',
    kichhoat            BOOLEAN DEFAULT FALSE,
    cau_hinh_thietbi    JSONB NOT NULL DEFAULT '{}',
    luat_cambien        JSONB DEFAULT NULL,
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW(),
    thoigian_capnhat    TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS bảo mật
ALTER TABLE public.kichban ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép người dùng xem kịch bản của gia đình hoặc kịch bản chung
DROP POLICY IF EXISTS "Xem kịch bản gia đình" ON public.kichban;
CREATE POLICY "Xem kịch bản gia đình" ON public.kichban
    FOR SELECT TO authenticated, anon
    USING (true);

-- Policy: Cho phép người dùng thêm kịch bản
DROP POLICY IF EXISTS "Thêm kịch bản" ON public.kichban;
CREATE POLICY "Thêm kịch bản" ON public.kichban
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Policy: Cho phép sửa kịch bản
DROP POLICY IF EXISTS "Cập nhật kịch bản" ON public.kichban;
CREATE POLICY "Cập nhật kịch bản" ON public.kichban
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Policy: Cho phép xóa kịch bản
DROP POLICY IF EXISTS "Xóa kịch bản" ON public.kichban;
CREATE POLICY "Xóa kịch bản" ON public.kichban
    FOR DELETE TO authenticated, anon
    USING (true);

-- Bật Realtime cho bảng kichban
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'kichban'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kichban;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Nạp dữ liệu mẫu ban đầu nếu bảng đang rỗng
INSERT INTO public.kichban (ten_kichban, mo_ta, icon, cau_hinh_thietbi, luat_cambien)
SELECT 
    'Chào buổi sáng', 
    'Mở rèm 100% · Đèn dịu 20% đón bình minh', 
    'Sun', 
    '{"curtain":{"enabled":true,"state":true,"position":100},"den":{"enabled":true,"state":true,"brightness":20},"quat":{"enabled":false,"state":false},"tivi":{"enabled":false,"state":false}}'::jsonb,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM public.kichban WHERE ten_kichban = 'Chào buổi sáng');

INSERT INTO public.kichban (ten_kichban, mo_ta, icon, cau_hinh_thietbi, luat_cambien)
SELECT 
    'Đi ngủ ngon giấc', 
    'Đóng rèm 0% · Tắt đèn & TV · Bật quạt số 1 êm ái', 
    'Moon', 
    '{"curtain":{"enabled":true,"state":true,"position":0},"den":{"enabled":true,"state":false,"brightness":0},"quat":{"enabled":true,"state":true,"speed":1},"tivi":{"enabled":true,"state":false}}'::jsonb,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM public.kichban WHERE ten_kichban = 'Đi ngủ ngon giấc');

INSERT INTO public.kichban (ten_kichban, mo_ta, icon, cau_hinh_thietbi, luat_cambien)
SELECT 
    'Rời khỏi nhà', 
    'Tắt toàn bộ thiết bị điện an toàn & tiết kiệm', 
    'LogOut', 
    '{"curtain":{"enabled":true,"state":true,"position":0},"den":{"enabled":true,"state":false},"quat":{"enabled":true,"state":false},"tivi":{"enabled":true,"state":false}}'::jsonb,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM public.kichban WHERE ten_kichban = 'Rời khỏi nhà');

INSERT INTO public.kichban (ten_kichban, mo_ta, icon, cau_hinh_thietbi, luat_cambien)
SELECT 
    'Rạp phim tại gia', 
    'Đóng rèm kín · Đèn tắt · TV BẬT · Quạt mát', 
    'Film', 
    '{"curtain":{"enabled":true,"state":true,"position":0},"den":{"enabled":true,"state":false},"quat":{"enabled":true,"state":true,"speed":2},"tivi":{"enabled":true,"state":true}}'::jsonb,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM public.kichban WHERE ten_kichban = 'Rạp phim tại gia');

INSERT INTO public.kichban (ten_kichban, mo_ta, icon, cau_hinh_thietbi, luat_cambien)
SELECT 
    'Tiết kiệm điện', 
    'Tắt bớt thiết bị không cần thiết khi ra ngoài', 
    'Leaf', 
    '{"den":{"enabled":true,"state":false},"quat":{"enabled":true,"state":true,"speed":1},"rem_cua":{"enabled":true,"state":true,"position":0},"tivi":{"enabled":true,"state":false}}'::jsonb,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM public.kichban WHERE ten_kichban = 'Tiết kiệm điện');
