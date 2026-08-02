-- ================================================================
-- add_loyalty_system.sql — Smart Loyalty & CDP System Migration
-- Minimal Maerim (minimalcnx)
-- ================================================================

-- 1. BRANCHES (สาขา)
create table if not exists public.branches (
  id          uuid        primary key default gen_random_uuid(),
  code        text        unique not null,
  name        text        not null,
  location    text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- 2. STAFF_PROFILES (ผูกผู้ใช้เข้ากับสาขาและรหัสพนักงาน)
create table if not exists public.staff_profiles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  branch_id   uuid        not null references public.branches(id) on delete restrict,
  staff_code  text        unique not null,
  role        text        not null default 'staff', -- staff, manager, admin
  created_at  timestamptz not null default now(),
  unique (user_id, branch_id)
);

-- 3. CUSTOMERS (ข้อมูลลูกค้า & CDP / RFM Segment)
create table if not exists public.customers (
  id                  uuid        primary key default gen_random_uuid(),
  line_user_id        text        unique,
  phone               text        unique not null,
  name                text        not null default 'ลูกค้าทั่วไป',
  points_balance      int         not null default 0 check (points_balance >= 0),
  total_spent         numeric(12,2) not null default 0,
  visit_count         int         not null default 0,
  rfm_segment         text        not null default 'New', -- Champions, Loyal, Potential, At-Risk, Lost, New
  favorite_branch_id  uuid        references public.branches(id) on delete set null,
  favorite_item       text,
  last_visited_at     timestamptz,
  created_at          timestamptz not null default now()
);

-- 4. POINT_TRANSACTIONS (ประวัติการแจก/หักแต้ม + Anti-Fraud)
create table if not exists public.point_transactions (
  id              uuid        primary key default gen_random_uuid(),
  customer_id     uuid        not null references public.customers(id) on delete cascade,
  staff_id        uuid        references public.profiles(id) on delete set null,
  branch_id       uuid        references public.branches(id) on delete set null,
  points          int         not null, -- ค่าบวก = แจกแต้ม, ค่าลบ = หักแต้ม
  transaction_type text       not null check (transaction_type in ('earn', 'redeem', 'adjust')),
  receipt_number  text,
  note            text,
  ip_address      text,
  device_info     text,
  created_at      timestamptz not null default now()
);

-- 5. REDEMPTION_HISTORY (ประวัติการแลกของรางวัล)
create table if not exists public.redemption_history (
  id              uuid        primary key default gen_random_uuid(),
  customer_id     uuid        not null references public.customers(id) on delete cascade,
  reward_id       text        not null, -- e.g. 'free_coffee', 'discount_50'
  reward_name     text        not null,
  points_used     int         not null check (points_used > 0),
  branch_id       uuid        references public.branches(id) on delete set null,
  staff_id        uuid        references public.profiles(id) on delete set null,
  redeemed_at     timestamptz not null default now()
);

-- 6. AUDIT_LOGS (บันทึก Audit ป้องกันทุจริตแบบละเอียด)
create table if not exists public.loyalty_audit_logs (
  id                  uuid        primary key default gen_random_uuid(),
  action_type         text        not null, -- e.g. 'ISSUE_POINTS', 'REDEEM_REWARD', 'FRAUD_ALERT'
  performed_by_staff_id uuid      references public.profiles(id) on delete set null,
  customer_id         uuid        references public.customers(id) on delete set null,
  branch_id           uuid        references public.branches(id) on delete set null,
  details             jsonb       not null default '{}'::jsonb,
  ip_address          text,
  created_at          timestamptz not null default now()
);

-- ── Trigger Function: Atomic Points Balance & RFM Calculation ──
create or replace function public.fn_on_point_transaction()
returns trigger language plpgsql security definer as $$
declare
  _total_points int;
  _visit_cnt    int;
  _last_visit   timestamptz;
  _days_since   int;
  _new_rfm      text;
begin
  -- คำนวณยอดแต้มรวมใหม่
  select coalesce(sum(points), 0), count(*), max(created_at)
  into _total_points, _visit_cnt, _last_visit
  from public.point_transactions
  where customer_id = NEW.customer_id;

  if _total_points < 0 then
    raise exception 'แต้มคงเหลือไม่เพียงพอ (Points balance cannot be negative)';
  end if;

  _days_since := extract(day from (now() - coalesce(_last_visit, now())));

  -- คำนวณกลุ่มลูกค้า RFM อัตโนมัติ
  if _visit_cnt >= 10 and _days_since <= 14 then
    _new_rfm := 'Champions';
  elsif _visit_cnt >= 5 and _days_since <= 30 then
    _new_rfm := 'Loyal';
  elsif _days_since > 60 then
    _new_rfm := 'Lost';
  elsif _days_since > 30 then
    _new_rfm := 'At-Risk';
  else
    _new_rfm := 'Potential';
  end if;

  -- อัปเดตตารางลูกค้า
  update public.customers
  set points_balance     = _total_points,
      visit_count        = _visit_cnt,
      last_visited_at    = coalesce(_last_visit, now()),
      rfm_segment        = _new_rfm,
      favorite_branch_id = coalesce(favorite_branch_id, NEW.branch_id)
  where id = NEW.customer_id;

  return NEW;
end; $$;

drop trigger if exists tr_point_transaction_update on public.point_transactions;
create trigger tr_point_transaction_update
  after insert on public.point_transactions
  for each row execute function public.fn_on_point_transaction();

-- ── RLS Policies ──
alter table public.branches enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.point_transactions enable row level security;
alter table public.redemption_history enable row level security;
alter table public.loyalty_audit_logs enable row level security;

-- Branches Policies
create policy "branches: read authenticated" on public.branches
  for select using (auth.role() = 'authenticated');

create policy "branches: admin write" on public.branches
  for all using (public.fn_my_role() in ('admin', 'co-admin'));

-- Customers Policies
create policy "customers: read authenticated" on public.customers
  for select using (auth.role() = 'authenticated');

create policy "customers: write authenticated" on public.customers
  for all using (auth.role() = 'authenticated');

-- Point Transactions Policies
create policy "point_transactions: read authenticated" on public.point_transactions
  for select using (auth.role() = 'authenticated');

create policy "point_transactions: insert authenticated" on public.point_transactions
  for insert with check (auth.role() = 'authenticated');

-- Redemption History Policies
create policy "redemption_history: read authenticated" on public.redemption_history
  for select using (auth.role() = 'authenticated');

create policy "redemption_history: insert authenticated" on public.redemption_history
  for insert with check (auth.role() = 'authenticated');

-- Loyalty Audit Logs Policies
create policy "loyalty_audit_logs: read manager+" on public.loyalty_audit_logs
  for select using (public.fn_my_role() in ('admin', 'co-admin', 'manager'));

create policy "loyalty_audit_logs: insert authenticated" on public.loyalty_audit_logs
  for insert with check (auth.role() = 'authenticated');

-- ── Initial Seed Data (สาขาหลัก) ──
insert into public.branches (code, name, location)
values 
  ('MAIN', 'สาขาแม่ริม (สำนักงานใหญ่)', 'อ.แม่ริม จ.เชียงใหม่'),
  ('CNX01', 'สาขาตัวเมืองเชียงใหม่', 'อ.เมือง จ.เชียงใหม่')
on conflict (code) do nothing;
