-- ================================================================
-- harden_loyalty_reads.sql
-- จำกัดการอ่าน loyalty: เฉพาะผู้ที่ผูก staff_profiles หรือ manager+
-- (เดิม authenticated อ่าน customers/txs ได้ทุกคน)
-- Idempotent — ต้องรันหลัง add_loyalty_system.sql
-- ================================================================

-- helper: ใช้ในหลาย policy (SECURITY DEFINER ข้าม RLS ตอนเช็ค staff_profiles)
create or replace function public.fn_can_loyalty_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.fn_my_role() in ('admin', 'co-admin', 'manager')
    or exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid()
    );
$$;

revoke all on function public.fn_can_loyalty_staff() from public;
grant execute on function public.fn_can_loyalty_staff() to authenticated;

-- ── customers ──
drop policy if exists "customers: read authenticated" on public.customers;
drop policy if exists "customers: read loyalty staff" on public.customers;
create policy "customers: read loyalty staff" on public.customers
  for select using (public.fn_can_loyalty_staff());

drop policy if exists "customers: insert authenticated" on public.customers;
drop policy if exists "customers: insert loyalty staff" on public.customers;
create policy "customers: insert loyalty staff" on public.customers
  for insert with check (public.fn_can_loyalty_staff());

drop policy if exists "customers: update authenticated" on public.customers;
drop policy if exists "customers: update loyalty staff" on public.customers;
create policy "customers: update loyalty staff" on public.customers
  for update using (public.fn_can_loyalty_staff())
  with check (public.fn_can_loyalty_staff());

-- ── point_transactions ──
drop policy if exists "point_transactions: read authenticated" on public.point_transactions;
drop policy if exists "point_transactions: read loyalty staff" on public.point_transactions;
create policy "point_transactions: read loyalty staff" on public.point_transactions
  for select using (public.fn_can_loyalty_staff());

-- ── redemption_history ──
drop policy if exists "redemption_history: read authenticated" on public.redemption_history;
drop policy if exists "redemption_history: read loyalty staff" on public.redemption_history;
create policy "redemption_history: read loyalty staff" on public.redemption_history
  for select using (public.fn_can_loyalty_staff());

-- ── branches: ใช้ตอนเลือกสาขา / admin ──
drop policy if exists "branches: read authenticated" on public.branches;
drop policy if exists "branches: read loyalty staff" on public.branches;
create policy "branches: read loyalty staff" on public.branches
  for select using (public.fn_can_loyalty_staff());

-- ── staff_profiles: อ่านของตัวเอง หรือ manager+ (admin ผูกพนักงาน) ──
drop policy if exists "staff_profiles: read authenticated" on public.staff_profiles;
drop policy if exists "staff_profiles: read own or manager+" on public.staff_profiles;
create policy "staff_profiles: read own or manager+" on public.staff_profiles
  for select using (
    user_id = auth.uid()
    or public.fn_my_role() in ('admin', 'co-admin', 'manager')
  );

-- ── loyalty_rewards (ถ้ามีตารางแล้ว — ข้ามถ้ายังไม่รัน add_loyalty_rewards.sql) ──
do $$
begin
  if to_regclass('public.loyalty_rewards') is not null then
    execute 'drop policy if exists "loyalty_rewards: read loyalty staff" on public.loyalty_rewards';
    execute $p$
      create policy "loyalty_rewards: read loyalty staff" on public.loyalty_rewards
        for select using (public.fn_can_loyalty_staff())
    $p$;
  end if;
end $$;
