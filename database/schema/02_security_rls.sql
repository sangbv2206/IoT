-- ============================================================
-- 02_SECURITY_RLS.SQL — Phân Quyền Bảo Mật Row Level Security
-- Helper functions & RLS policies cho Admin và Buyer/Owner
-- Phiên bản 2.0 — Cập nhật theo iot_nodes, bỏ bảng SaaS
-- ============================================================

-- 1. HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT idnguoidung FROM public.nguoidung WHERE auth_uid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.nguoidung
        WHERE auth_uid = auth.uid() AND vaitro = 'admin'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(p_id_hogiadinh BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE idnguoidung = public.current_user_id()
          AND id_hogiadinh = p_id_hogiadinh
    )
$$;

CREATE OR REPLACE FUNCTION public.user_household_ids()
RETURNS BIGINT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(ARRAY_AGG(id_hogiadinh), ARRAY[]::BIGINT[])
    FROM public.thanhvien_hogiadinh
    WHERE idnguoidung = public.current_user_id()
$$;

-- 2. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.nguoidung             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hogiadinh             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thanhvien_hogiadinh   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_nodes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thietbi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dulieucambien         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luat                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lichhengio            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhatkyhoatdong        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ma_moi                ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES PHÂN QUYỀN

-- 3.1. nguoidung
DROP POLICY IF EXISTS "nguoidung_select" ON public.nguoidung;
CREATE POLICY "nguoidung_select" ON public.nguoidung FOR SELECT USING (true);
DROP POLICY IF EXISTS "nguoidung_insert" ON public.nguoidung;
CREATE POLICY "nguoidung_insert" ON public.nguoidung FOR INSERT WITH CHECK (auth_uid = auth.uid());
DROP POLICY IF EXISTS "nguoidung_update" ON public.nguoidung;
CREATE POLICY "nguoidung_update" ON public.nguoidung FOR UPDATE USING (auth_uid = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "nguoidung_delete" ON public.nguoidung;
CREATE POLICY "nguoidung_delete" ON public.nguoidung FOR DELETE USING (auth_uid = auth.uid() OR public.is_admin());

-- 3.2. hogiadinh
DROP POLICY IF EXISTS "hogiadinh_select" ON public.hogiadinh;
CREATE POLICY "hogiadinh_select" ON public.hogiadinh FOR SELECT USING (id_chuho = public.current_user_id() OR public.is_household_member(id_hogiadinh) OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_insert" ON public.hogiadinh;
CREATE POLICY "hogiadinh_insert" ON public.hogiadinh FOR INSERT WITH CHECK (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_update" ON public.hogiadinh;
CREATE POLICY "hogiadinh_update" ON public.hogiadinh FOR UPDATE USING (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_delete" ON public.hogiadinh;
CREATE POLICY "hogiadinh_delete" ON public.hogiadinh FOR DELETE USING (id_chuho = public.current_user_id() OR public.is_admin());

-- 3.3. thanhvien_hogiadinh
DROP POLICY IF EXISTS "thanhvien_select" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_select" ON public.thanhvien_hogiadinh FOR SELECT USING (id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_insert" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_insert" ON public.thanhvien_hogiadinh FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thanhvien_update" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_update" ON public.thanhvien_hogiadinh FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_delete" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_delete" ON public.thanhvien_hogiadinh FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());

-- 3.4. iot_nodes
DROP POLICY IF EXISTS "iot_nodes_select" ON public.iot_nodes;
CREATE POLICY "iot_nodes_select" ON public.iot_nodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "iot_nodes_insert" ON public.iot_nodes;
CREATE POLICY "iot_nodes_insert" ON public.iot_nodes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "iot_nodes_update" ON public.iot_nodes;
CREATE POLICY "iot_nodes_update" ON public.iot_nodes FOR UPDATE USING (
    idnguoidung = public.current_user_id()
    OR public.is_admin()
    OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
        SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE idnguoidung = public.current_user_id()
          AND id_hogiadinh = public.iot_nodes.id_hogiadinh
          AND quyen_dieu_khien = 'full_control'
    ))
    OR (idnguoidung IS NULL AND public.current_user_id() IS NOT NULL)
    OR auth.uid() IS NOT NULL
);
DROP POLICY IF EXISTS "iot_nodes_delete" ON public.iot_nodes;
CREATE POLICY "iot_nodes_delete" ON public.iot_nodes FOR DELETE USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 3.5. thietbi
DROP POLICY IF EXISTS "thietbi_select" ON public.thietbi;
CREATE POLICY "thietbi_select" ON public.thietbi FOR SELECT USING (
    idnode IN (SELECT idnode FROM public.iot_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id())
    OR public.is_admin()
);
DROP POLICY IF EXISTS "thietbi_insert" ON public.thietbi;
CREATE POLICY "thietbi_insert" ON public.thietbi FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thietbi_update" ON public.thietbi;
CREATE POLICY "thietbi_update" ON public.thietbi FOR UPDATE USING (
    idnode IN (SELECT idnode FROM public.iot_nodes WHERE
        idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh
            WHERE idnguoidung = public.current_user_id()
              AND id_hogiadinh = public.iot_nodes.id_hogiadinh
              AND quyen_dieu_khien = 'full_control'
        ))
    )
    OR public.is_admin()
);
DROP POLICY IF EXISTS "thietbi_delete" ON public.thietbi;
CREATE POLICY "thietbi_delete" ON public.thietbi FOR DELETE USING (
    idnode IN (SELECT idnode FROM public.iot_nodes WHERE
        idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh
            WHERE idnguoidung = public.current_user_id()
              AND id_hogiadinh = public.iot_nodes.id_hogiadinh
              AND quyen_dieu_khien = 'full_control'
        ))
    )
    OR public.is_admin()
);

-- 3.6. dulieucambien
DROP POLICY IF EXISTS "dulieucambien_select" ON public.dulieucambien;
CREATE POLICY "dulieucambien_select" ON public.dulieucambien FOR SELECT USING (
    idnode IN (SELECT idnode FROM public.iot_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id())
    OR public.is_admin()
);
DROP POLICY IF EXISTS "dulieucambien_insert" ON public.dulieucambien;
CREATE POLICY "dulieucambien_insert" ON public.dulieucambien FOR INSERT WITH CHECK (true);

-- 3.7. luat
DROP POLICY IF EXISTS "luat_select" ON public.luat;
CREATE POLICY "luat_select" ON public.luat FOR SELECT USING (
    id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.iot_nodes n ON n.idnode = t.idnode
        WHERE n.id_hogiadinh = ANY(public.user_household_ids()) OR n.idnguoidung = public.current_user_id())
    OR public.is_admin()
);
DROP POLICY IF EXISTS "luat_insert" ON public.luat;
CREATE POLICY "luat_insert" ON public.luat FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "luat_update" ON public.luat;
CREATE POLICY "luat_update" ON public.luat FOR UPDATE USING (
    id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.iot_nodes n ON n.idnode = t.idnode WHERE
        n.idnguoidung = public.current_user_id()
        OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh
            WHERE idnguoidung = public.current_user_id()
              AND id_hogiadinh = n.id_hogiadinh
              AND quyen_dieu_khien = 'full_control'
        ))
    )
    OR public.is_admin()
);
DROP POLICY IF EXISTS "luat_delete" ON public.luat;
CREATE POLICY "luat_delete" ON public.luat FOR DELETE USING (
    id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.iot_nodes n ON n.idnode = t.idnode WHERE
        n.idnguoidung = public.current_user_id()
        OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh
            WHERE idnguoidung = public.current_user_id()
              AND id_hogiadinh = n.id_hogiadinh
              AND quyen_dieu_khien = 'full_control'
        ))
    )
    OR public.is_admin()
);

-- 3.8. lichhengio
DROP POLICY IF EXISTS "lichhengio_select" ON public.lichhengio;
CREATE POLICY "lichhengio_select" ON public.lichhengio FOR SELECT USING (true);
DROP POLICY IF EXISTS "lichhengio_insert" ON public.lichhengio;
CREATE POLICY "lichhengio_insert" ON public.lichhengio FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "lichhengio_update" ON public.lichhengio;
CREATE POLICY "lichhengio_update" ON public.lichhengio FOR UPDATE USING (true);
DROP POLICY IF EXISTS "lichhengio_delete" ON public.lichhengio;
CREATE POLICY "lichhengio_delete" ON public.lichhengio FOR DELETE USING (true);

-- 3.9. nhatkyhoatdong
DROP POLICY IF EXISTS "nhatkyhoatdong_select" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_select" ON public.nhatkyhoatdong FOR SELECT USING (
    (idnguoidung = public.current_user_id() AND loai_thongbao IN ('user_action', 'system_alert', 'admin_notification', 'user_to_admin'))
    OR (idnguoidung IS NULL AND loai_thongbao IN ('system_alert', 'admin_notification'))
    OR public.is_admin()
    OR idnode IN (SELECT idnode FROM public.iot_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()))
);
DROP POLICY IF EXISTS "nhatkyhoatdong_insert" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_insert" ON public.nhatkyhoatdong FOR INSERT WITH CHECK (true);


-- 3.11. ma_moi
DROP POLICY IF EXISTS "ma_moi_select" ON public.ma_moi;
CREATE POLICY "ma_moi_select" ON public.ma_moi FOR SELECT USING (true);
DROP POLICY IF EXISTS "ma_moi_insert" ON public.ma_moi;
CREATE POLICY "ma_moi_insert" ON public.ma_moi FOR INSERT WITH CHECK (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_update" ON public.ma_moi;
CREATE POLICY "ma_moi_update" ON public.ma_moi FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_delete" ON public.ma_moi;
CREATE POLICY "ma_moi_delete" ON public.ma_moi FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
