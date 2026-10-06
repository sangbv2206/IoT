-- ============================================================
-- 03_RPC_FUNCTIONS.SQL — Stored Procedures & API Functions
-- Phiên bản 2.0 — Cập nhật theo schema metric log dulieucambien
-- Thay thế truy vấn cột cố định (nhietdo/doam/anhsang/gas_ppm)
-- bằng CASE WHEN ten_thong_so = '...' THEN gia_tri END (PIVOT)
-- ============================================================

-- 1. Get Nodes + List Devices JSON
DROP FUNCTION IF EXISTS public.get_nodes_with_devices(BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_nodes_with_devices(p_id_hogiadinh BIGINT)
RETURNS TABLE (idnode VARCHAR, ten_phong VARCHAR, loai_phong VARCHAR, mo_ta TEXT, trang_thai VARCHAR, loai_board VARCHAR, thietbi_list JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT n.idnode, n.ten_phong, n.loai_phong, n.mo_ta, n.trang_thai, n.loai_board,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id_thietbi', t.id_thietbi, 'loai_thietbi', t.loai_thietbi,
            'ten_hienthi', t.ten_hienthi, 'dia_chi_hw', t.dia_chi_hw,
            'trangthai', t.trangthai, 'tu_dong', t.tu_dong,
            'cau_hinh', t.cau_hinh
        )) FILTER (WHERE t.id_thietbi IS NOT NULL), '[]'::JSONB) AS thietbi_list
    FROM public.iot_nodes n
    LEFT JOIN public.thietbi t ON t.idnode = n.idnode
    WHERE n.id_hogiadinh = p_id_hogiadinh AND n.idnode != 'SYSTEM_CONFIG'
    GROUP BY n.idnode, n.ten_phong, n.loai_phong, n.mo_ta, n.trang_thai, n.loai_board
    ORDER BY n.ten_phong;
END;
$$;

-- 2. Cleanup Old Data (Admin Only)
DROP FUNCTION IF EXISTS public.cleanup_old_data() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE sensor_count INT; log_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can call cleanup_old_data()';
  END IF;
  DELETE FROM public.dulieucambien WHERE thoigian < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS sensor_count = ROW_COUNT;
  DELETE FROM public.nhatkyhoatdong WHERE thoigian < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS log_count = ROW_COUNT;
  RETURN format('Đã xóa %s bản ghi cảm biến và %s bản ghi nhật ký', sensor_count, log_count);
END;
$$;

-- 3. Sensor Trend 2 Minutes (realtime chart)
--    Trả về avg từng thông số theo bucket 2 phút trong 24h qua
DROP FUNCTION IF EXISTS public.get_sensor_trend_2min() CASCADE;
DROP FUNCTION IF EXISTS public.get_sensor_trend_2min(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_trend_2min(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (time_bucket TIMESTAMPTZ, avg_temp NUMERIC, avg_humidity NUMERIC, avg_light NUMERIC, avg_gas NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH ts AS (
        SELECT generate_series(
            to_timestamp(floor(extract(epoch FROM NOW()-INTERVAL '24 hours')/120)*120),
            to_timestamp(floor(extract(epoch FROM NOW())/120)*120),
            INTERVAL '2 minutes') AS bucket
    ),
    agg AS (
        SELECT to_timestamp(floor(extract(epoch FROM thoigian)/120)*120) AS tb,
               AVG(CASE WHEN ten_thong_so = 'nhiet_do' THEN gia_tri END) AS t,
               AVG(CASE WHEN ten_thong_so = 'do_am'    THEN gia_tri END) AS h,
               AVG(CASE WHEN ten_thong_so = 'anh_sang' THEN gia_tri END) AS l,
               AVG(CASE WHEN ten_thong_so = 'gas_ppm'  THEN gia_tri END) AS g
        FROM public.dulieucambien
        WHERE thoigian >= NOW() - INTERVAL '24 hours'
          AND (p_node_id IS NULL OR idnode = p_node_id)
        GROUP BY tb
    )
    SELECT ts.bucket, ROUND(agg.t,2), ROUND(agg.h,2), ROUND(agg.l,2), ROUND(agg.g,2)
    FROM ts LEFT JOIN agg ON ts.bucket = agg.tb ORDER BY ts.bucket;
END;
$$;

-- 4. Sensor Trend ('today' | '7d' | '30d')
DROP FUNCTION IF EXISTS public.get_sensor_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_sensor_trend(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_trend(range_type TEXT, p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (label TEXT, temp NUMERIC, humid NUMERIC, light NUMERIC, gas NUMERIC,
               temp_prev_avg NUMERIC, humid_prev_avg NUMERIC, light_prev_avg NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF range_type = 'today' THEN
        RETURN QUERY
        WITH hs AS (SELECT generate_series(
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '23 hours',
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), INTERVAL '1 hour') AS hr),
        hd AS (
            SELECT DATE_TRUNC('hour', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS hr,
                   AVG(CASE WHEN ten_thong_so = 'nhiet_do' THEN gia_tri END) AS t,
                   AVG(CASE WHEN ten_thong_so = 'do_am'    THEN gia_tri END) AS h,
                   AVG(CASE WHEN ten_thong_so = 'anh_sang' THEN gia_tri END) AS l,
                   AVG(CASE WHEN ten_thong_so = 'gas_ppm'  THEN gia_tri END) AS g
            FROM public.dulieucambien
            WHERE thoigian >= NOW() - INTERVAL '23 hours'
              AND (p_node_id IS NULL OR idnode = p_node_id)
            GROUP BY 1
        )
        SELECT TO_CHAR(hs.hr,'HH24:MI')::TEXT,
               ROUND(hd.t,1)::NUMERIC, ROUND(hd.h,1)::NUMERIC, ROUND(hd.l,1)::NUMERIC, ROUND(hd.g,1)::NUMERIC,
               NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC
        FROM hs LEFT JOIN hd ON hs.hr = hd.hr ORDER BY hs.hr;
    ELSIF range_type IN ('7d','30d') THEN
        RETURN QUERY
        WITH ds AS (SELECT generate_series(
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - (CASE WHEN range_type='7d' THEN 6 ELSE 29 END || ' days')::INTERVAL,
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), INTERVAL '1 day') AS dy),
        dd AS (
            SELECT DATE_TRUNC('day', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS dy,
                   AVG(CASE WHEN ten_thong_so = 'nhiet_do' THEN gia_tri END) AS t,
                   AVG(CASE WHEN ten_thong_so = 'do_am'    THEN gia_tri END) AS h,
                   AVG(CASE WHEN ten_thong_so = 'anh_sang' THEN gia_tri END) AS l,
                   AVG(CASE WHEN ten_thong_so = 'gas_ppm'  THEN gia_tri END) AS g
            FROM public.dulieucambien
            WHERE thoigian >= NOW() - (CASE WHEN range_type='7d' THEN 6 ELSE 29 END || ' days')::INTERVAL
              AND (p_node_id IS NULL OR idnode = p_node_id)
            GROUP BY 1
        )
        SELECT TO_CHAR(ds.dy,'DD/MM')::TEXT,
               ROUND(dd.t,1)::NUMERIC, ROUND(dd.h,1)::NUMERIC, ROUND(dd.l,1)::NUMERIC, ROUND(dd.g,1)::NUMERIC,
               NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC
        FROM ds LEFT JOIN dd ON ds.dy = dd.dy ORDER BY ds.dy;
    END IF;
END;
$$;

-- 5. Sensor Heatmap (ngày trong tuần × giờ trong ngày)
DROP FUNCTION IF EXISTS public.get_sensor_heatmap() CASCADE;
DROP FUNCTION IF EXISTS public.get_sensor_heatmap(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_heatmap(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (dow INT, hr INT, avg_temp NUMERIC, avg_humid NUMERIC, avg_light NUMERIC, avg_gas NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT EXTRACT(ISODOW FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           EXTRACT(HOUR  FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           ROUND(AVG(CASE WHEN ten_thong_so = 'nhiet_do' THEN gia_tri END),1)::NUMERIC,
           ROUND(AVG(CASE WHEN ten_thong_so = 'do_am'    THEN gia_tri END),1)::NUMERIC,
           ROUND(AVG(CASE WHEN ten_thong_so = 'anh_sang' THEN gia_tri END),1)::NUMERIC,
           ROUND(AVG(CASE WHEN ten_thong_so = 'gas_ppm'  THEN gia_tri END),1)::NUMERIC
    FROM public.dulieucambien
    WHERE thoigian >= NOW() - INTERVAL '8 days'
      AND (p_node_id IS NULL OR idnode = p_node_id)
    GROUP BY 1,2 ORDER BY 1,2;
END;
$$;

-- 6. Household Invitation & Management
DROP FUNCTION IF EXISTS public.join_by_invite_code(UUID, BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.join_by_invite_code(p_ma_moi UUID, p_idnguoidung BIGINT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_record public.ma_moi%ROWTYPE; v_exists BOOLEAN;
BEGIN
    SELECT * INTO v_record FROM public.ma_moi WHERE ma_moi = p_ma_moi;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF v_record.is_used THEN RETURN 'already_used'; END IF;
    IF v_record.expires_at < NOW() THEN RETURN 'expired'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE id_hogiadinh = v_record.id_hogiadinh AND idnguoidung = p_idnguoidung) INTO v_exists;
    IF v_exists THEN RETURN 'already_member'; END IF;
    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_record.id_hogiadinh, p_idnguoidung, 'member', v_record.quyen_dieu_khien);
    UPDATE public.ma_moi SET is_used=TRUE, used_by=p_idnguoidung, thoigian_su_dung=NOW() WHERE id_ma=v_record.id_ma;
    RETURN 'ok';
END;
$$;

DROP FUNCTION IF EXISTS public.create_household(VARCHAR, TEXT, BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.create_household(p_ten_nha VARCHAR, p_dia_chi TEXT, p_idnguoidung BIGINT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id_hogiadinh BIGINT;
BEGIN
    PERFORM setval('public.hogiadinh_id_hogiadinh_seq', COALESCE((SELECT MAX(id_hogiadinh) FROM public.hogiadinh), 0) + 1, false);
    INSERT INTO public.hogiadinh (ten_nha, dia_chi, id_chuho) VALUES (p_ten_nha, p_dia_chi, p_idnguoidung)
    RETURNING id_hogiadinh INTO v_id_hogiadinh;
    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_id_hogiadinh, p_idnguoidung, 'owner', 'full_control');
    -- Tự động gán các node của chủ hộ vào Hộ gia đình vừa tạo
    UPDATE public.iot_nodes
    SET id_hogiadinh = v_id_hogiadinh
    WHERE (idnguoidung = p_idnguoidung OR id_hogiadinh IS NULL OR id_hogiadinh = 1)
      AND idnode != 'SYSTEM_CONFIG';
    RETURN v_id_hogiadinh;
END;
$$;

-- 7. AI Context & Anomaly Detection
DROP FUNCTION IF EXISTS public.get_anomaly_context() CASCADE;
DROP FUNCTION IF EXISTS public.get_anomaly_context(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_anomaly_context(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (hour_slot INT, avg_temp NUMERIC, stddev_temp NUMERIC, avg_humid NUMERIC, stddev_humid NUMERIC,
               avg_light NUMERIC, stddev_light NUMERIC, avg_gas NUMERIC, stddev_gas NUMERIC, sample_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           ROUND(AVG(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END),2)::NUMERIC,
           ROUND(STDDEV(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END),2)::NUMERIC,
           ROUND(AVG(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END),2)::NUMERIC,
           ROUND(STDDEV(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END),2)::NUMERIC,
           ROUND(AVG(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END),2)::NUMERIC,
           ROUND(STDDEV(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END),2)::NUMERIC,
           ROUND(AVG(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END),2)::NUMERIC,
           ROUND(STDDEV(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END),2)::NUMERIC,
           COUNT(DISTINCT d.thoigian)::BIGINT
    FROM public.dulieucambien d
    WHERE d.thoigian >= NOW() - INTERVAL '7 days'
      AND (p_node_id IS NULL OR d.idnode = p_node_id)
    GROUP BY 1 ORDER BY 1;
END;
$$;

-- 8. Recent Gas Readings
DROP FUNCTION IF EXISTS public.get_recent_gas_readings(TEXT, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_recent_gas_readings(
    p_node_id TEXT DEFAULT 'NODE-KITCHEN-01', p_limit INT DEFAULT 10)
RETURNS TABLE (iddl BIGINT, gas_ppm NUMERIC, thoigian TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT d.iddl, d.gia_tri AS gas_ppm, d.thoigian
    FROM public.dulieucambien d
    WHERE d.idnode = p_node_id AND d.ten_thong_so = 'gas_ppm'
    ORDER BY d.thoigian DESC LIMIT p_limit;
END;
$$;

-- 9. Device Usage Stats (7 ngày gần nhất)
DROP FUNCTION IF EXISTS public.get_device_usage_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_device_usage_stats(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_device_usage_stats(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (idnode VARCHAR, ten_phong VARCHAR, device_name TEXT, loai_thietbi VARCHAR,
               total_toggles BIGINT, on_count BIGINT, off_count BIGINT,
               peak_hour INT, earliest_event TIMESTAMPTZ, latest_event TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH activity AS (
        SELECT nk.idnode AS nk_idnode, nk.id_thietbi, nk.hanhdong, nk.thoigian AS nk_thoigian
        FROM public.nhatkyhoatdong nk
        WHERE nk.thoigian >= NOW() - INTERVAL '7 days' AND nk.idnode IS NOT NULL
          AND (p_node_id IS NULL OR nk.idnode = p_node_id)
    ),
    toggle_stats AS (
        SELECT a.nk_idnode, a.id_thietbi,
               COUNT(*) AS total_tgl,
               COUNT(*) FILTER (WHERE a.hanhdong ILIKE '%Bật%' OR a.hanhdong ILIKE '%on%') AS on_cnt,
               COUNT(*) FILTER (WHERE a.hanhdong ILIKE '%Tắt%' OR a.hanhdong ILIKE '%off%') AS off_cnt,
               MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM a.nk_thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT) AS pk_hour,
               MIN(a.nk_thoigian) AS first_evt, MAX(a.nk_thoigian) AS last_evt
        FROM activity a GROUP BY a.nk_idnode, a.id_thietbi
    )
    SELECT n.idnode, n.ten_phong,
           COALESCE(t.ten_hienthi,'Thiết bị')::TEXT, t.loai_thietbi,
           COALESCE(ts.total_tgl,0)::BIGINT, COALESCE(ts.on_cnt,0)::BIGINT, COALESCE(ts.off_cnt,0)::BIGINT,
           ts.pk_hour::INT, ts.first_evt, ts.last_evt
    FROM public.thietbi t
    JOIN public.iot_nodes n ON n.idnode = t.idnode
    LEFT JOIN toggle_stats ts ON ts.id_thietbi = t.id_thietbi AND ts.nk_idnode = n.idnode
    WHERE n.idnode != 'SYSTEM_CONFIG' AND (p_node_id IS NULL OR n.idnode = p_node_id)
    ORDER BY n.ten_phong, t.loai_thietbi;
END;
$$;

-- 10. AI Chat Context
DROP FUNCTION IF EXISTS public.get_ai_chat_context() CASCADE;
DROP FUNCTION IF EXISTS public.get_ai_chat_context(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_ai_chat_context(p_range TEXT DEFAULT 'today', p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (context_type TEXT, context_key TEXT, context_value TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_interval INTERVAL;
BEGIN
    v_interval := CASE p_range WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' ELSE INTERVAL '24 hours' END;

    RETURN QUERY  -- Sensor summary
    SELECT 'sensor_summary'::TEXT, 'overview'::TEXT,
        format('Nhiệt độ: min=%s°C, max=%s°C, avg=%s°C | Độ ẩm: min=%s%%, max=%s%%, avg=%s%% | Ánh sáng: min=%s lx, max=%s lx, avg=%s lx | Gas: min=%s ppm, max=%s ppm, avg=%s ppm | Mẫu: %s',
               ROUND(MIN(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END)::numeric,1),
               ROUND(MAX(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END)::numeric,1),
               ROUND(AVG(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END)::numeric,1),
               ROUND(MIN(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END)::numeric,1),
               ROUND(MAX(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END)::numeric,1),
               ROUND(AVG(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END)::numeric,1),
               ROUND(MIN(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END)::numeric,0),
               ROUND(MAX(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END)::numeric,0),
               ROUND(AVG(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END)::numeric,0),
               ROUND(MIN(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END)::numeric,0),
               ROUND(MAX(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END)::numeric,0),
               ROUND(AVG(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END)::numeric,0),
               COUNT(DISTINCT d.thoigian)::TEXT)::TEXT
    FROM public.dulieucambien d WHERE d.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR d.idnode=p_node_id);

    RETURN QUERY  -- Hourly breakdown
    SELECT 'hourly_breakdown'::TEXT,
        LPAD(EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::TEXT, 2, '0') || ':00',
        format('temp=%s, humid=%s, light=%s, gas=%s',
               ROUND(AVG(CASE WHEN d.ten_thong_so='nhiet_do' THEN d.gia_tri END)::numeric,1),
               ROUND(AVG(CASE WHEN d.ten_thong_so='do_am'    THEN d.gia_tri END)::numeric,1),
               ROUND(AVG(CASE WHEN d.ten_thong_so='anh_sang' THEN d.gia_tri END)::numeric,0),
               ROUND(AVG(CASE WHEN d.ten_thong_so='gas_ppm'  THEN d.gia_tri END)::numeric,0))::TEXT
    FROM public.dulieucambien d WHERE d.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR d.idnode=p_node_id)
    GROUP BY EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT ORDER BY 2;

    RETURN QUERY  -- Device status
    SELECT 'device_status'::TEXT,
        format('%s (%s)', t.ten_hienthi, n.ten_phong)::TEXT,
        format('trạng thái=%s, chế_độ=%s, cập_nhật_lúc=%s',
               CASE WHEN t.trangthai=1 THEN 'BẬT' ELSE 'TẮT' END,
               CASE WHEN t.tu_dong THEN 'Tự động' ELSE 'Thủ công' END,
               TO_CHAR(t.thoigian_capnhat AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI'))::TEXT
    FROM public.thietbi t JOIN public.iot_nodes n ON n.idnode=t.idnode
    WHERE n.idnode!='SYSTEM_CONFIG' AND (p_node_id IS NULL OR n.idnode=p_node_id);

    RETURN QUERY  -- Recent activity (20 events)
    SELECT 'recent_activity'::TEXT,
        TO_CHAR(nk.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI')::TEXT,
        format('%s [node: %s]', nk.hanhdong, COALESCE(nk.idnode,'N/A'))::TEXT
    FROM public.nhatkyhoatdong nk WHERE nk.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR nk.idnode=p_node_id)
    ORDER BY nk.thoigian DESC LIMIT 20;

    RETURN QUERY  -- Active schedules
    SELECT 'schedules'::TEXT, format('ID %s', lh.idid)::TEXT,
        format('id_thietbi=%s, hành_động=%s, giờ=%s, thứ=%s, kích_hoạt=%s',
               COALESCE(lh.id_thietbi::TEXT,'N/A'), lh.hanhdong, lh.thoigian::TEXT,
               array_to_string(lh.thu,','), CASE WHEN lh.kichhoat THEN 'Có' ELSE 'Không' END)::TEXT
    FROM public.lichhengio lh 
    LEFT JOIN public.thietbi t ON t.id_thietbi = lh.id_thietbi
    WHERE (p_node_id IS NULL OR t.idnode = p_node_id);

    RETURN QUERY  -- Recent technical alerts from nhatkyhoatdong
    SELECT 'technical_alerts'::TEXT, format('%s [technical_alert]', nk.hanhdong)::TEXT,
        format('%s (node: %s, lúc: %s)', COALESCE(nk.chi_tiet, nk.hanhdong), COALESCE(nk.idnode, 'N/A'),
               TO_CHAR(nk.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI'))::TEXT
    FROM public.nhatkyhoatdong nk 
    WHERE nk.loai_thongbao = 'technical_alert' AND nk.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR nk.idnode=p_node_id)
    ORDER BY nk.thoigian DESC LIMIT 10;
END;
$$;

-- 11. Peak Hours Analysis cho từng thông số cảm biến bất kỳ
DROP FUNCTION IF EXISTS public.get_peak_hours(TEXT, TEXT, TEXT, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_peak_hours(
    p_metric TEXT DEFAULT 'nhiet_do', p_range TEXT DEFAULT '7d', p_node_id TEXT DEFAULT NULL, p_top_n INT DEFAULT 5)
RETURNS TABLE (hour_slot INT, avg_value NUMERIC, max_value NUMERIC, min_value NUMERIC, readings BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_interval INTERVAL;
BEGIN
    v_interval := CASE p_range WHEN 'today' THEN INTERVAL '24 hours' WHEN '30d' THEN INTERVAL '30 days' ELSE INTERVAL '7 days' END;
    RETURN QUERY
    SELECT EXTRACT(HOUR FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           ROUND(AVG(gia_tri),2)::NUMERIC,
           ROUND(MAX(gia_tri),2)::NUMERIC,
           ROUND(MIN(gia_tri),2)::NUMERIC,
           COUNT(*)::BIGINT
    FROM public.dulieucambien
    WHERE thoigian >= NOW()-v_interval
      AND ten_thong_so = p_metric
      AND (p_node_id IS NULL OR idnode = p_node_id)
    GROUP BY 1 ORDER BY AVG(gia_tri) DESC LIMIT p_top_n;
END;
$$;
