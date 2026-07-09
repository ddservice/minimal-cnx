-- ================================================================
-- STEP 1: ตรวจสอบว่า user ใดมีอยู่ใน Supabase
-- รัน query นี้ก่อน เพื่อดูว่า email ถูกต้องหรือไม่
-- ================================================================
SELECT 
  au.email,
  au.created_at,
  au.last_sign_in_at,
  p.username,
  p.role,
  p.is_active
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at;

-- ================================================================
-- STEP 2: Reset รหัสผ่าน
-- แก้ 'NEW_PASSWORD_HERE' เป็นรหัสผ่านที่ต้องการ แล้วรัน
-- ================================================================

-- Reset admin
UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('NEW_PASSWORD_HERE', extensions.gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@marim69.internal';

-- Reset imm
UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('NEW_PASSWORD_HERE', extensions.gen_salt('bf')),
  updated_at = now()
WHERE email = 'imm@marim69.internal';

-- ตรวจสอบว่า update สำเร็จ (ควรได้ 1 row ต่อ user)
SELECT email, updated_at FROM auth.users 
WHERE email IN ('admin@marim69.internal','imm@marim69.internal');
