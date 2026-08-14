-- ================================================================
-- add_audit_context.sql — ขยาย audit_log ตามมาตรฐานตรวจสอบ (ISO 27001 / SOC 2)
--
-- ใคร (user/role) · ทำอะไร (action) · เมื่อไหร่ · จากไหน (IP) · เครื่องอะไร (UA/device)
-- · หน้าไหน · สำเร็จหรือไม่
--
-- อ่านได้เฉพาะ Super Admin (profiles.role = 'admin') — RLS เดิมอยู่แล้ว
--
-- รันทั้งไฟล์ใน Supabase → SQL Editor → Run (idempotent)
-- รันหลัง harden_security.sql — ถ้าไปรัน harden_security ซ้ำทีหลัง ให้รันไฟล์นี้ตามอีกครั้ง
--   (harden_security ยังมี fn_audit_log_config รุ่นเก่าที่ไม่มี IP)
-- ================================================================

-- ── คอลัมน์บริบทคำขอ ──────────────────────────────────────────
alter table public.audit_log add column if not exists ip_address text;
alter table public.audit_log add column if not exists user_agent text;
alter table public.audit_log add column if not exists device_summary text;
alter table public.audit_log add column if not exists request_path text;
alter table public.audit_log add column if not exists actor_username text;
alter table public.audit_log add column if not exists actor_role text;
alter table public.audit_log add column if not exists outcome text not null default 'success';
alter table public.audit_log add column if not exists country text;

comment on column public.audit_log.ip_address is 'IP ผู้ใช้ (จาก CF-Connecting-IP / X-Forwarded-For ที่แอปส่งมา)';
comment on column public.audit_log.device_summary is 'สรุปเครื่อง เช่น คอมพิวเตอร์ · Windows · Chrome';
comment on column public.audit_log.outcome is 'success | failure';

-- ขยายชนิด action ให้ครอบคลุมเหตุการณ์ auth/admin (ของเดิมมีแค่ INSERT/UPDATE/DELETE)
alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check check (action in (
  'INSERT', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGIN_FAIL', 'LOGOUT',
  'DENY', 'EXPORT',
  'CREATE_USER', 'UPDATE_USER', 'RESET_PASSWORD', 'TOGGLE_USER', 'DELETE_USER',
  'IMPORT'
));

create index if not exists idx_audit_performed_at on public.audit_log (performed_at desc);
create index if not exists idx_audit_ip on public.audit_log (ip_address) where ip_address is not null;
create index if not exists idx_audit_actor on public.audit_log (performed_by, performed_at desc);

-- ── ตารางบริบทต่อผู้ใช้ (แอป stamp ก่อนเขียนข้อมูล — trigger อ่านในคำขอถัดไป) ──
create table if not exists public.audit_context (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ip_address text,
  user_agent text,
  request_path text,
  device_summary text,
  country text,
  updated_at timestamptz not null default now()
);

alter table public.audit_context enable row level security;
drop policy if exists "audit_context: none" on public.audit_context;
-- ไม่เปิดให้ client อ่าน/เขียนตรง ๆ — ใช้ RPC เท่านั้น
create policy "audit_context: no direct access"
  on public.audit_context for all
  using (false) with check (false);

-- ── ช่วยดึง meta จากแถวบริบท (ถ้า stamp มาไม่เกิน 10 นาที) ────────
create or replace function public.fn_current_audit_context()
returns public.audit_context
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _row public.audit_context;
begin
  select * into _row
  from public.audit_context
  where user_id = auth.uid()
    and updated_at > now() - interval '10 minutes';
  return _row;
end;
$$;

create or replace function public.set_audit_context(
  p_ip text,
  p_ua text,
  p_path text,
  p_device text default null,
  p_country text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.audit_context (user_id, ip_address, user_agent, request_path, device_summary, country, updated_at)
  values (
    auth.uid(),
    nullif(trim(p_ip), ''),
    nullif(left(trim(p_ua), 512), ''),
    nullif(left(trim(p_path), 200), ''),
    nullif(left(trim(coalesce(p_device, '')), 120), ''),
    nullif(left(trim(coalesce(p_country, '')), 8), ''),
    now()
  )
  on conflict (user_id) do update set
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent,
    request_path = excluded.request_path,
    device_summary = excluded.device_summary,
    country = excluded.country,
    updated_at = now();
end;
$$;

revoke all on function public.set_audit_context(text, text, text, text, text) from public;
grant execute on function public.set_audit_context(text, text, text, text, text) to authenticated;

-- ── trigger ข้อมูล: เติม IP/เครื่อง/ผู้ใช้จากบริบท ───────────────
create or replace function public.fn_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _user_id uuid := auth.uid();
  _ip text; _ua text; _dev text; _path text; _cc text;
  _uname text; _urole text;
begin
  select c.ip_address, c.user_agent, c.device_summary, c.request_path, c.country
    into _ip, _ua, _dev, _path, _cc
  from public.audit_context c
  where c.user_id = _user_id and c.updated_at > now() - interval '10 minutes';

  if _user_id is not null then
    select username, role into _uname, _urole from public.profiles where id = _user_id;
  end if;

  if (tg_op = 'INSERT') then
    insert into public.audit_log(
      table_name, record_id, action, new_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, new.id, 'INSERT', to_jsonb(new), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log(
      table_name, record_id, action, old_data, new_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(
      table_name, record_id, action, old_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, old.id, 'DELETE', to_jsonb(old), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.fn_audit_log_config()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _user_id uuid := auth.uid();
  _ip text; _ua text; _dev text; _path text; _cc text;
  _uname text; _urole text;
begin
  select c.ip_address, c.user_agent, c.device_summary, c.request_path, c.country
    into _ip, _ua, _dev, _path, _cc
  from public.audit_context c
  where c.user_id = _user_id and c.updated_at > now() - interval '10 minutes';

  if _user_id is not null then
    select username, role into _uname, _urole from public.profiles where id = _user_id;
  end if;

  if (tg_op = 'INSERT') then
    insert into public.audit_log(
      table_name, record_id, action, new_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, null, 'INSERT', to_jsonb(new), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log(
      table_name, record_id, action, old_data, new_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, null, 'UPDATE', to_jsonb(old), to_jsonb(new), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(
      table_name, record_id, action, old_data, performed_by,
      ip_address, user_agent, device_summary, request_path, actor_username, actor_role, country, outcome
    ) values (
      tg_table_name, null, 'DELETE', to_jsonb(old), _user_id,
      _ip, _ua, _dev, _path, _uname, _urole, _cc, 'success'
    );
  end if;
  return coalesce(new, old);
end;
$$;

-- ประวัติการแก้บัญชีผู้ใช้ (role / เปิด-ปิด)
drop trigger if exists tr_audit_profiles on public.profiles;
create trigger tr_audit_profiles
  after update or delete on public.profiles
  for each row execute function public.fn_audit_log();

-- ── บันทึกเหตุการณ์ auth/admin จาก Server Action ────────────────
create or replace function public.write_audit_event(
  p_action text,
  p_table text default 'auth',
  p_details jsonb default '{}'::jsonb,
  p_outcome text default 'success',
  p_ip text default null,
  p_ua text default null,
  p_path text default null,
  p_device text default null,
  p_username text default null,
  p_country text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _uname text;
  _urole text;
  _action text := upper(trim(p_action));
begin
  if _action not in (
    'LOGIN', 'LOGIN_FAIL', 'LOGOUT', 'DENY', 'EXPORT', 'IMPORT',
    'CREATE_USER', 'UPDATE_USER', 'RESET_PASSWORD', 'TOGGLE_USER', 'DELETE_USER'
  ) then
    raise exception 'invalid audit action';
  end if;

  -- anon ได้แค่ LOGIN_FAIL (ยังไม่มี session)
  if _uid is null and _action <> 'LOGIN_FAIL' then
    raise exception 'not authenticated';
  end if;

  if _uid is not null then
    select username, role into _uname, _urole from public.profiles where id = _uid;
  end if;

  insert into public.audit_log (
    table_name, record_id, action, new_data, performed_by,
    ip_address, user_agent, device_summary, request_path,
    actor_username, actor_role, outcome, country
  ) values (
    coalesce(nullif(trim(p_table), ''), 'auth'),
    null,
    _action,
    coalesce(p_details, '{}'::jsonb),
    _uid,
    nullif(trim(p_ip), ''),
    nullif(left(trim(p_ua), 512), ''),
    nullif(left(trim(coalesce(p_device, '')), 120), ''),
    nullif(left(trim(p_path), 200), ''),
    coalesce(_uname, nullif(trim(p_username), '')),
    _urole,
    case when p_outcome = 'failure' then 'failure' else 'success' end,
    nullif(left(trim(coalesce(p_country, '')), 8), '')
  );
end;
$$;

revoke all on function public.write_audit_event(text, text, jsonb, text, text, text, text, text, text, text) from public;
grant execute on function public.write_audit_event(text, text, jsonb, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.write_audit_event(text, text, jsonb, text, text, text, text, text, text, text) to anon;

-- คง RLS อ่านเฉพาะ admin (super admin) — ไม่มี policy เขียน/แก้/ลบ (immutable)
drop policy if exists "audit: read admin only" on public.audit_log;
create policy "audit: read admin only"
  on public.audit_log for select
  using (public.fn_my_role() = 'admin');

revoke insert, update, delete on public.audit_log from anon, authenticated;

-- Loyalty: ลูกค้า (ไม่บันทึกทุกครั้งที่แต้มเปลี่ยน) + ธุรกรรมแต้ม/แลกรางวัล
do $$
begin
  if to_regclass('public.customers') is not null then
    drop trigger if exists tr_audit_customers on public.customers;
    drop trigger if exists tr_audit_customers_ins on public.customers;
    drop trigger if exists tr_audit_customers_upd on public.customers;
    create trigger tr_audit_customers_ins
      after insert or delete on public.customers
      for each row execute function public.fn_audit_log();
    create trigger tr_audit_customers_upd
      after update on public.customers
      for each row
      when (
        old.phone is distinct from new.phone
        or old.name is distinct from new.name
        or old.line_user_id is distinct from new.line_user_id
      )
      execute function public.fn_audit_log();
  end if;
  if to_regclass('public.point_transactions') is not null then
    drop trigger if exists tr_audit_point_tx on public.point_transactions;
    create trigger tr_audit_point_tx
      after insert or update or delete on public.point_transactions
      for each row execute function public.fn_audit_log();
  end if;
  if to_regclass('public.redemption_history') is not null then
    drop trigger if exists tr_audit_redemptions on public.redemption_history;
    create trigger tr_audit_redemptions
      after insert or update or delete on public.redemption_history
      for each row execute function public.fn_audit_log();
  end if;
end $$;

select 'add_audit_context applied ✓ — audit_log now stores IP/UA/device/path; set_audit_context + write_audit_event RPCs ready' as result;
