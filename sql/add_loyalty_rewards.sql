-- ================================================================
-- add_loyalty_rewards.sql
-- แคตตาล็อกรางวัลสะสมแต้มใน DB — แก้ได้จาก /admin/loyalty
-- Idempotent
-- ================================================================

create table if not exists public.loyalty_rewards (
  id          text        primary key, -- slug เช่น free_coffee
  name        text        not null,
  points      int         not null check (points > 0 and points <= 10000),
  icon        text        not null default 'ti-gift',
  is_active   boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- seed ค่าเดิมจาก lib/loyalty-rewards.js (ไม่ทับถ้ามีอยู่แล้ว)
insert into public.loyalty_rewards (id, name, points, icon, is_active, sort_order)
values
  ('free_coffee',  'กาแฟฟรี 1 แก้ว (เมนูร้อน/เย็น)', 10, 'ti-coffee', true, 10),
  ('free_pastry',  'ขนมหน้าร้านฟรี 1 ชิ้น',           15, 'ti-cookie', true, 20),
  ('discount_50',  'ส่วนลด 50 บาท',                   20, 'ti-ticket', true, 30)
on conflict (id) do nothing;

alter table public.loyalty_rewards enable row level security;

-- helper (ซ้ำกับ harden_loyalty_reads.sql ได้ — idempotent)
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

-- อ่าน: พนักงานที่ผูกสาขา หรือ manager+
drop policy if exists "loyalty_rewards: read loyalty staff" on public.loyalty_rewards;
create policy "loyalty_rewards: read loyalty staff" on public.loyalty_rewards
  for select using (public.fn_can_loyalty_staff());

-- เขียน: admin / co-admin
drop policy if exists "loyalty_rewards: admin write" on public.loyalty_rewards;
create policy "loyalty_rewards: admin write" on public.loyalty_rewards
  for all using (public.fn_my_role() in ('admin', 'co-admin'))
  with check (public.fn_my_role() in ('admin', 'co-admin'));

create index if not exists idx_loyalty_rewards_active_sort
  on public.loyalty_rewards (is_active, sort_order, id);
