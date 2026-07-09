-- รันใน Supabase SQL Editor หลังจากสร้าง user admin@minimal.com แล้ว
-- 1. ดึง user id ของ admin
-- 2. insert profile ด้วย role = 'admin'

INSERT INTO public.profiles (id, username, full_name, nickname, role, is_active)
SELECT 
  id,
  'admin',
  'ผู้ดูแลระบบ',
  'Admin',
  'admin',
  true
FROM auth.users
WHERE email = 'admin@minimal.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
