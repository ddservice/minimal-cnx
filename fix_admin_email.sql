-- ================================================================
-- แก้ email admin จาก minimal.com → marim69.internal
-- แล้ว reset password ทั้ง 2 user
-- แก้ 'ใส่รหัสผ่านที่ต้องการ' ให้เป็นรหัสผ่านที่ต้องการ
-- ================================================================

-- STEP 1: เปลี่ยน email ของ admin
UPDATE auth.users
SET email = 'admin@marim69.internal',
    updated_at = now()
WHERE email = 'admin@minimal.com';

-- Sync email ใน profiles ด้วย
UPDATE public.profiles
SET email = 'admin@marim69.internal'
WHERE username = 'admin';

-- STEP 2: Reset password admin (แก้รหัสผ่านด้านล่าง)
UPDATE auth.users
SET encrypted_password = extensions.crypt('ใส่รหัสผ่านที่ต้องการ', extensions.gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@marim69.internal';

-- STEP 3: Reset password imm (แก้รหัสผ่านด้านล่าง ถ้าต้องการเปลี่ยน)
UPDATE auth.users
SET encrypted_password = extensions.crypt('ใส่รหัสผ่านที่ต้องการ', extensions.gen_salt('bf')),
    updated_at = now()
WHERE email = 'imm@marim69.internal';

-- ตรวจสอบผลลัพธ์
SELECT au.email, p.username, p.role, au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email LIKE '%marim69%'
ORDER BY p.role;
