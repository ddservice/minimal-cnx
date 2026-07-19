-- ================================================================
-- harden_security.sql — ปิดช่องโหว่ RLS ที่พบจากการรีวิวความปลอดภัย
--
-- ปัญหา: RLS ปัจจุบันกันเฉพาะ "ต้องล็อกอิน" (authenticated) สำหรับหลายตาราง
-- แต่ publishable/anon key + JWT ของผู้ใช้ที่ล็อกอินแล้ว สามารถเรียก
-- Supabase โดยตรงจาก browser console ได้ — ไม่ผ่านแอป Next.js เลย
-- ดังนั้นโค้ดฝั่งแอป (Server Action เช็ค role) ไม่ใช่ด่านสุดท้าย
-- RLS ต่างหากที่เป็นด่านจริง — ไฟล์นี้แก้จุดที่หลวมเกินไป
--
-- รันทั้งไฟล์ใน Supabase → SQL Editor → Run (ปลอดภัย รันซ้ำได้)
-- ================================================================

-- ── FIX 1 (สำคัญที่สุด): กัน user ทั่วไปยกระดับสิทธิ์ตัวเอง ─────────
-- ปัญหา: policy "profiles: update own" อนุญาตให้ user แก้ "แถวของตัวเอง"
-- ได้ทุกคอลัมน์ รวมถึง role/is_active — แปลว่า user role 'staff' คนไหนก็ตาม
-- เปิด browser console แล้วรัน:
--   supabase.from('profiles').update({role:'admin'}).eq('id', <ตัวเอง>)
-- จะได้สิทธิ์ admin ทันที (ผ่าน RLS ปกติ ไม่ต้องเจาะระบบเลย)
--
-- วิธีแก้: เพิ่ม trigger กันไม่ให้ user ที่ไม่ใช่ admin เปลี่ยน role/is_active
-- ของตัวเอง (ยังแก้ full_name/nickname ของตัวเองได้ตามปกติ)

create or replace function public.fn_guard_profile_self_update()
returns trigger language plpgsql security definer as $$
begin
  if public.fn_my_role() is distinct from 'admin' then
    if new.role is distinct from old.role then
      raise exception 'ไม่มีสิทธิ์เปลี่ยน role ของตัวเอง (เฉพาะ Admin เท่านั้น)';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'ไม่มีสิทธิ์เปลี่ยนสถานะการใช้งานของตัวเอง (เฉพาะ Admin เท่านั้น)';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists tr_profiles_guard_self_update on public.profiles;
create trigger tr_profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.fn_guard_profile_self_update();

-- ── FIX 2: จำกัดการเขียน business_config ตามความอ่อนไหวของคีย์ ────────
-- ปัญหา: policy "config: write/update authenticated" เปิดให้ทุก role
-- เขียนได้ทุกคีย์ใน business_config โดยตรง (ข้าม Server Action ที่เช็ค role)
--
-- แบ่งเป็น 2 ระดับ:
--  - admin เท่านั้น: role_perms (สิทธิ์เมนู), form50_payees (ข้อมูลผู้รับเงิน
--    50 ทวิ — เสี่ยงถูกสวมสิทธิ์เปลี่ยนบัญชีธนาคารผู้รับ), opex_defaults,
--    emp_pay_history (ประวัติจ่ายเงินเดือน — ควรแก้ไม่ได้เลยนอกจาก trigger)
--  - admin + co-admin: emp_details (ชื่อ/บัตร ปชช./บัญชีธนาคารพนักงาน —
--    ให้ co-admin จัดการได้ตามที่ใช้งานจริง)
--  - คีย์อื่นๆ (biz_info ฯลฯ) ยังให้ทุก role เขียนได้เหมือนเดิม
--    (ตั้งใจไว้แต่แรก เพื่อไม่ให้ manager ถูกบล็อกเหมือนระบบเก่า)

drop policy if exists "config: write authenticated" on public.business_config;
create policy "config: write authenticated"
  on public.business_config for insert
  with check (
    case
      when key in ('role_perms', 'form50_payees', 'opex_defaults', 'emp_pay_history')
        then public.fn_my_role() = 'admin'
      when key = 'emp_details'
        then public.fn_my_role() in ('admin', 'co-admin')
      else true
    end
  );

drop policy if exists "config: update authenticated" on public.business_config;
create policy "config: update authenticated"
  on public.business_config for update
  using (
    case
      when key in ('role_perms', 'form50_payees', 'opex_defaults', 'emp_pay_history')
        then public.fn_my_role() = 'admin'
      when key = 'emp_details'
        then public.fn_my_role() in ('admin', 'co-admin')
      else true
    end
  );

-- ── FIX 3: จำกัดคนอ่าน audit_log ให้เฉพาะ admin ──────────────────
-- ปัญหา: policy "audit: read authenticated" เปิดให้ทุก role อ่าน
-- ประวัติการแก้ไขทั้งหมด (old_data/new_data ทุกแถวของ sales/expenses)
-- ได้ ทั้งที่ยังไม่มีหน้าจอไหนในแอปใช้งานจริง — จำกัดไว้ก่อนเผื่ออนาคต

drop policy if exists "audit: read authenticated" on public.audit_log;
drop policy if exists "audit: read admin only" on public.audit_log;
create policy "audit: read admin only"
  on public.audit_log for select
  using (public.fn_my_role() = 'admin');

-- ── FIX 4: จำกัดคนแก้ไขยอดขาย/รายจ่ายให้เฉพาะ admin/co-admin/manager ──
-- ปัญหา: policy "sales/expenses: update authenticated" เปิดให้ทุก role
-- ที่ล็อกอินแล้ว แก้ไขยอดขาย/รายจ่าย "ของวันไหนก็ได้" โดยตรงผ่าน
-- Supabase client — รวมถึง staff ที่ไม่ได้เป็นคนบันทึกรายการนั้นเอง
--
-- เปลี่ยนเป็น: เฉพาะ admin/co-admin/manager แก้ไขได้ (ไม่รวม staff)
-- staff ยัง insert รายการใหม่ได้ตามปกติ แค่แก้ไขรายการที่มีอยู่แล้วไม่ได้
-- (ถ้า staff พิมพ์ผิด ให้แจ้ง manager ขึ้นไปแก้ หรือ admin ปรับสิทธิ์ทีหลังได้)

drop policy if exists "sales: update authenticated" on public.sales_daily;
drop policy if exists "sales: update manager+" on public.sales_daily;
create policy "sales: update manager+"
  on public.sales_daily for update
  using (public.fn_my_role() in ('admin', 'co-admin', 'manager'));

drop policy if exists "expenses: update authenticated" on public.expenses;
drop policy if exists "expenses: update manager+" on public.expenses;
create policy "expenses: update manager+"
  on public.expenses for update
  using (public.fn_my_role() in ('admin', 'co-admin', 'manager'));

-- ── ตรวจผลลัพธ์ ─────────────────────────────────────────────────
select 'harden_security applied ✓ — profiles self-escalation blocked; business_config tiered by key; audit_log admin-only; sales/expenses update = manager+' as result;
