-- ================================================================
-- harden_loyalty_rls.sql — ปิดช่องโหว่ RLS ของระบบสะสมแต้ม
-- Idempotent — รันซ้ำใน Supabase SQL Editor ได้ปลอดภัย
--
-- ปัญหา: customers มี policy "write authenticated" แบบ for all
-- ทำให้ user ที่ล็อกอินแก้ points_balance ตรงๆ จาก browser ได้
-- โดยไม่ผ่าน point_transactions / anti-fraud
-- ================================================================

-- ── 1) กันแก้แต้ม/RFM ตรงๆ บน customers (อนุญาตเฉพาะ trigger ซ้อน) ──
create or replace function public.fn_guard_customer_points()
returns trigger language plpgsql as $$
begin
  -- UPDATE จาก fn_on_point_transaction (trigger ซ้อน) → depth > 1 อนุญาต
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.points_balance is distinct from old.points_balance
     or new.visit_count is distinct from old.visit_count
     or new.rfm_segment is distinct from old.rfm_segment
     or new.total_spent is distinct from old.total_spent then
    raise exception 'แต้ม/RFM แก้ได้เฉพาะผ่านระบบธุรกรรมสะสมแต้มเท่านั้น';
  end if;

  return new;
end; $$;

drop trigger if exists tr_customers_guard_points on public.customers;
create trigger tr_customers_guard_points
  before update on public.customers
  for each row execute function public.fn_guard_customer_points();

-- ── 2) แยก policy เขียน customers: insert + update ชื่อ/เบอร์ (ไม่ใช่ for all) ──
drop policy if exists "customers: write authenticated" on public.customers;

drop policy if exists "customers: insert authenticated" on public.customers;
create policy "customers: insert authenticated" on public.customers
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "customers: update authenticated" on public.customers;
create policy "customers: update authenticated" on public.customers
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ลบลูกค้าได้เฉพาะ admin / co-admin
drop policy if exists "customers: delete admin+" on public.customers;
create policy "customers: delete admin+" on public.customers
  for delete using (public.fn_my_role() in ('admin', 'co-admin'));

-- ── 3) point_transactions / redemption — ห้าม UPDATE/DELETE จาก client ──
-- (ไม่มี policy = ปฏิเสธ; ลบของเก่าถ้าเคยมี)
drop policy if exists "point_transactions: update authenticated" on public.point_transactions;
drop policy if exists "point_transactions: delete authenticated" on public.point_transactions;
drop policy if exists "redemption_history: update authenticated" on public.redemption_history;
drop policy if exists "redemption_history: delete authenticated" on public.redemption_history;
