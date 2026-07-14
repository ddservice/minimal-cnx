-- ================================================================
-- fix_imm_login.sql — ซ่อม user "imm" ที่ล็อกอินไม่ได้ (invalid_credentials)
--
-- สาเหตุ: user ที่สร้างด้วย admin_create_user รุ่นเก่า INSERT เข้า auth.users
-- โดยไม่ได้ใส่ instance_id และคอลัมน์ token (confirmation_token ฯลฯ)
-- ทำให้ GoTrue หา user ไม่เจอตอน login → ตอบ "Invalid login credentials"
-- แม้รหัสผ่านจะถูกต้อง และการรีเซ็ตรหัสผ่านก็ไม่ช่วยเพราะไม่ได้ซ่อมฟิลด์เหล่านี้
--
-- วิธีใช้: แก้รหัสผ่านใน STEP 2 (ถ้าต้องการ) แล้วรันทั้งไฟล์ใน
-- Supabase → SQL Editor → Run
-- ================================================================

-- ── STEP 1: วินิจฉัย — ดูสภาพ auth row ของ imm ──────────────────
SELECT p.username, p.is_active, p.role,
       au.id IS NOT NULL                                  AS has_auth_row,
       au.email                                           AS auth_email,
       au.instance_id,
       au.aud, au.role                                    AS auth_role,
       au.email_confirmed_at, au.banned_until, au.deleted_at,
       au.confirmation_token IS NULL                      AS token_is_null,
       (SELECT count(*) FROM auth.identities i WHERE i.user_id = p.id) AS identities
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.username = 'imm';

-- ── STEP 2: ซ่อม auth row ของ imm + ตั้งรหัสผ่านใหม่ ────────────
DO $$
DECLARE
  v_username text := 'imm';
  v_password text := 'imm2026';                    -- ← แก้รหัสผ่านตรงนี้ถ้าต้องการ
  v_email    text := 'imm@marim69.internal';
  v_uid      uuid;
BEGIN
  SELECT id INTO v_uid FROM public.profiles WHERE username = v_username;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ไม่พบ profile ของ %', v_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
    UPDATE auth.users SET
      instance_id                = '00000000-0000-0000-0000-000000000000',
      aud                        = 'authenticated',
      role                       = 'authenticated',
      email                      = v_email,
      encrypted_password         = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at         = COALESCE(email_confirmed_at, now()),
      banned_until               = NULL,
      deleted_at                 = NULL,
      is_sso_user                = false,
      confirmation_token         = COALESCE(confirmation_token, ''),
      recovery_token             = COALESCE(recovery_token, ''),
      email_change               = COALESCE(email_change, ''),
      email_change_token_new     = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change               = COALESCE(phone_change, ''),
      phone_change_token         = COALESCE(phone_change_token, ''),
      reauthentication_token     = COALESCE(reauthentication_token, ''),
      raw_app_meta_data          = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
      updated_at                 = now()
    WHERE id = v_uid;
  ELSE
    -- profile เป็น orphan (ไม่มี auth row) → สร้างใหม่ด้วย id เดิม
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', v_username), false, false,
      '', '', '', '', '', '', '', ''
    );
  END IF;

  -- สร้าง identity ใหม่ให้ถูกรูปแบบ (provider_id ของ email provider = user id)
  DELETE FROM auth.identities WHERE user_id = v_uid AND provider = 'email';
  BEGIN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
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

  UPDATE public.profiles SET email = v_email, is_active = true WHERE id = v_uid;

  RAISE NOTICE 'ซ่อม user % เรียบร้อย — ล็อกอินด้วยรหัสผ่านใหม่ได้เลย', v_username;
END $$;

-- ── STEP 3 (ทางเลือก): ซ่อมฟิลด์เดียวกันให้ user ภายในทุกคน ─────
-- ไม่แตะรหัสผ่าน — เติมเฉพาะฟิลด์ที่ขาดซึ่งทำให้ login พัง
UPDATE auth.users SET
  instance_id                = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
  aud                        = COALESCE(NULLIF(aud, ''), 'authenticated'),
  email_confirmed_at         = COALESCE(email_confirmed_at, now()),
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, ''),
  updated_at                 = now()
WHERE email LIKE '%@marim69.internal';

-- ── STEP 4: ตรวจผลลัพธ์ ─────────────────────────────────────────
SELECT au.email, au.instance_id, au.email_confirmed_at IS NOT NULL AS confirmed,
       au.confirmation_token IS NOT NULL AS token_ok, p.username, p.role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email LIKE '%@marim69.internal'
ORDER BY p.username;
