-- ============================================================
-- 07_VOICE_COMMAND_HISTORY.SQL — Quản lý Lịch Sử Giọng Nói AI
-- Ghi nhận lịch sử câu lệnh, độ trễ và trạng thái điều khiển
-- Đã lược bỏ bảng voice_profiles (xác thực sinh trắc học) để tối ưu
-- ============================================================

-- 1. Bảng Lịch Sử Ra Lệnh Bằng Giọng Nói (Voice Command History)
CREATE TABLE IF NOT EXISTS public.voice_command_history (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          TEXT,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    user_name           VARCHAR(100) DEFAULT 'Người dùng',
    role                VARCHAR(50) DEFAULT 'Chủ nhà',
    transcript          TEXT NOT NULL,                      -- Câu nói chuyển thành văn bản (STT)
    device              VARCHAR(50),                        -- Thiết bị (den, quat, rem_cua, tivi...)
    action              VARCHAR(50),                        -- Lệnh (ON, OFF, OPEN, CLOSE...)
    parameters          JSONB DEFAULT '{}',
    verified            BOOLEAN DEFAULT TRUE,
    status              VARCHAR(30) DEFAULT 'success',
    mqtt_published      BOOLEAN DEFAULT TRUE,
    latency_ms          NUMERIC(10,2),                      -- Thời gian xử lý AI (mili-giây)
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo chỉ mục tối ưu tốc độ tra cứu
CREATE INDEX IF NOT EXISTS idx_voice_history_created ON public.voice_command_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_history_user ON public.voice_command_history(idnguoidung);

-- 3. Bật bảo mật hàng RLS (Row Level Security)
ALTER TABLE public.voice_command_history ENABLE ROW LEVEL SECURITY;

-- 4. Policies cho bảng voice_command_history
DROP POLICY IF EXISTS "Xem lịch sử câu lệnh giọng nói" ON public.voice_command_history;
CREATE POLICY "Xem lịch sử câu lệnh giọng nói" ON public.voice_command_history
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Ghi lịch sử câu lệnh giọng nói" ON public.voice_command_history;
CREATE POLICY "Ghi lịch sử câu lệnh giọng nói" ON public.voice_command_history
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Xóa lịch sử câu lệnh giọng nói" ON public.voice_command_history;
CREATE POLICY "Xóa lịch sử câu lệnh giọng nói" ON public.voice_command_history
    FOR DELETE TO authenticated, anon
    USING (true);

-- 5. Kích hoạt Realtime để Frontend nhận thông báo khi có người ra lệnh bằng giọng nói
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_command_history;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
