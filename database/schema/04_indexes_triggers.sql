-- ============================================================
-- 04_INDEXES_TRIGGERS.SQL — Performance Indexes & Triggers
-- Tối ưu chỉ mục và cấu hình Supabase Realtime Publication
-- Phiên bản 2.0 — Cập nhật theo iot_nodes & metric log sensor
-- ============================================================

-- 1. PERFORMANCE INDEXES

-- dulieucambien: index tổng hợp tối ưu cho truy vấn time-series theo node + thông số
CREATE INDEX IF NOT EXISTS idx_dulieucambien_query       ON public.dulieucambien(idnode, ten_thong_so, thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_thoigian    ON public.dulieucambien(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_idnode      ON public.dulieucambien(idnode);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_thong_so    ON public.dulieucambien(ten_thong_so);

-- nhatkyhoatdong
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_thoigian       ON public.nhatkyhoatdong(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_idnode         ON public.nhatkyhoatdong(idnode);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_id_thietbi     ON public.nhatkyhoatdong(id_thietbi);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_loai_thongbao  ON public.nhatkyhoatdong(loai_thongbao);

-- lichhengio
CREATE INDEX IF NOT EXISTS idx_lichhengio_kichhoat       ON public.lichhengio(kichhoat) WHERE kichhoat = true;

-- luat
CREATE INDEX IF NOT EXISTS idx_luat_thietbi              ON public.luat(id_thietbi);
CREATE INDEX IF NOT EXISTS idx_luat_thong_so             ON public.luat(ten_thong_so);

-- thietbi
CREATE INDEX IF NOT EXISTS idx_thietbi_idnode            ON public.thietbi(idnode);
CREATE INDEX IF NOT EXISTS idx_thietbi_loai              ON public.thietbi(loai_thietbi);

-- thanhvien_hogiadinh
CREATE INDEX IF NOT EXISTS idx_thanhvien_hogiadinh       ON public.thanhvien_hogiadinh(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_thanhvien_nguoidung       ON public.thanhvien_hogiadinh(idnguoidung);
CREATE INDEX IF NOT EXISTS idx_thanhvien_quyen           ON public.thanhvien_hogiadinh(quyen_dieu_khien);

-- iot_nodes
CREATE INDEX IF NOT EXISTS idx_iot_nodes_hogiadinh       ON public.iot_nodes(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_iot_nodes_idnguoidung     ON public.iot_nodes(idnguoidung);
CREATE INDEX IF NOT EXISTS idx_iot_nodes_trang_thai      ON public.iot_nodes(trang_thai);

-- ma_moi
CREATE INDEX IF NOT EXISTS idx_ma_moi_code               ON public.ma_moi(ma_moi);
CREATE INDEX IF NOT EXISTS idx_ma_moi_hogiadinh          ON public.ma_moi(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_ma_moi_expires            ON public.ma_moi(expires_at) WHERE is_used = FALSE;

-- 2. TRIGGERS

-- 2.1. Tự động tạo profile nguoidung và gán gia đình khi đăng ký Auth
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id BIGINT;
  v_household_id BIGINT;
  v_household_count INT;
BEGIN
  INSERT INTO public.nguoidung (auth_uid, hoten, email, vaitro)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    'buyer'
  )
  ON CONFLICT (auth_uid) DO UPDATE SET email = EXCLUDED.email
  RETURNING idnguoidung INTO v_user_id;

  -- Kiểm tra xem đã có hộ gia đình nào trong hệ thống chưa
  SELECT COUNT(*) INTO v_household_count FROM public.hogiadinh;

  IF v_household_count = 0 THEN
    -- Tài khoản đầu tiên: Tạo hộ gia đình và gán làm Gia chủ (owner)
    INSERT INTO public.hogiadinh (ten_nha, id_chuho)
    VALUES ('Nhà của tôi', v_user_id)
    RETURNING id_hogiadinh INTO v_household_id;

    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_household_id, v_user_id, 'owner', 'full_control')
    ON CONFLICT (id_hogiadinh, idnguoidung) DO NOTHING;
  ELSE
    -- Các tài khoản sau: Tự động tham gia vào gia đình với vai trò Thành viên (member)
    SELECT id_hogiadinh INTO v_household_id FROM public.hogiadinh ORDER BY id_hogiadinh ASC LIMIT 1;

    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_household_id, v_user_id, 'member', 'full_control')
    ON CONFLICT (id_hogiadinh, idnguoidung) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2.2. Tự động cập nhật thoigian_capnhat khi UPDATE thietbi
DROP FUNCTION IF EXISTS public.update_thietbi_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_thietbi_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.thoigian_capnhat = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_thietbi_updated ON public.thietbi;
CREATE TRIGGER trg_thietbi_updated
  BEFORE UPDATE ON public.thietbi
  FOR EACH ROW EXECUTE PROCEDURE public.update_thietbi_timestamp();

-- 3. SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
  PERFORM pg_catalog.set_config('search_path', 'public', false);
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dulieucambien; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luat; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nhatkyhoatdong; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lichhengio; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_nodes; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hogiadinh; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.thietbi; EXCEPTION WHEN others THEN NULL; END;
END $$;
