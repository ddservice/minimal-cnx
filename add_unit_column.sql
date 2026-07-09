-- ================================================================
-- เพิ่ม unit column ใน expenses table
-- รัน SQL นี้ใน Supabase SQL Editor ก่อนใช้ฟีเจอร์หน่วยนับ
-- ================================================================

-- เพิ่ม column unit (ถ้ายังไม่มี)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS unit text DEFAULT '';

-- เพิ่ม column updated_at (สำหรับ edit expense history)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ตรวจสอบ
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND column_name IN ('unit', 'updated_at');
