-- Enable pgcrypto (required for crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- ════════════════════════════════════════════════════════════════
--  Admin User Management Functions  (Minimal Coffee Dashboard)
--  รัน SQL นี้ใน Supabase → SQL Editor แล้วกด Run
-- ════════════════════════════════════════════════════════════════

-- ── 1. สร้าง User (สร้างทั้ง auth + profile ด้วย SECURITY DEFINER) ────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username   text,
  p_full_name  text,
  p_nickname   text,
  p_password   text,
  p_role       text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        text := p_username || '@marim69.internal';
  v_uid          uuid;
  v_caller_role  text;
BEGIN
  -- ตรวจสิทธิ์ admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status','error','message','เฉพาะ Admin เท่านั้น');
  END IF;

  -- ตรวจ username ซ้ำ
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RETURN jsonb_build_object('status','error','message','ชื่อผู้ใช้ "' || p_username || '" มีอยู่แล้ว');
  END IF;

  -- ถ้ามี auth user เก่าอยู่แล้ว (email ซ้ำ) ให้ใช้ UUID เดิม
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;

  IF v_uid IS NULL THEN
    -- สร้าง auth.users ใหม่
    -- สำคัญ: ต้องใส่ instance_id และคอลัมน์ token เป็น '' (ห้ามปล่อย NULL)
    -- ไม่งั้น GoTrue จะหา user ไม่เจอตอน login → "Invalid login credentials"
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', p_username),
      false, false,
      '', '', '', '', '', '', '', ''
    );
    -- สร้าง auth.identities (provider_id ของ email provider = user id)
    BEGIN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider,
        provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email', v_uid::text, now(), now(), now()
      );
    EXCEPTION WHEN undefined_column THEN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email),
        'email', now(), now(), now()
      );
    END;
  ELSE
    -- อัพเดต password ของ auth user เดิม + ซ่อมฟิลด์ที่อาจขาดจากรุ่นเก่า
    UPDATE auth.users
    SET encrypted_password         = extensions.crypt(p_password, extensions.gen_salt('bf')),
        instance_id                = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
        aud                        = COALESCE(NULLIF(aud, ''), 'authenticated'),
        role                       = COALESCE(NULLIF(role, ''), 'authenticated'),
        email_confirmed_at         = COALESCE(email_confirmed_at, now()),
        banned_until               = NULL,
        confirmation_token         = COALESCE(confirmation_token, ''),
        recovery_token             = COALESCE(recovery_token, ''),
        email_change               = COALESCE(email_change, ''),
        email_change_token_new     = COALESCE(email_change_token_new, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone_change               = COALESCE(phone_change, ''),
        phone_change_token         = COALESCE(phone_change_token, ''),
        reauthentication_token     = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_uid;
  END IF;

  -- Upsert profile (รองรับทั้งสร้างใหม่และซ่อม orphan)
  INSERT INTO public.profiles (id, username, full_name, nickname, role, is_active, email)
  VALUES (v_uid, p_username, p_full_name,
          COALESCE(NULLIF(p_nickname,''), p_full_name),
          p_role, true, v_email)
  ON CONFLICT (id) DO UPDATE
    SET username=EXCLUDED.username, full_name=EXCLUDED.full_name,
        nickname=EXCLUDED.nickname, role=EXCLUDED.role,
        is_active=true, email=EXCLUDED.email;

  RETURN jsonb_build_object('status','ok','user_id', v_uid::text);
END;
$$;

-- ── 2. Insert Profile (bypass RLS) ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_insert_profile(
  p_id        uuid,
  p_username  text,
  p_full_name text,
  p_nickname  text,
  p_role      text DEFAULT 'staff',
  p_email     text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status','error','message','เฉพาะ Admin เท่านั้น');
  END IF;
  INSERT INTO public.profiles(id, username, full_name, nickname, role, is_active, email)
  VALUES (p_id, p_username, p_full_name,
          COALESCE(NULLIF(p_nickname,''), p_full_name),
          p_role, true, p_email)
  ON CONFLICT (id) DO UPDATE
    SET username=EXCLUDED.username, full_name=EXCLUDED.full_name,
        nickname=EXCLUDED.nickname, role=EXCLUDED.role, email=EXCLUDED.email;
  RETURN jsonb_build_object('status','ok');
END;
$$;

-- ── 3. รีเซ็ต Password ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_username     text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid;
  v_caller_role text;
  v_email       text;
  v_rows        int;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status','error','message','เฉพาะ Admin เท่านั้น');
  END IF;
  SELECT id INTO v_uid FROM public.profiles WHERE username = p_username;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status','error','message','ไม่พบ user "' || p_username || '"');
  END IF;
  v_email := p_username || '@marim69.internal';
  -- ตั้งรหัสใหม่ + ซ่อมฟิลด์ที่ทำให้ login พัง (instance_id / token / email ไม่ตรง)
  UPDATE auth.users
  SET encrypted_password         = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      email                      = v_email,
      instance_id                = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
      aud                        = COALESCE(NULLIF(aud, ''), 'authenticated'),
      role                       = COALESCE(NULLIF(role, ''), 'authenticated'),
      email_confirmed_at         = COALESCE(email_confirmed_at, now()),
      banned_until               = NULL,
      confirmation_token         = COALESCE(confirmation_token, ''),
      recovery_token             = COALESCE(recovery_token, ''),
      email_change               = COALESCE(email_change, ''),
      email_change_token_new     = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change               = COALESCE(phone_change, ''),
      phone_change_token         = COALESCE(phone_change_token, ''),
      reauthentication_token     = COALESCE(reauthentication_token, ''),
      updated_at = now()
  WHERE id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    -- profile มีแต่ auth row หาย → ให้ลบแล้วสร้างใหม่ หรือรัน fix_imm_login.sql
    RETURN jsonb_build_object('status','error',
      'message','user "' || p_username || '" ไม่มีข้อมูล login ในระบบ กรุณาลบแล้วสร้างใหม่');
  END IF;
  RETURN jsonb_build_object('status','ok');
END;
$$;

-- ── 4. ลบ User ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_username text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status','error','message','เฉพาะ Admin เท่านั้น');
  END IF;
  IF p_username = 'admin' THEN
    RETURN jsonb_build_object('status','error','message','ไม่สามารถลบบัญชี admin ได้');
  END IF;
  SELECT id INTO v_uid FROM public.profiles WHERE username = p_username;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status','error','message','ไม่พบ user "' || p_username || '"');
  END IF;
  DELETE FROM auth.identities WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
  RETURN jsonb_build_object('status','ok');
END;
$$;

-- ── Grant permissions ──────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_insert_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_password TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;

SELECT 'admin_user_functions installed ✓' AS result;
