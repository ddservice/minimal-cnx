-- ================================================================
-- add_free_cup_actual_cost.sql — ระบบต้นทุนจริงแก้วฟรี + หลักฐานแนบ
--
-- 1. เพิ่มคอลัมน์ free_cup_evidence_url ใน sales_daily (ลิงก์หลักฐาน LINE OA/POS)
-- 2. อัปเดต upsert_sales_daily ให้รับ/เก็บลิงก์หลักฐาน
-- 3. สร้าง Storage bucket "evidence" สำหรับอัปโหลดรูปหลักฐาน
-- 4. ตั้งค่า default ต้นทุนวัตถุดิบต่อแก้ว (Actual Unit Cost) = 55 บาท
--    (Admin แก้ได้ภายหลังจากหน้าตั้งค่า)
-- 5. ปรับ free_cup_cost ของข้อมูลเก่าทุกเดือน = จำนวนแก้ว × 55
--
-- รันทั้งไฟล์ใน Supabase → SQL Editor → Run
-- ================================================================

-- ── 1. คอลัมน์ลิงก์หลักฐาน ──────────────────────────────────────
alter table public.sales_daily
  add column if not exists free_cup_evidence_url text;

comment on column public.sales_daily.free_cup_evidence_url is
  'ลิงก์รูปหลักฐานแก้วฟรี (แคปจาก LINE OA Used Coupon / POS) สำหรับสำนักงานบัญชี';

-- ── 2. upsert_sales_daily รับลิงก์หลักฐาน ───────────────────────
-- ใช้ coalesce ตอน update เพื่อไม่ลบหลักฐานเดิมถ้าบันทึกซ้ำโดยไม่แนบไฟล์ใหม่
create or replace function public.upsert_sales_daily(p_data jsonb)
returns public.sales_daily language plpgsql security definer as $$
declare
  _result public.sales_daily;
begin
  insert into public.sales_daily (
    date, total_cups, kshop_amount, cash_amount,
    shopee_before_gp, grab_before_gp, lineman_before_gp,
    free_cups, free_cup_cost, pastry_pieces, pastry_revenue,
    net_revenue, free_cup_evidence_url, recorded_by
  ) values (
    (p_data->>'date')::date,
    (p_data->>'total_cups')::int,
    (p_data->>'kshop_amount')::numeric,
    (p_data->>'cash_amount')::numeric,
    (p_data->>'shopee_before_gp')::numeric,
    (p_data->>'grab_before_gp')::numeric,
    (p_data->>'lineman_before_gp')::numeric,
    (p_data->>'free_cups')::int,
    (p_data->>'free_cup_cost')::numeric,
    (p_data->>'pastry_pieces')::int,
    (p_data->>'pastry_revenue')::numeric,
    (p_data->>'net_revenue')::numeric,
    nullif(p_data->>'free_cup_evidence_url',''),
    auth.uid()
  )
  on conflict (date) do update set
    total_cups            = excluded.total_cups,
    kshop_amount          = excluded.kshop_amount,
    cash_amount           = excluded.cash_amount,
    shopee_before_gp      = excluded.shopee_before_gp,
    grab_before_gp        = excluded.grab_before_gp,
    lineman_before_gp     = excluded.lineman_before_gp,
    free_cups             = excluded.free_cups,
    free_cup_cost         = excluded.free_cup_cost,
    pastry_pieces         = excluded.pastry_pieces,
    pastry_revenue        = excluded.pastry_revenue,
    net_revenue           = excluded.net_revenue,
    free_cup_evidence_url = coalesce(excluded.free_cup_evidence_url, sales_daily.free_cup_evidence_url),
    updated_at            = now()
  returning * into _result;
  return _result;
end; $$;

-- ── 3. Storage bucket สำหรับหลักฐาน ─────────────────────────────
-- public = true เพื่อให้ลิงก์ในไฟล์ Excel เปิดได้โดยไม่ต้อง login
-- (ชื่อไฟล์สุ่มด้วย timestamp เดาได้ยาก)
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

drop policy if exists "evidence: upload authenticated" on storage.objects;
create policy "evidence: upload authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence');

drop policy if exists "evidence: read all" on storage.objects;
create policy "evidence: read all"
  on storage.objects for select
  using (bucket_id = 'evidence');

-- ── 4. ค่า default ต้นทุนวัตถุดิบต่อแก้วฟรี (Actual Unit Cost) ──
insert into public.business_config (key, value)
values ('free_cup_unit_cost', '{"cost": 55}')
on conflict (key) do nothing;

-- ── 5. ปรับข้อมูลเก่าทุกเดือน: ต้นทุนแก้วฟรี = จำนวนแก้ว × 55 ────
update public.sales_daily
set free_cup_cost = free_cups * 55
where free_cup_cost is distinct from free_cups * 55;

-- ── ตรวจผลลัพธ์ ─────────────────────────────────────────────────
select to_char(date,'MM/YYYY') as month,
       sum(free_cups) as cups,
       sum(free_cup_cost) as cost,
       sum(free_cups)*55 = sum(free_cup_cost) as ok
from public.sales_daily
group by 1 order by 1;

select 'add_free_cup_actual_cost applied ✓' as result;
