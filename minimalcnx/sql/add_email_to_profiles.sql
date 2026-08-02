-- 1. เพิ่มคอลัมน์ email ใน profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. ดึง email จาก auth.users มาใส่ให้ user ที่มีอยู่แล้ว
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ตรวจสอบผลลัพธ์
SELECT username, email, role FROM public.profiles ORDER BY created_at;
